import fs from 'fs';

const g = JSON.parse(fs.readFileSync('tmp-states-tiny.geojson', 'utf8'));

const NAME_MAP: Record<string, string> = {
  Orissa: 'Odisha',
  Uttaranchal: 'Uttarakhand',
  'Andaman and Nicobar': 'Andaman and Nicobar Islands',
};

const LON_MIN = 68;
const LON_MAX = 98;
const LAT_MIN = 6.5;
const LAT_MAX = 37.5;
const W = 680;
const H = 780;
const PAD = 12;

const project = (lon: number, lat: number): [number, number] => [
  PAD + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (W - PAD * 2),
  PAD + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (H - PAD * 2),
];

const ringToPath = (ring: number[][]) =>
  `${ring
    .map((c, i) => {
      const [x, y] = project(c[0], c[1]);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ')} Z`;

const geomToPath = (geom: { type: string; coordinates: number[][][] | number[][][][] }) => {
  const polys = geom.type === 'Polygon' ? [geom.coordinates as number[][][]] : (geom.coordinates as number[][][][]);
  return polys.map((poly) => poly.map(ringToPath).join(' ')).join(' ');
};

const states = [];

for (const f of g.features) {
  let name = f.properties.NAME_1 || f.properties.name;
  name = NAME_MAP[name] || name;
  if (name === 'Lakshadweep') continue;

  const path = geomToPath(f.geometry);
  const coords =
    f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
  let sx = 0;
  let sy = 0;
  coords.forEach((c: number[]) => {
    sx += c[0];
    sy += c[1];
  });
  const [cx, cy] = project(sx / coords.length, sy / coords.length);
  states.push({
    name,
    id: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    path,
    labelX: Number(cx.toFixed(1)),
    labelY: Number(cy.toFixed(1)),
  });
}

const body = `export type IndiaMapStatePath = {
  id: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
};

export const INDIA_MAP_VIEWBOX = "0 0 ${W} ${H}";

export const INDIA_MAP_STATES: IndiaMapStatePath[] = ${JSON.stringify(states, null, 2)};
`;

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/indiaMapPaths.ts', body);
console.log('wrote', states.length, 'states', fs.statSync('src/data/indiaMapPaths.ts').size, 'bytes');

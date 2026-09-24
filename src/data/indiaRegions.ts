export type IndiaRegion = {
  id: string;
  name: string;
  slug: string;
  crafts: string;
  blurb: string;
};

/** Editorial craft notes for Shop by Region — keyed by canonical state name. */
export const REGION_CRAFT_BLURBS: Record<string, { crafts: string; blurb: string }> = {
  Assam: {
    crafts: 'Bamboo crafts, Muga silk, and cane work',
    blurb: 'Assam’s makers work bamboo, cane, and golden Muga silk into pieces that carry the texture of the Brahmaputra valley.',
  },
  'Tamil Nadu': {
    crafts: 'Handloom, bronze casting, and temple crafts',
    blurb: 'From Kanchipuram weaves to bronze idols and terracotta, Tamil Nadu’s craft traditions are shaped by temple towns and coastal trade.',
  },
  Rajasthan: {
    crafts: 'Woodcraft, block printing, and metalwork',
    blurb: 'Desert workshops carve wood, stamp cloth, and forge metal — work that still colours the markets of Jaipur and beyond.',
  },
  Kerala: {
    crafts: 'Handloom, coir, and woodcraft',
    blurb: 'Kerala’s artisans weave cotton, shape coir, and carve wood along a coastline of long-standing craft guilds.',
  },
  Karnataka: {
    crafts: 'Woodcraft, silk, and bronze',
    blurb: 'From sandalwood carving to silk and bronze, Karnataka’s makers carry Deccan craft into everyday objects.',
  },
  Gujarat: {
    crafts: 'Embroidery, block print, and bandhani',
    blurb: 'Gujarat is known for dense embroidery, resist dyeing, and printed textiles from Kutch to Surat.',
  },
  'West Bengal': {
    crafts: 'Terracotta, Dokra, and handloom',
    blurb: 'Bengal’s clay temples, lost-wax brass, and handloom cloth remain living practices across villages and towns.',
  },
  Odisha: {
    crafts: 'Metal craft, Pattachitra, and handloom',
    blurb: 'Odisha is home to temple bronze, scroll painting, and woven textiles tied to coastal and inland traditions.',
  },
  Maharashtra: {
    crafts: 'Bamboo, Warli, and metalwork',
    blurb: 'Maharashtra’s craft spans bamboo work, Warli painting traditions, and metal objects from regional workshops.',
  },
  'Andhra Pradesh': {
    crafts: 'Kalamkari, handloom, and lacquer',
    blurb: 'Andhra Pradesh is renowned for narrative Kalamkari cloth and enduring handloom centres.',
  },
  Telangana: {
    crafts: 'Handloom and Bidri metalwork',
    blurb: 'Telangana’s weavers and Bidri artisans keep Deccan textile and metal traditions alive.',
  },
  Bihar: {
    crafts: 'Madhubani, Sikki, and handloom',
    blurb: 'Bihar is known for Madhubani painting, Sikki grass craft, and regional weaving.',
  },
  Jharkhand: {
    crafts: 'Dokra, bamboo, and tribal textiles',
    blurb: 'Jharkhand’s tribal metal casting, bamboo, and woven cloth reflect forest and highland craft.',
  },
  'Madhya Pradesh': {
    crafts: 'Chanderi, Maheshwari, and terracotta',
    blurb: 'Central India’s weaving towns and clay workshops produce distinctive textiles and terracotta.',
  },
  'Uttar Pradesh': {
    crafts: 'Chikankari, brass, and woodcraft',
    blurb: 'From Lucknow embroidery to Moradabad brass, Uttar Pradesh holds dense craft clusters.',
  },
  Punjab: {
    crafts: 'Phulkari and woodcraft',
    blurb: 'Punjab’s Phulkari embroidery and carved wood remain markers of regional making.',
  },
  'Himachal Pradesh': {
    crafts: 'Wool, wood, and metal craft',
    blurb: 'Hill workshops weave wool, carve wood, and cast metal for everyday and ritual use.',
  },
  Uttarakhand: {
    crafts: 'Wool, copper, and woodcraft',
    blurb: 'Uttarakhand’s mountain crafts include wool textiles, copperware, and carved wood.',
  },
  Delhi: {
    crafts: 'Jewellery, textiles, and metalwork',
    blurb: 'Delhi gathers makers across jewellery, textiles, and metal — a crossroads of North Indian craft.',
  },
  Goa: {
    crafts: 'Azulejos, wood, and coconut craft',
    blurb: 'Goa’s coastal craft mixes woodwork, shell and coconut objects, and painted tile traditions.',
  },
  Meghalaya: {
    crafts: 'Bamboo, cane, and weaving',
    blurb: 'Meghalaya’s bamboo and cane baskets and woven cloth reflect highland tribal skill.',
  },
  Manipur: {
    crafts: 'Handloom and bamboo',
    blurb: 'Manipur is known for fine handloom and bamboo craft rooted in valley and hill communities.',
  },
  Nagaland: {
    crafts: 'Weaving and woodcraft',
    blurb: 'Naga weaving and carved wood carry distinctive motifs from the hills of the Northeast.',
  },
  Mizoram: {
    crafts: 'Bamboo and handloom',
    blurb: 'Mizoram’s bamboo work and woven textiles are central to everyday craft practice.',
  },
  Tripura: {
    crafts: 'Bamboo and cane',
    blurb: 'Tripura is known for refined bamboo and cane furniture and household objects.',
  },
  Sikkim: {
    crafts: 'Thangka, wool, and wood',
    blurb: 'Sikkim’s highland crafts include painted scrolls, wool textiles, and carved wood.',
  },
  'Arunachal Pradesh': {
    crafts: 'Weaving and bamboo',
    blurb: 'Arunachal Pradesh holds diverse tribal weaving and bamboo traditions across its hills.',
  },
  Chhattisgarh: {
    crafts: 'Bell metal and terracotta',
    blurb: 'Chhattisgarh is known for bell-metal casting and clay craft from forest communities.',
  },
  Haryana: {
    crafts: 'Pottery and handloom',
    blurb: 'Haryana’s pottery and woven cloth remain part of village and market craft.',
  },
  'Jammu and Kashmir': {
    crafts: 'Pashmina, papier-mâché, and walnut wood',
    blurb: 'Kashmir’s pashmina, papier-mâché, and carved walnut wood are among India’s most recognised crafts.',
  },
  Ladakh: {
    crafts: 'Wool and metal craft',
    blurb: 'Ladakh’s high-altitude crafts include wool textiles and ritual metalwork.',
  },
  Puducherry: {
    crafts: 'Handloom and pottery',
    blurb: 'Puducherry’s coastal makers continue handloom and pottery practices with a local character.',
  },
  Chandigarh: {
    crafts: 'Contemporary craft studios',
    blurb: 'Chandigarh hosts studios where North Indian craft meets contemporary making.',
  },
  'Dadra and Nagar Haveli': {
    crafts: 'Warli and bamboo',
    blurb: 'Tribal painting and bamboo craft shape the material culture of this territory.',
  },
  'Daman and Diu': {
    crafts: 'Coastal craft and textiles',
    blurb: 'Coastal workshops here continue small-scale textile and household craft.',
  },
  'Andaman and Nicobar Islands': {
    crafts: 'Shell, wood, and cane',
    blurb: 'Island makers work shell, wood, and cane into objects shaped by the archipelago.',
  },
};

export const regionSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const getRegionMeta = (name: string) => {
  const meta = REGION_CRAFT_BLURBS[name];
  return {
    id: regionSlug(name),
    name,
    slug: regionSlug(name),
    crafts: meta?.crafts || 'Regional craft traditions',
    blurb:
      meta?.blurb ||
      `Discover handcrafted products made by artisans from ${name}, each piece tied to place and practice.`,
  } satisfies IndiaRegion;
};

export const marketplaceRegionHref = (name: string) =>
  `/marketplace?region=${encodeURIComponent(name)}`;

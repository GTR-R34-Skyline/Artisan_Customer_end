import {
  getArtisanLocation,
  getArtisanName,
  getProductCraft,
  getProductPrice,
  getProductStory,
  getProductTitle,
  MarketplaceListing,
} from '../types/marketplace';

export const PRICE_RANGES = [
  { id: '0-500', label: '₹0–500', min: 0, max: 500 },
  { id: '500-1000', label: '₹500–1,000', min: 500, max: 1000 },
  { id: '1000-2500', label: '₹1,000–2,500', min: 1000, max: 2500 },
  { id: '2500+', label: '₹2,500+', min: 2500, max: Number.POSITIVE_INFINITY },
] as const;

export type PriceRangeId = (typeof PRICE_RANGES)[number]['id'];

export const SEARCH_PLACEHOLDER = 'Search handcrafted products, artisans, or regions…';

export const CRAFT_NOTES: Record<string, string> = {
  Handloom: 'Handloom textiles are woven on traditional looms, with pattern and texture decided by the weaver’s hand rather than a machine.',
  Kalamkari: 'Kalamkari is a hand-painted or block-printed cotton tradition from Andhra Pradesh, known for natural dyes and narrative motifs.',
  Dokra: 'Dokra is a lost-wax metal casting tradition practised across eastern and central India, producing distinctive brass forms.',
  Terracotta: 'Terracotta work shapes river clay into vessels, figures, and architectural pieces, then fired to a warm, earthen finish.',
  Woodcraft: 'Indian woodcraft ranges from carved sculpture to everyday objects in teak, rosewood, sheesham, and mango wood.',
  'Metal Craft': 'Brass and bell-metal workshops across India make lamps, utensils, and ritual objects by casting, beating, and chasing.',
  Bamboo: 'Bamboo and cane crafts turn a fast-growing grass into baskets, lamps, trays, and furniture with a light, tactile finish.',
  'Bamboo Craft': 'Bamboo and cane crafts turn a fast-growing grass into baskets, lamps, trays, and furniture with a light, tactile finish.',
};

export const formatINR = (value: number) => `₹${value.toLocaleString('en-IN')}`;

export const uniqueValues = (listings: MarketplaceListing[], pick: (listing: MarketplaceListing) => string | null | undefined) =>
  Array.from(new Set(listings.map(pick).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));

export const listingSearchBlob = (listing: MarketplaceListing) =>
  [
    getProductTitle(listing),
    listing.description_en,
    listing.raw_description,
    getArtisanName(listing),
    listing.artisan?.location_state,
    listing.category,
    listing.material,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export const matchesPriceRange = (price: number | null, rangeId: string) => {
  if (!rangeId) return true;
  const range = PRICE_RANGES.find((item) => item.id === rangeId);
  if (!range || price === null) return false;
  return price >= range.min && price < range.max;
};

export interface MarketplaceFilters {
  search?: string;
  category?: string;
  region?: string;
  craft?: string;
  material?: string;
  price?: string;
}

export const filterListings = (listings: MarketplaceListing[], filters: MarketplaceFilters) => {
  const search = filters.search?.toLowerCase().trim() || '';
  const category = filters.category || '';
  const region = filters.region || '';
  const craft = filters.craft || '';
  const material = filters.material || '';
  const price = filters.price || '';

  return listings.filter((listing) => {
    if (search && !listingSearchBlob(listing).includes(search)) return false;
    if (category && listing.category !== category) return false;
    if (region && listing.artisan?.location_state !== region) return false;
    if (craft && listing.artisan?.craft_type !== craft && listing.category !== craft) return false;
    if (material && listing.material !== material) return false;
    if (price && !matchesPriceRange(getProductPrice(listing), price)) return false;
    return true;
  });
};

const STATE_ZONES: Record<string, string> = {
  Rajasthan: 'West',
  Gujarat: 'West',
  Maharashtra: 'West',
  Goa: 'West',
  'Dadra and Nagar Haveli': 'West',
  'Daman and Diu': 'West',
  'Tamil Nadu': 'South',
  Kerala: 'South',
  Karnataka: 'South',
  'Andhra Pradesh': 'South',
  Telangana: 'South',
  Puducherry: 'South',
  'Andaman and Nicobar Islands': 'South',
  'West Bengal': 'East',
  Odisha: 'East',
  Bihar: 'East',
  Jharkhand: 'East',
  Assam: 'East',
  Sikkim: 'East',
  Meghalaya: 'East',
  Manipur: 'East',
  Mizoram: 'East',
  Nagaland: 'East',
  Tripura: 'East',
  'Arunachal Pradesh': 'East',
  Punjab: 'North',
  Haryana: 'North',
  Delhi: 'North',
  'Uttar Pradesh': 'North',
  Uttarakhand: 'North',
  'Himachal Pradesh': 'North',
  'Jammu and Kashmir': 'North',
  Ladakh: 'North',
  Chandigarh: 'North',
  'Madhya Pradesh': 'Central',
  Chhattisgarh: 'Central',
};

export const zoneForState = (state: string) => STATE_ZONES[state] || 'India';

export const groupedStates = (states: string[]) => {
  const groups = new Map<string, string[]>();
  states.forEach((state) => {
    const zone = zoneForState(state);
    const list = groups.get(zone) || [];
    list.push(state);
    groups.set(zone, list);
  });
  return Array.from(groups.entries()).map(([zone, items]) => ({ zone, items }));
};

export const pickFeaturedListings = (listings: MarketplaceListing[], count = 8) => {
  const buckets = new Map<string, MarketplaceListing[]>();
  listings.forEach((listing) => {
    const key = listing.category || listing.artisan?.id || 'work';
    const group = buckets.get(key) || [];
    group.push(listing);
    buckets.set(key, group);
  });

  const picked: MarketplaceListing[] = [];
  const seen = new Set<string>();
  let index = 0;
  const groups = Array.from(buckets.values());
  while (picked.length < count && groups.some((group) => group.length > index)) {
    groups.forEach((group) => {
      const listing = group[index];
      if (listing && !seen.has(listing.id) && picked.length < count) {
        seen.add(listing.id);
        picked.push(listing);
      }
    });
    index += 1;
  }
  return picked;
};

export const listingsByCategory = (listings: MarketplaceListing[]) => {
  const map = new Map<string, MarketplaceListing[]>();
  listings.forEach((listing) => {
    if (!listing.category) return;
    const group = map.get(listing.category) || [];
    group.push(listing);
    map.set(listing.category, group);
  });
  return Array.from(map.entries())
    .map(([name, items]) => ({ name, items, count: items.length }))
    .sort((a, b) => b.count - a.count);
};

export const listingsByRegion = (listings: MarketplaceListing[]) => {
  const map = new Map<string, MarketplaceListing[]>();
  listings.forEach((listing) => {
    const region = listing.artisan?.location_state;
    if (!region) return;
    const group = map.get(region) || [];
    group.push(listing);
    map.set(region, group);
  });
  return Array.from(map.entries())
    .map(([name, items]) => ({ name, items, count: items.length }))
    .sort((a, b) => b.count - a.count);
};

export const uniqueArtisans = (listings: MarketplaceListing[]) => {
  const seen = new Map<string, MarketplaceListing>();
  listings.forEach((listing) => {
    if (listing.artisan?.id && !seen.has(listing.artisan.id)) {
      seen.set(listing.artisan.id, listing);
    }
  });
  return Array.from(seen.values());
};

export const craftNotesForCatalog = (listings: MarketplaceListing[]) =>
  listingsByCategory(listings)
    .map((group) => ({
      name: group.name,
      count: group.count,
      image: group.items.find((item) => item.studio_image_url || item.enhanced_image_url || item.original_image_url),
      note: CRAFT_NOTES[group.name] || `${group.name} from independent makers across India, listed with the material and place behind each piece.`,
    }))
    .slice(0, 6);

export const relatedListings = (current: MarketplaceListing, all: MarketplaceListing[]) => {
  const others = all.filter((listing) => listing.id !== current.id);
  const fromArtisan = others.filter((listing) => listing.vendor_id && listing.vendor_id === current.vendor_id);
  const fromCraft = others.filter((listing) => current.category && listing.category === current.category && listing.vendor_id !== current.vendor_id);
  const fromRegion = others.filter((listing) => {
    const region = current.artisan?.location_state;
    return region && listing.artisan?.location_state === region && listing.vendor_id !== current.vendor_id;
  });
  const fromMaterial = others.filter((listing) => {
    const material = current.material?.toLowerCase();
    return Boolean(material && listing.material?.toLowerCase() === material && listing.id !== current.id);
  });

  const similar = others
    .map((listing) => {
      let score = 0;
      if (current.category && listing.category === current.category) score += 3;
      if (current.material && listing.material && listing.material.toLowerCase() === current.material.toLowerCase()) score += 2;
      if (current.artisan?.location_state && listing.artisan?.location_state === current.artisan.location_state) score += 2;
      if (current.vendor_id && listing.vendor_id === current.vendor_id) score += 1;
      return { listing, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.listing);

  const take = (items: MarketplaceListing[], limit = 4) => items.slice(0, limit);

  return {
    fromArtisan: take(fromArtisan),
    fromCraft: take(fromCraft),
    fromRegion: take(fromRegion),
    fromMaterial: take(fromMaterial.filter((listing) => listing.category !== current.category)),
    similar: take(similar.filter((listing) => listing.vendor_id !== current.vendor_id), 8),
  };
};

export const metaLine = (listing: MarketplaceListing) =>
  [getProductCraft(listing), listing.material].filter(Boolean).join(' · ');

export const productAlt = (listing: MarketplaceListing) => {
  const title = getProductTitle(listing);
  const place = getArtisanLocation(listing);
  return place ? `${title} from ${place}` : title;
};

export { getArtisanLocation, getArtisanName, getProductCraft, getProductStory };

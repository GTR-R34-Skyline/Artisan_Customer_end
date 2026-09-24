import { getProductImage, MarketplaceListing } from '../types/marketplace';
import { CRAFT_NOTES, listingsByRegion, pickFeaturedListings, uniqueArtisans } from './marketplace';
import { shopCategoriesFromListings, shopCategoryHref, ShopCategoryGroup } from './shopCategories';

export interface HeroSlide {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  to: string;
}

export interface CollectionTile {
  id: string;
  name: string;
  blurb: string;
  image: string | null;
  to: string;
}

/** Curated hero/collection imagery provided for key campaigns. */
export const HERO_FEATURE_IMAGES = {
  textiles: '/hero/india-woven-anew.jpg',
  bamboo: '/hero/bamboo-cane.jpg',
} as const;

const isTextileGroup = (label: string) =>
  /saree|textile|handloom|fabric/i.test(label);

const isBambooGroup = (label: string) =>
  /bamboo|cane/i.test(label);

const isWoodGroup = (label: string) =>
  /wood/i.test(label) && !isBambooGroup(label);

/** Prefer unique product images across homepage sections. */
export const pickDistinctImage = (
  listings: MarketplaceListing[],
  used: Set<string>,
): string | null => {
  for (const listing of listings) {
    const image = getProductImage(listing);
    if (image && !used.has(image)) {
      used.add(image);
      return image;
    }
  }
  for (const listing of listings) {
    const image = getProductImage(listing);
    if (image) return image;
  }
  return null;
};

/** Fixed hero lineup — only these four slides, in this order. */
const HERO_SLIDE_DEFS: Array<{
  match: (label: string) => boolean;
  eyebrow: string;
  title: (group: ShopCategoryGroup) => string;
  subtitle: (group: ShopCategoryGroup) => string;
  image: (group: ShopCategoryGroup, used: Set<string>) => string | null;
}> = [
  {
    match: isWoodGroup,
    eyebrow: 'Home & Living',
    title: (group) => group.label,
    subtitle: (group) => `Shop ${group.label.toLowerCase()} from independent makers across India.`,
    // Keep original woodcraft product photography as-is.
    image: (group, used) => pickDistinctImage(group.items, used),
  },
  {
    match: isTextileGroup,
    eyebrow: 'New Collection',
    title: () => 'India, Woven Anew.',
    subtitle: () => 'Discover handcrafted textiles from India’s artisans.',
    image: (_group, used) => {
      used.add(HERO_FEATURE_IMAGES.textiles);
      return HERO_FEATURE_IMAGES.textiles;
    },
  },
  {
    match: isBambooGroup,
    eyebrow: 'Regional Craft',
    title: (group) => group.label,
    subtitle: (group) => `Shop ${group.label.toLowerCase()} from independent makers across India.`,
    image: (_group, used) => {
      used.add(HERO_FEATURE_IMAGES.bamboo);
      return HERO_FEATURE_IMAGES.bamboo;
    },
  },
  {
    match: (label) => /metal/i.test(label),
    eyebrow: 'Regional Craft',
    title: (group) => group.label,
    subtitle: (group) => `Shop ${group.label.toLowerCase()} from independent makers across India.`,
    image: (group, used) => pickDistinctImage(group.items, used),
  },
];

export const buildHeroSlides = (listings: MarketplaceListing[]): HeroSlide[] => {
  const groups = shopCategoriesFromListings(listings).filter((group) =>
    group.items.some((item) => Boolean(getProductImage(item))),
  );
  const used = new Set<string>();

  return HERO_SLIDE_DEFS.flatMap((def) => {
    const group = groups.find((g) => def.match(g.label));
    if (!group) return [];
    const image = def.image(group, used);
    if (!image) return [];
    return [
      {
        id: `hero-${group.label}`,
        image,
        eyebrow: def.eyebrow,
        title: def.title(group),
        subtitle: def.subtitle(group),
        cta: 'Shop Now',
        to: shopCategoryHref(group),
      },
    ];
  });
};

export const enrichShopCategories = (listings: MarketplaceListing[]) => {
  const used = new Set<string>();
  return shopCategoriesFromListings(listings).map((group) => ({
    ...group,
    image: pickDistinctImage(group.items, used),
  }));
};

export const enrichRegions = (listings: MarketplaceListing[]) => {
  const used = new Set<string>();
  return listingsByRegion(listings).map((region) => {
    const crafts = Array.from(
      new Set(
        region.items
          .map((item) => item.artisan?.craft_type || item.category)
          .filter((value): value is string => Boolean(value)),
      ),
    ).slice(0, 2);
    return {
      ...region,
      image: pickDistinctImage(region.items, used),
      craftLine: crafts.join(' & ') || `${region.count} ${region.count === 1 ? 'piece' : 'pieces'}`,
    };
  });
};

/** Collection tiles derived from real shop categories — no invented products. */
export const buildCollectionTiles = (groups: ShopCategoryGroup[]): CollectionTile[] => {
  const used = new Set<string>();
  return groups.slice(0, 6).map((group) => {
    const primaryCategory = group.categories[0];
    const note = primaryCategory ? CRAFT_NOTES[primaryCategory] : undefined;
    let image = pickDistinctImage(group.items, used);
    if (isTextileGroup(group.label)) image = HERO_FEATURE_IMAGES.textiles;
    if (isBambooGroup(group.label)) image = HERO_FEATURE_IMAGES.bamboo;
    return {
      id: group.label,
      name: `${group.label} Collection`,
      blurb: note
        ? note.split('.')[0] + '.'
        : `Explore ${group.label.toLowerCase()} from artisans across India.`,
      image,
      to: shopCategoryHref(group),
    };
  });
};

export const newestListings = (listings: MarketplaceListing[], count = 8) =>
  [...listings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, count);

/** Cross-section fallback when true sales ranking is unavailable publicly. */
export const featuredListings = (listings: MarketplaceListing[], count = 8) =>
  pickFeaturedListings(listings, count);

export const trendingListings = (listings: MarketplaceListing[], excludeIds: Set<string>, count = 8) => {
  const pool = listings.filter((listing) => !excludeIds.has(listing.id) && getProductImage(listing));
  if (pool.length >= count) return pickFeaturedListings(pool, count);
  return pickFeaturedListings(listings, count);
};

export const artisanTeasers = (listings: MarketplaceListing[], count = 6) => {
  const used = new Set<string>();
  return uniqueArtisans(listings)
    .slice(0, count * 2)
    .map((listing) => {
      // Prefer the artisan's profile image when available; fall back to a product image.
      const artisanImage = listing.artisan?.profile_image_url || null;
      let image: string | null = null;
      if (artisanImage) {
        if (!used.has(artisanImage)) used.add(artisanImage);
        image = artisanImage;
      } else {
        image = pickDistinctImage(
          listings.filter((item) => item.artisan?.id === listing.artisan?.id),
          used,
        );
      }
      return { listing, image };
    })
    .filter((item) => item.listing.artisan?.id)
    .slice(0, count);
};

export const craftTiles = (listings: MarketplaceListing[]) => {
  const used = new Set<string>();
  const byCategory = new Map<string, MarketplaceListing[]>();
  listings.forEach((listing) => {
    if (!listing.category) return;
    const group = byCategory.get(listing.category) || [];
    group.push(listing);
    byCategory.set(listing.category, group);
  });

  return Array.from(byCategory.entries())
    .map(([name, items]) => ({
      name,
      count: items.length,
      image: pickDistinctImage(items, used),
      note: CRAFT_NOTES[name] ? `${CRAFT_NOTES[name].split('.')[0]}.` : undefined,
      to: `/marketplace?category=${encodeURIComponent(name)}`,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
};

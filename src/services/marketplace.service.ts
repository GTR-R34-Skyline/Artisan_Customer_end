import { supabase } from '../lib/supabase';
import { CraftsmanProfile, MarketplaceListing, MarketplaceProfile, ProductBadge } from '../types/marketplace';

const PUBLIC_STATUSES = ['approved', 'published', 'synced'];
const PRODUCT_SELECT = `
  id,
  vendor_id,
  title,
  title_en,
  description_en,
  raw_description,
  category,
  material,
  original_image_url,
  studio_image_url,
  enhanced_image_url,
  final_price,
  suggested_price,
  quantity,
  stock_count,
  labour_days,
  status,
  created_at,
  updated_at,
  artisan:profiles (
    id,
    full_name,
    profile_image_url,
    location_state,
    preferred_language
  )
`;

type VendorRow = {
  id: string;
  craft_type: string | null;
  gi_certified: boolean | null;
  verification_status: string | null;
  experience_years?: number | null;
};

type ReviewAgg = { sum: number; count: number };

const normalizeListing = (row: unknown): MarketplaceListing => {
  const source = row as Record<string, unknown>;
  const artisanValue = Array.isArray(source.artisan) ? source.artisan[0] : source.artisan;
  return { ...source, artisan: artisanValue || null } as unknown as MarketplaceListing;
};

const fetchVendorRows = async (ids: string[]): Promise<VendorRow[]> => {
  if (!ids.length) return [];

  const withExperience = await supabase
    .from('vendors')
    .select('id, craft_type, gi_certified, verification_status, experience_years')
    .in('id', ids);

  if (!withExperience.error && withExperience.data) {
    return withExperience.data as VendorRow[];
  }

  const basic = await supabase
    .from('vendors')
    .select('id, craft_type, gi_certified, verification_status')
    .in('id', ids);

  if (basic.error || !basic.data) return [];
  return basic.data as VendorRow[];
};

const fetchExperienceFromApplications = async (
  artisans: Array<{ id: string; name: string | null }>,
): Promise<Map<string, number>> => {
  const map = new Map<string, number>();
  const names = Array.from(
    new Set(artisans.map((a) => a.name?.trim()).filter((name): name is string => Boolean(name))),
  );
  if (!names.length) return map;

  const { data, error } = await supabase
    .from('vendor_applications')
    .select('name, experience_years, status, created_at')
    .in('name', names)
    .not('experience_years', 'is', null)
    .order('created_at', { ascending: false });

  if (error || !data) return map;

  const latestByName = new Map<string, number>();
  data.forEach((row) => {
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    const years = typeof row.experience_years === 'number' ? row.experience_years : null;
    if (!name || years === null || years <= 0 || latestByName.has(name)) return;
    latestByName.set(name, years);
  });

  artisans.forEach((artisan) => {
    const name = artisan.name?.trim();
    if (!name) return;
    const years = latestByName.get(name);
    if (years) map.set(artisan.id, years);
  });

  return map;
};

const fetchReviewAggregates = async (productIds: string[]): Promise<Map<string, ReviewAgg>> => {
  const map = new Map<string, ReviewAgg>();
  if (!productIds.length) return map;

  const { data, error } = await supabase
    .from('customer_reviews')
    .select('product_id, rating')
    .in('product_id', productIds);

  if (error || !data) return map;

  data.forEach((row) => {
    const productId = typeof row.product_id === 'string' ? row.product_id : null;
    const rating = typeof row.rating === 'number' ? row.rating : Number(row.rating);
    if (!productId || !Number.isFinite(rating) || rating < 1 || rating > 5) return;
    const current = map.get(productId) || { sum: 0, count: 0 };
    current.sum += rating;
    current.count += 1;
    map.set(productId, current);
  });

  return map;
};

const assignBadges = (listings: MarketplaceListing[]): MarketplaceListing[] => {
  const withReviews = listings
    .map((listing, index) => ({
      listing,
      index,
      reviewCount: listing.reviewCount ?? 0,
      rating: listing.rating ?? 0,
      created: new Date(listing.created_at).getTime() || 0,
    }))
    .filter((item) => item.reviewCount > 0);

  const bestsellerIds = new Set(
    [...withReviews]
      .filter((item) => item.reviewCount >= 2 && item.rating >= 4.3)
      .sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating)
      .slice(0, Math.max(2, Math.ceil(listings.length * 0.12)))
      .map((item) => item.listing.id),
  );

  const newestIds = new Set(
    [...listings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, Math.max(3, Math.ceil(listings.length * 0.15)))
      .map((item) => item.id),
  );

  return listings.map((listing) => {
    let badge: ProductBadge = null;
    if (bestsellerIds.has(listing.id)) {
      badge = 'bestseller';
    } else if (newestIds.has(listing.id) && !bestsellerIds.has(listing.id)) {
      // Mark a subset of newest as trending — skip every other to avoid badge clutter
      const newestList = [...newestIds];
      const rank = newestList.indexOf(listing.id);
      if (rank >= 0 && rank % 2 === 0) badge = 'trending';
    }
    return { ...listing, badge };
  });
};

const enrichWithVendors = async (listings: MarketplaceListing[]): Promise<MarketplaceListing[]> => {
  const ids = Array.from(new Set(listings.map((listing) => listing.vendor_id).filter((id): id is string => Boolean(id))));
  if (!ids.length) return listings;

  const vendorRows = await fetchVendorRows(ids);
  const vendors = new Map(vendorRows.map((row) => [row.id, row]));

  const experienceFromVendor = new Map<string, number>();
  vendorRows.forEach((row) => {
    if (typeof row.experience_years === 'number' && row.experience_years > 0) {
      experienceFromVendor.set(row.id, row.experience_years);
    }
  });

  const needsApplicationFallback = ids.filter((id) => !experienceFromVendor.has(id));
  const applicationExperience =
    needsApplicationFallback.length > 0
      ? await fetchExperienceFromApplications(
          listings
            .filter((listing) => listing.artisan?.id && needsApplicationFallback.includes(listing.vendor_id || ''))
            .map((listing) => ({ id: listing.artisan!.id, name: listing.artisan!.full_name })),
        )
      : new Map<string, number>();

  return listings.map((listing) => {
    const vendor = listing.vendor_id ? vendors.get(listing.vendor_id) : undefined;
    if (!listing.artisan) return listing;

    const years =
      (listing.vendor_id && experienceFromVendor.get(listing.vendor_id)) ||
      (listing.artisan.id && applicationExperience.get(listing.artisan.id)) ||
      null;

    return {
      ...listing,
      artisan: {
        ...listing.artisan,
        craft_type: vendor?.craft_type ?? listing.artisan.craft_type,
        gi_certified: vendor?.gi_certified ?? listing.artisan.gi_certified,
        verification_status: vendor?.verification_status ?? listing.artisan.verification_status,
        yearsOfExperience: years,
      },
    };
  });
};

const enrichWithReviewsAndBadges = async (listings: MarketplaceListing[]): Promise<MarketplaceListing[]> => {
  const productIds = listings.map((listing) => listing.id);
  const aggregates = await fetchReviewAggregates(productIds);

  const withRatings = listings.map((listing) => {
    const agg = aggregates.get(listing.id);
    if (!agg || agg.count === 0) {
      return { ...listing, rating: null, reviewCount: 0, badge: null as ProductBadge };
    }
    const average = Math.round((agg.sum / agg.count) * 10) / 10;
    return {
      ...listing,
      rating: average,
      reviewCount: agg.count,
    };
  });

  return assignBadges(withRatings);
};

const enrichListings = async (listings: MarketplaceListing[]): Promise<MarketplaceListing[]> => {
  const withVendors = await enrichWithVendors(listings);
  return enrichWithReviewsAndBadges(withVendors);
};

export const getMarketplaceListings = async (): Promise<MarketplaceListing[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .in('status', PUBLIC_STATUSES)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return enrichListings((data || []).map(normalizeListing));
};

export const getMarketplaceListing = async (productId: string): Promise<MarketplaceListing | null> => {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', productId)
    .in('status', PUBLIC_STATUSES)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  const [listing] = await enrichListings([normalizeListing(data)]);
  return listing;
};

export const getCraftsmanProfile = async (craftsmanId: string): Promise<CraftsmanProfile | null> => {
  const [{ data: profile, error: profileError }, { data: products, error: productsError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, profile_image_url, artisan_story, location_state, preferred_language')
      .eq('id', craftsmanId)
      .maybeSingle(),
    supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('vendor_id', craftsmanId)
      .in('status', PUBLIC_STATUSES)
      .order('created_at', { ascending: false }),
  ]);

  if (profileError) throw profileError;
  if (productsError) throw productsError;
  if (!profile) return null;

  const vendorRows = await fetchVendorRows([craftsmanId]);
  const vendor = vendorRows[0];

  let yearsOfExperience: number | null =
    typeof vendor?.experience_years === 'number' && vendor.experience_years > 0
      ? vendor.experience_years
      : null;

  if (yearsOfExperience === null) {
    const fromApps = await fetchExperienceFromApplications([
      { id: craftsmanId, name: profile.full_name },
    ]);
    yearsOfExperience = fromApps.get(craftsmanId) ?? null;
  }

  const artisanExtras: Pick<
    MarketplaceProfile,
    'craft_type' | 'gi_certified' | 'verification_status' | 'yearsOfExperience'
  > = {
    craft_type: vendor?.craft_type || null,
    gi_certified: vendor?.gi_certified ?? null,
    verification_status: vendor?.verification_status || null,
    yearsOfExperience,
  };

  const listings = await enrichWithReviewsAndBadges(
    (products || []).map((row) => {
      const listing = normalizeListing(row);
      return listing.artisan
        ? { ...listing, artisan: { ...listing.artisan, ...artisanExtras } }
        : listing;
    }),
  );

  return {
    ...profile,
    ...artisanExtras,
    products: listings,
  } as CraftsmanProfile;
};

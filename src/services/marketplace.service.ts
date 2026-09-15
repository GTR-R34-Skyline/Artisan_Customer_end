import { supabase } from '../lib/supabase';
import { CraftsmanProfile, MarketplaceListing, MarketplaceProfile } from '../types/marketplace';

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
};

const normalizeListing = (row: unknown): MarketplaceListing => {
  const source = row as Record<string, unknown>;
  const artisanValue = Array.isArray(source.artisan) ? source.artisan[0] : source.artisan;
  return { ...source, artisan: artisanValue || null } as unknown as MarketplaceListing;
};

const enrichWithVendors = async (listings: MarketplaceListing[]): Promise<MarketplaceListing[]> => {
  const ids = Array.from(new Set(listings.map((listing) => listing.vendor_id).filter((id): id is string => Boolean(id))));
  if (!ids.length) return listings;

  const { data, error } = await supabase
    .from('vendors')
    .select('id, craft_type, gi_certified, verification_status')
    .in('id', ids);

  if (error || !data) return listings;

  const vendors = new Map((data as VendorRow[]).map((row) => [row.id, row]));
  return listings.map((listing) => {
    const vendor = listing.vendor_id ? vendors.get(listing.vendor_id) : undefined;
    if (!vendor || !listing.artisan) return listing;
    return {
      ...listing,
      artisan: {
        ...listing.artisan,
        craft_type: vendor.craft_type,
        gi_certified: vendor.gi_certified,
        verification_status: vendor.verification_status,
      },
    };
  });
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

  return enrichWithVendors((data || []).map(normalizeListing));
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
  const [listing] = await enrichWithVendors([normalizeListing(data)]);
  return listing;
};

export const getCraftsmanProfile = async (craftsmanId: string): Promise<CraftsmanProfile | null> => {
  const [{ data: profile, error: profileError }, { data: vendor, error: vendorError }, { data: products, error: productsError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, profile_image_url, artisan_story, location_state, preferred_language')
      .eq('id', craftsmanId)
      .maybeSingle(),
    supabase
      .from('vendors')
      .select('craft_type, verification_status, gi_certified')
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
  if (vendorError) throw vendorError;
  if (productsError) throw productsError;
  if (!profile) return null;

  const artisanExtras: Pick<MarketplaceProfile, 'craft_type' | 'gi_certified' | 'verification_status'> = {
    craft_type: vendor?.craft_type || null,
    gi_certified: vendor?.gi_certified ?? null,
    verification_status: vendor?.verification_status || null,
  };

  const listings = (products || []).map((row) => {
    const listing = normalizeListing(row);
    return listing.artisan
      ? { ...listing, artisan: { ...listing.artisan, ...artisanExtras } }
      : listing;
  });

  return {
    ...profile,
    ...artisanExtras,
    products: listings,
  } as CraftsmanProfile;
};

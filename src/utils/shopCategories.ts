import { getProductImage, MarketplaceListing } from '../types/marketplace';

/**
 * Maps free-text craft categories from the database to product-first shop labels.
 * Filtering still uses the real `products.category` value.
 */
export const SHOP_CATEGORY_LABELS: Record<string, string> = {
  Handloom: 'Sarees & Textiles',
  Kalamkari: 'Paintings & Art',
  Dokra: 'Metalcraft',
  Terracotta: 'Pottery & Ceramics',
  Woodcraft: 'Woodcraft',
  'Metal Craft': 'Metalcraft',
  Bamboo: 'Bamboo & Cane',
  'Bamboo Craft': 'Bamboo & Cane',
};

export const shopCategoryLabel = (category: string | null | undefined): string => {
  if (!category) return 'Decorative Crafts';
  return SHOP_CATEGORY_LABELS[category] || category;
};

export interface ShopCategoryGroup {
  /** Display name for the shop UI */
  label: string;
  /** Real DB category values that roll into this shop group */
  categories: string[];
  count: number;
  items: MarketplaceListing[];
  image: string | null;
}

/** Group live listings into product-first shop categories (no fabricated groups). */
export const shopCategoriesFromListings = (listings: MarketplaceListing[]): ShopCategoryGroup[] => {
  const byLabel = new Map<string, MarketplaceListing[]>();
  const categoriesByLabel = new Map<string, Set<string>>();

  listings.forEach((listing) => {
    if (!listing.category) return;
    const label = shopCategoryLabel(listing.category);
    const group = byLabel.get(label) || [];
    group.push(listing);
    byLabel.set(label, group);

    const cats = categoriesByLabel.get(label) || new Set<string>();
    cats.add(listing.category);
    categoriesByLabel.set(label, cats);
  });

  return Array.from(byLabel.entries())
    .map(([label, items]) => ({
      label,
      categories: Array.from(categoriesByLabel.get(label) || []),
      count: items.length,
      items,
      image: getProductImage(items[0]) || null,
    }))
    .sort((a, b) => b.count - a.count);
};

/** Primary query param for a shop group — first real category, or comma-joined for multi. */
export const shopCategoryHref = (group: ShopCategoryGroup): string => {
  if (group.categories.length === 1) {
    return `/marketplace?category=${encodeURIComponent(group.categories[0])}`;
  }
  // Prefer the most common category within the group for filter compatibility
  const counts = new Map<string, number>();
  group.items.forEach((item) => {
    if (!item.category) return;
    counts.set(item.category, (counts.get(item.category) || 0) + 1);
  });
  const primary = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || group.categories[0];
  return `/marketplace?category=${encodeURIComponent(primary)}`;
};

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { groupedStates, PRICE_RANGES } from '../../utils/marketplace';
import { shopCategoryLabel } from '../../utils/shopCategories';

export interface FilterValues {
  category: string;
  region: string;
  craft: string;
  material: string;
  price: string;
}

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'newest';

interface FilterPanelProps {
  categories: string[];
  regions: string[];
  crafts: string[];
  materials: string[];
  values: FilterValues;
  onChange: (key: keyof FilterValues, value: string) => void;
  onClear: () => void;
  idPrefix?: string;
}

const FilterGroup: React.FC<{
  legend: string;
  options: string[];
  value: string;
  name: string;
  allLabel: string;
  onChange: (value: string) => void;
  getLabel?: (option: string) => string;
}> = ({ legend, options, value, name, allLabel, onChange, getLabel }) => {
  if (!options.length) return null;

  return (
    <fieldset className="filter-group">
      <legend className="filter-legend">{legend}</legend>
      <label className="filter-option">
        <input type="radio" name={name} checked={!value} onChange={() => onChange('')} />
        <span>{allLabel}</span>
      </label>
      {options.map((option) => (
        <label key={option} className="filter-option">
          <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
          <span>{getLabel ? getLabel(option) : option}</span>
        </label>
      ))}
    </fieldset>
  );
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  categories,
  regions,
  crafts,
  materials,
  values,
  onChange,
  onClear,
  idPrefix = 'filter',
}) => {
  const activeCount = [values.category, values.region, values.craft, values.material, values.price].filter(Boolean).length;
  const uniqueCrafts = crafts;

  return (
    <form className="filter-panel" onSubmit={(event) => event.preventDefault()}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Filter</p>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="min-h-11 text-xs font-semibold text-indigo hover:text-terracotta">
            Clear all
          </button>
        )}
      </div>

      <FilterGroup
        legend="Category"
        options={categories}
        value={values.category}
        name={`${idPrefix}-category`}
        allLabel="All categories"
        onChange={(value) => onChange('category', value)}
        getLabel={shopCategoryLabel}
      />
      <FilterGroup
        legend="State"
        options={regions}
        value={values.region}
        name={`${idPrefix}-region`}
        allLabel="All states"
        onChange={(value) => onChange('region', value)}
      />
      <FilterGroup
        legend="Craft"
        options={uniqueCrafts}
        value={values.craft}
        name={`${idPrefix}-craft`}
        allLabel="All crafts"
        onChange={(value) => onChange('craft', value)}
      />
      <FilterGroup
        legend="Material"
        options={materials}
        value={values.material}
        name={`${idPrefix}-material`}
        allLabel="All materials"
        onChange={(value) => onChange('material', value)}
      />
      <fieldset className="filter-group">
        <legend className="filter-legend">Price</legend>
        <label className="filter-option">
          <input type="radio" name={`${idPrefix}-price`} checked={!values.price} onChange={() => onChange('price', '')} />
          <span>Any price</span>
        </label>
        {PRICE_RANGES.map((range) => (
          <label key={range.id} className="filter-option">
            <input
              type="radio"
              name={`${idPrefix}-price`}
              checked={values.price === range.id}
              onChange={() => onChange('price', range.id)}
            />
            <span>{range.label}</span>
          </label>
        ))}
      </fieldset>
    </form>
  );
};

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  categories: string[];
  regions: string[];
  crafts: string[];
  materials: string[];
  values: FilterValues;
  sort: SortOption;
  onApply: (values: FilterValues, sort: SortOption) => void;
}

const emptyFilters: FilterValues = { category: '', region: '', craft: '', material: '', price: '' };

export const FilterSheet: React.FC<FilterSheetProps> = ({
  open,
  onClose,
  categories,
  regions,
  crafts,
  materials,
  values,
  sort,
  onApply,
}) => {
  const [draft, setDraft] = useState<FilterValues>(values);
  const [draftSort, setDraftSort] = useState<SortOption>(sort);
  const [stateQuery, setStateQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraft({
      category: values.category,
      region: values.region,
      craft: values.craft,
      material: values.material,
      price: values.price,
    });
    setDraftSort(sort);
    setStateQuery('');
  }, [open, sort, values.category, values.craft, values.material, values.price, values.region]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const visibleStates = useMemo(() => {
    const query = stateQuery.trim().toLowerCase();
    return query ? regions.filter((region) => region.toLowerCase().includes(query)) : regions;
  }, [regions, stateQuery]);

  const stateGroups = useMemo(() => groupedStates(visibleStates), [visibleStates]);
  const uniqueCrafts = crafts.filter((craft) => craft !== draft.category);

  const updateDraft = (key: keyof FilterValues, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="filter-sheet-root lg:hidden">
      <button type="button" className="filter-overlay" aria-label="Close filters" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="mobile-filters-title" className="filter-sheet">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
          <h2 id="mobile-filters-title" className="font-display text-2xl text-charcoal">Filter & Sort</h2>
          <button type="button" onClick={onClose} className="header-icon inline-flex" aria-label="Close filters">
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="filter-sheet-body">
          <fieldset className="filter-group">
            <legend className="filter-legend">Sort</legend>
            {[
              { id: 'featured', label: 'Recommended' },
              { id: 'newest', label: 'Newest' },
              { id: 'price-asc', label: 'Price: Low → High' },
              { id: 'price-desc', label: 'Price: High → Low' },
            ].map((option) => (
              <label key={option.id} className="filter-option">
                <input
                  type="radio"
                  name="mobile-sort"
                  checked={draftSort === option.id}
                  onChange={() => setDraftSort(option.id as SortOption)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>

          <FilterGroup
            legend="Category"
            options={categories}
            value={draft.category}
            name="sheet-category"
            allLabel="All categories"
            onChange={(value) => updateDraft('category', value)}
            getLabel={shopCategoryLabel}
          />

          {regions.length > 0 && (
            <fieldset className="filter-group">
              <legend className="filter-legend">State</legend>
              {regions.length > 8 && (
                <input
                  value={stateQuery}
                  onChange={(event) => setStateQuery(event.target.value)}
                  placeholder="Search a state"
                  className="mb-3 w-full min-h-11 rounded-md border border-stone-300 bg-cream px-3 text-sm text-charcoal outline-none"
                  aria-label="Search states"
                />
              )}
              <label className="filter-option">
                <input type="radio" name="sheet-region" checked={!draft.region} onChange={() => updateDraft('region', '')} />
                <span>All states</span>
              </label>
              {(regions.length > 8 ? stateGroups : [{ zone: '', items: visibleStates }]).map((group) => (
                <div key={group.zone || 'states'} className="mt-2">
                  {group.zone && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">{group.zone}</p>}
                  {group.items.map((option) => (
                    <label key={option} className="filter-option">
                      <input
                        type="radio"
                        name="sheet-region"
                        checked={draft.region === option}
                        onChange={() => updateDraft('region', option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ))}
            </fieldset>
          )}

          <FilterGroup
            legend="Craft"
            options={uniqueCrafts}
            value={draft.craft}
            name="sheet-craft"
            allLabel="All crafts"
            onChange={(value) => updateDraft('craft', value)}
          />
          <FilterGroup
            legend="Material"
            options={materials}
            value={draft.material}
            name="sheet-material"
            allLabel="All materials"
            onChange={(value) => updateDraft('material', value)}
          />
          <fieldset className="filter-group">
            <legend className="filter-legend">Price</legend>
            <label className="filter-option">
              <input type="radio" name="sheet-price" checked={!draft.price} onChange={() => updateDraft('price', '')} />
              <span>Any price</span>
            </label>
            {PRICE_RANGES.map((range) => (
              <label key={range.id} className="filter-option">
                <input
                  type="radio"
                  name="sheet-price"
                  checked={draft.price === range.id}
                  onChange={() => updateDraft('price', range.id)}
                />
                <span>{range.label}</span>
              </label>
            ))}
          </fieldset>
        </div>
        <div className="filter-sheet-actions">
          <button
            type="button"
            onClick={() => {
              setDraft(emptyFilters);
              setDraftSort('featured');
              onApply(emptyFilters, 'featured');
              onClose();
            }}
            className="button-light min-h-12 flex-1 rounded-md px-4 text-sm font-semibold"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => { onApply(draft, draftSort); onClose(); }}
            className="button-dark min-h-12 flex-[1.4] rounded-md px-4 text-sm font-semibold"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

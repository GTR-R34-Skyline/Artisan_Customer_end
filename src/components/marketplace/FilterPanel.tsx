import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { PRICE_RANGES } from '../../utils/marketplace';

export interface FilterValues {
  category: string;
  region: string;
  material: string;
  price: string;
}

interface FilterPanelProps {
  categories: string[];
  regions: string[];
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
}> = ({ legend, options, value, name, allLabel, onChange }) => {
  if (!options.length) return null;

  return (
    <fieldset className="filter-group">
      <legend className="filter-legend">{legend}</legend>
      <label className="filter-option">
        <input
          type="radio"
          name={name}
          checked={!value}
          onChange={() => onChange('')}
        />
        <span>{allLabel}</span>
      </label>
      {options.map((option) => (
        <label key={option} className="filter-option">
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span>{option}</span>
        </label>
      ))}
    </fieldset>
  );
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  categories,
  regions,
  materials,
  values,
  onChange,
  onClear,
  idPrefix = 'filter',
}) => {
  const activeCount = [values.category, values.region, values.material, values.price].filter(Boolean).length;

  return (
    <form className="filter-panel" onSubmit={(event) => event.preventDefault()}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Filter</p>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="text-xs font-semibold text-indigo hover:text-terracotta">
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

interface FilterSheetProps extends FilterPanelProps {
  open: boolean;
  onClose: () => void;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({ open, onClose, ...panelProps }) => {
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

  if (!open) return null;

  return (
    <div className="filter-sheet-root lg:hidden">
      <button type="button" className="filter-overlay" aria-label="Close filters" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-filters-title"
        className="filter-sheet"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 id="mobile-filters-title" className="font-display text-2xl text-charcoal">Filters</h2>
          <button type="button" onClick={onClose} className="header-icon inline-flex" aria-label="Close filters">
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
          <FilterPanel {...panelProps} idPrefix="mobile-filter" />
        </div>
        <div className="border-t border-stone-200 px-5 py-4">
          <button type="button" onClick={onClose} className="button-dark w-full min-h-11 rounded-md px-5 text-sm font-semibold">
            Show results
          </button>
        </div>
      </div>
    </div>
  );
};

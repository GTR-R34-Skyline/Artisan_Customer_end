import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INDIA_MAP_STATES, INDIA_MAP_VIEWBOX } from '../../data/indiaMapPaths';
import { getRegionMeta, marketplaceRegionHref } from '../../data/indiaRegions';

interface IndiaMapProps {
  availableStates?: Set<string>;
  className?: string;
}

export const IndiaMap: React.FC<IndiaMapProps> = ({ availableStates, className = '' }) => {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const hovered = useMemo(
    () => INDIA_MAP_STATES.find((state) => state.id === hoveredId) || null,
    [hoveredId],
  );

  const hoveredMeta = hovered ? getRegionMeta(hovered.name) : null;
  const hasProducts = hovered ? !availableStates || availableStates.has(hovered.name) : false;

  const explore = (name: string) => {
    navigate(marketplaceRegionHref(name));
  };

  return (
    <div
      className={`india-map relative min-w-0 ${className}`}
      onMouseLeave={() => setHoveredId(null)}
    >
      <svg
        viewBox={INDIA_MAP_VIEWBOX}
        className="india-map-svg h-auto w-full max-h-[min(72vh,36rem)]"
        role="img"
        aria-label="Interactive map of India. Select a state to explore crafts."
      >
        <rect width="100%" height="100%" fill="transparent" />
        {INDIA_MAP_STATES.map((state) => {
          const active = hoveredId === state.id;
          const inStock = !availableStates || availableStates.has(state.name);
          return (
            <path
              key={state.id}
              d={state.path}
              className={`india-map-state ${active ? 'is-active' : ''} ${inStock ? 'has-products' : 'is-empty'}`}
              role="button"
              tabIndex={0}
              aria-label={`Explore crafts from ${state.name}`}
              onMouseEnter={() => setHoveredId(state.id)}
              onFocus={() => setHoveredId(state.id)}
              onClick={() => explore(state.name)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  explore(state.name);
                }
              }}
            />
          );
        })}

        {/* Labels for larger / key states — keep sparse for readability */}
        {INDIA_MAP_STATES.filter((state) =>
          [
            'Rajasthan',
            'Madhya Pradesh',
            'Maharashtra',
            'Uttar Pradesh',
            'Karnataka',
            'Tamil Nadu',
            'Gujarat',
            'Odisha',
            'West Bengal',
            'Assam',
            'Kerala',
            'Andhra Pradesh',
            'Bihar',
            'Telangana',
            'Jharkhand',
            'Chhattisgarh',
            'Punjab',
            'Haryana',
          ].includes(state.name),
        ).map((state) => (
          <text
            key={`label-${state.id}`}
            x={state.labelX}
            y={state.labelY}
            className="india-map-label"
            textAnchor="middle"
            dominantBaseline="middle"
            pointerEvents="none"
          >
            {state.name}
          </text>
        ))}
      </svg>

      {hovered && hoveredMeta && (
        <div
          className="india-map-tooltip"
          style={{
            left: `clamp(0.5rem, ${(hovered.labelX / 680) * 100}%, calc(100% - 11rem))`,
            top: `clamp(0.5rem, ${(hovered.labelY / 780) * 100}%, calc(100% - 7rem))`,
          }}
          role="status"
        >
          <p className="font-display text-lg leading-tight text-charcoal">{hoveredMeta.name}</p>
          <p className="mt-1 text-[11px] leading-4 text-stone-600">
            {hasProducts ? hoveredMeta.crafts : 'No products listed from this region yet.'}
          </p>
          <button
            type="button"
            className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-terracotta"
            onClick={() => explore(hovered.name)}
          >
            Explore Crafts →
          </button>
        </div>
      )}
    </div>
  );
};

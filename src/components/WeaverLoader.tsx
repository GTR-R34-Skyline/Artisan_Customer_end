import React from 'react';

interface WeaverLoaderProps {
  label?: string;
  compact?: boolean;
}

export const WeaverLoader: React.FC<WeaverLoaderProps> = ({
  label = 'The loom is at work',
  compact = false,
}) => (
  <div className={`weaver-loader ${compact ? 'is-compact' : ''}`} role="status" aria-live="polite">
    <div className="loom" aria-hidden="true">
      <div className="loom-warps">
        {Array.from({ length: 11 }, (_, index) => (
          <span key={index} style={{ animationDelay: `${index * 70}ms` }} />
        ))}
      </div>
      <div className="loom-cloth" />
      <div className="loom-shuttle">
        <span />
      </div>
    </div>
    <p>{label}</p>
  </div>
);

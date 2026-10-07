import type { CSSProperties } from 'react';

interface IconProps {
  name: string;
  className?: string;
  fill?: boolean;
  style?: CSSProperties;
}

/** Material Symbols Outlined glyph, bundled locally (no network needed). */
export function Icon({ name, className = '', fill, style }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined select-none ${className}`}
      style={fill ? { fontVariationSettings: "'FILL' 1", ...style } : style}
    >
      {name}
    </span>
  );
}

'use client';

export type BrandLogo3DProps = {
  compact?: boolean;
  animated?: boolean;
  label?: string;
};

export default function BrandLogo3D({ compact = false, animated = true, label = 'AL Green Design' }: BrandLogo3DProps) {
  return (
    <div className={`brandLogo3D ${compact ? 'compact' : ''} ${animated ? 'animated' : ''}`} aria-label={label} role="img">
      <span className="brandLogo3DGlow" aria-hidden="true" />
      <span className="brandLogo3DShadow" aria-hidden="true" />
      <span className="brandLogo3DPlate" aria-hidden="true">
        <svg viewBox="0 0 120 120" focusable="false">
          <defs>
            <linearGradient id="v038Metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff2e5" />
              <stop offset="0.22" stopColor="#efc7aa" />
              <stop offset="0.52" stopColor="#b97862" />
              <stop offset="0.78" stopColor="#f0c1a3" />
              <stop offset="1" stopColor="#7c3e3b" />
            </linearGradient>
            <linearGradient id="v038Dark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4a1020" />
              <stop offset="1" stopColor="#19070d" />
            </linearGradient>
            <filter id="v038Emboss" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#140509" floodOpacity="0.85" />
              <feDropShadow dx="0" dy="-1" stdDeviation="1" floodColor="#ffd9c2" floodOpacity="0.45" />
            </filter>
          </defs>
          <rect x="10" y="10" width="100" height="100" rx="24" fill="url(#v038Dark)" stroke="rgba(255,255,255,.12)" />
          <g fill="none" stroke="url(#v038Metal)" strokeWidth="5.4" strokeLinecap="round" strokeLinejoin="round" filter="url(#v038Emboss)">
            <path d="M27 86V45c0-10 8-18 18-18h6" />
            <path d="M36 83c0-27 17-47 48-59 5 31-5 54-33 69" />
            <path d="M42 78c11-12 22-23 35-33" />
            <path d="M49 66c3-10 2-18 0-27" />
            <path d="M62 55c7 1 14 1 22-1" />
            <path d="M52 93h41V61" />
            <path d="M64 93V70M78 93V64" />
            <path d="M52 81h41M52 70h41" />
          </g>
          <path d="M29 91h66" stroke="#f5d1ba" strokeWidth="2" opacity="0.55" />
        </svg>
      </span>
      <span className="brandLogo3DEdge" aria-hidden="true" />
    </div>
  );
}

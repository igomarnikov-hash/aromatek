import React from 'react';

/**
 * AromaTec logo
 * Props:
 *   size      — height in px, default 32
 *   markOnly  — mark only (collapsed sidebar), default false
 *   light     — white text for dark backgrounds, default false
 */
const Logo = ({ size = 32, markOnly = false, light = false }) => {
  const textColor = light ? '#ffffff' : '#111827';
  const greenDark = '#166534';

  /* ─── Mark only (collapsed sidebar) ──────────────────── */
  if (markOnly) {
    return (
      <img
        src="/logo-mark.png"
        alt="АромаТек"
        width={size}
        height={size}
        style={{ objectFit: 'contain', display: 'block' }}
      />
    );
  }

  /* ─── Full logo: mark + wordmark ─────────────────────── */
  const imgH = size;
  const imgW = Math.round(size * (204 / 200)); // preserve original aspect ratio

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <img
        src="/logo-mark.png"
        alt=""
        width={imgW}
        height={imgH}
        style={{ objectFit: 'contain', display: 'block' }}
      />
      <svg
        width="auto"
        height={size}
        viewBox="0 0 100 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <text
          x="0"
          y="26"
          fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
          fontWeight="700"
          fontSize="26"
          fill={textColor}
        >
          roma<tspan fill={greenDark}>Tec</tspan>
        </text>
      </svg>
    </span>
  );
};

export default Logo;

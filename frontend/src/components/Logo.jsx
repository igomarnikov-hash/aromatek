import React from 'react';

/**
 * AromaTec logo SVG component
 * Props:
 *   size      — height in px (width scales proportionally), default 32
 *   markOnly  — show only the "A+leaf" mark without text, default false
 *   light     — white text variant for dark backgrounds, default false
 */
const Logo = ({ size = 32, markOnly = false, light = false }) => {
  const textColor = light ? '#ffffff' : '#111827';
  const greenDark = '#166534';
  const greenLeaf = '#22c55e';
  const greenLeaf2 = '#4ade80';

  if (markOnly) {
    // Just the "A" mark with leaf — square aspect ratio
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Letter A */}
        <text
          x="4"
          y="36"
          fontFamily="'Inter', 'DejaVu Sans', Arial, sans-serif"
          fontWeight="800"
          fontSize="36"
          fill={textColor}
        >A</text>
        {/* Leaf overlapping upper-left of A */}
        <ellipse cx="11" cy="10" rx="5.5" ry="9" transform="rotate(-12 11 10)" fill={greenLeaf} />
        <ellipse cx="9.5" cy="10" rx="2.8" ry="6" transform="rotate(-18 9.5 10)" fill={greenLeaf2} opacity="0.7" />
        <line x1="11" y1="3" x2="10" y2="18" stroke={greenDark} strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }

  // Full logo: mark + "Aroma" + "Tec"
  const h = size;
  const scale = h / 36;
  const totalW = Math.round(200 * scale);

  return (
    <svg
      width={totalW}
      height={h}
      viewBox="0 0 200 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Letter A */}
      <text
        x="2"
        y="33"
        fontFamily="'Inter', 'DejaVu Sans', Arial, sans-serif"
        fontWeight="800"
        fontSize="33"
        fill={textColor}
      >A</text>

      {/* Leaf */}
      <ellipse cx="10" cy="9" rx="5" ry="8.5" transform="rotate(-12 10 9)" fill={greenLeaf} />
      <ellipse cx="8.5" cy="9" rx="2.5" ry="5.5" transform="rotate(-18 8.5 9)" fill={greenLeaf2} opacity="0.75" />
      <line x1="10" y1="2" x2="9" y2="16" stroke={greenDark} strokeWidth="0.9" strokeLinecap="round" />

      {/* "roma" */}
      <text
        x="27"
        y="33"
        fontFamily="'Inter', 'DejaVu Sans', Arial, sans-serif"
        fontWeight="700"
        fontSize="27"
        fill={textColor}
      >roma</text>

      {/* "Tec" in dark green */}
      <text
        x="106"
        y="33"
        fontFamily="'Inter', 'DejaVu Sans', Arial, sans-serif"
        fontWeight="700"
        fontSize="27"
        fill={greenDark}
      >Tec</text>
    </svg>
  );
};

export default Logo;

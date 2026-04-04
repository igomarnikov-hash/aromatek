import React from 'react';

/**
 * AromaTec logo — "A" is drawn as two diagonal strokes,
 * the crossbar (перекладина) is replaced by a leaf shape.
 * Then "roma" + "Tec" (green) follow as text.
 *
 * Props:
 *   size      — height in px, default 32
 *   markOnly  — square mark only (collapsed sidebar), default false
 *   light     — white text for dark backgrounds, default false
 */
const Logo = ({ size = 32, markOnly = false, light = false }) => {
  const textColor  = light ? '#ffffff' : '#111827';
  const greenDark  = '#166534';
  const greenLeaf  = '#3ab757';
  const leafVein   = '#0f5a28';

  /* ─── Square mark (collapsed sidebar) ──────────────────── */
  if (markOnly) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
           xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill={greenDark}/>
        {/* A — left leg */}
        <line x1="16" y1="3.5" x2="5"  y2="29" stroke="white" strokeWidth="3.8" strokeLinecap="round"/>
        {/* A — right leg */}
        <line x1="16" y1="3.5" x2="27" y2="29" stroke="white" strokeWidth="3.8" strokeLinecap="round"/>
        {/* Leaf crossbar */}
        <path d="M9.5,19 C11,15 21,15 22.5,19 C21,23 11,23 9.5,19 Z" fill={greenLeaf}/>
        <line x1="9.5" y1="19" x2="22.5" y2="19"
              stroke={leafVein} strokeWidth="0.9" strokeLinecap="round"/>
      </svg>
    );
  }

  /* ─── Full logo ─────────────────────────────────────────── */
  // The "A" is drawn manually so we can replace its crossbar with a leaf.
  // viewBox is 150 × 32; outer <svg> scales proportionally from `size`.
  const VB_W = 150;
  const VB_H = 32;
  const svgW = Math.round((size / VB_H) * VB_W);

  // Geometry of the hand-drawn "A"
  // Apex at (11, 3), bottom-left at (2.5, 30), bottom-right at (19.5, 30)
  // Crossbar level y = 18  →  left outer x ≈ 6.2, right outer x ≈ 15.8
  const apexX = 11, apexY = 3;
  const blX = 2.5,  blY = 30;
  const brX = 19.5, brY = 30;
  const leafY  = 18;               // crossbar height
  const leafX1 = 5.2, leafX2 = 16.8;  // leaf tip-to-tip
  const leafCtrl = 3.2;            // vertical bulge of leaf arcs

  return (
    <svg width={svgW} height={size}
         viewBox={`0 0 ${VB_W} ${VB_H}`} fill="none"
         xmlns="http://www.w3.org/2000/svg">

      {/* A — left diagonal leg */}
      <line x1={apexX} y1={apexY} x2={blX} y2={blY}
            stroke={textColor} strokeWidth="4" strokeLinecap="round"/>

      {/* A — right diagonal leg */}
      <line x1={apexX} y1={apexY} x2={brX} y2={brY}
            stroke={textColor} strokeWidth="4" strokeLinecap="round"/>

      {/* Leaf crossbar — two cubic arcs forming a leaf/lens */}
      <path
        d={`M${leafX1},${leafY}
            C${leafX1 + 3},${leafY - leafCtrl} ${leafX2 - 3},${leafY - leafCtrl} ${leafX2},${leafY}
            C${leafX2 - 3},${leafY + leafCtrl} ${leafX1 + 3},${leafY + leafCtrl} ${leafX1},${leafY}
            Z`}
        fill={greenLeaf}
      />
      {/* Leaf vein (central midrib) */}
      <line x1={leafX1} y1={leafY} x2={leafX2} y2={leafY}
            stroke={leafVein} strokeWidth="0.85" strokeLinecap="round"/>

      {/* "roma" + "Tec" — tspan handles the colour change, no gap */}
      <text
        x="22"
        y="27"
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="700"
        fontSize="26"
        fill={textColor}
      >
        roma<tspan fill={greenDark}>Tec</tspan>
      </text>
    </svg>
  );
};

export default Logo;

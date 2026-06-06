// friskr-logos.jsx — logo concept marks (brand green, warm paper)
const { useState: lUS } = React;

const GREEN = '#15a05a';
const INK = '#15231b';
const PAPER = '#f4f1e8';
const WHITE = '#ffffff';

// ── Concept marks. Each takes { c } color + size via viewBox scaling ──

// 01 · Sprout — two leaves rising from a stem. Growth / freshness.
function MarkSprout({ c = GREEN, s = 120 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <path d="M50 94 C50 72 50 62 50 50" stroke={c} strokeWidth="7" strokeLinecap="round" />
      <path d="M50 58 C64 58 79 50 86 32 C67 29 52 40 50 58 Z" fill={c} />
      <path d="M50 46 C36 46 21 37 15 20 C34 18 48 29 50 46 Z" fill={c} />
    </svg>
  );
}

// 02 · Leaf-check — a leaf with a checkmark vein. "Fresh & used in time."
function MarkLeafCheck({ c = GREEN, s = 120, veinColor }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <path d="M26 74 C20 44 42 18 84 16 C84 54 58 78 26 74 Z" fill={c} />
      <path d="M39 50 l9 9 l19 -23" stroke={veinColor || PAPER} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// 03 · Freshness ring — open ring echoing the app's freshness donut, leaf at the tip.
function MarkRing({ c = GREEN, s = 120 }) {
  const R = 35, C = 2 * Math.PI * R;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r={R} stroke={c} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${C * 0.76} ${C}`} transform="rotate(128 50 50)" />
      <path d="M50 17 C58 17 67 12 71 3 C61 1 52 7 50 17 Z" fill={c} transform="rotate(20 50 12)" />
    </svg>
  );
}

// 04 · Monogram — lowercase f whose ascender curls into a leaf.
function MarkMonogram({ c = GREEN, s = 120 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <path d="M40 92 V40 C40 25 49 15 66 17" stroke={c} strokeWidth="9" strokeLinecap="round" />
      <path d="M26 47 H58" stroke={c} strokeWidth="9" strokeLinecap="round" />
      <path d="M66 17 C66 27 73 35 86 35 C86 24 78 16 66 17 Z" fill={c} />
    </svg>
  );
}

// 05 · Dewdrop — a drop with a leaf curl carved in. Fresh / cool.
function MarkDrop({ c = GREEN, s = 120 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <path d="M50 8 C68 36 80 54 80 67 A30 30 0 1 1 20 67 C20 54 32 36 50 8 Z" fill={c} />
      <path d="M50 40 C42 50 38 60 38 72 C50 70 58 60 58 48" fill={PAPER} opacity="0.92" />
    </svg>
  );
}

// 06 · Typographic — the dot of the i becomes a leaf (wordmark-forward).
// (rendered inline in the lockup below)

// ── Wordmark lockups ──────────────────────────────────────────────
function Wordmark({ color = INK, size = 44, leafDot = false }) {
  // "friskr" with optional leaf dotting the i
  return (
    <span style={{ position: 'relative', fontFamily: "'Schibsted Grotesk', sans-serif", fontWeight: 800, fontSize: size, letterSpacing: -size * 0.03, color, lineHeight: 1 }}>
      friskr
      {leafDot && (
        <svg width={size * 0.34} height={size * 0.34} viewBox="0 0 100 100" style={{ position: 'absolute', left: size * 1.02, top: -size * 0.04 }}>
          <path d="M52 92 C40 70 46 34 92 16 C90 60 74 86 52 92 Z" fill={GREEN} />
        </svg>
      )}
    </span>
  );
}

// ── Leaf-check variations (concept 02 deep-dive) ──────────────────
// Shared almond-leaf path, tilted bottom-left → top-right.
const LEAF_D = "M22 78 C34 42 42 34 78 22 C66 58 58 66 22 78 Z";

// 2a · Solid leaf, check carved out (refined original)
function LC_Solid({ c = GREEN, s = 120, carve = PAPER }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <path d={LEAF_D} fill={c} />
      <path d="M35 55 l9 9 l20 -24" stroke={carve} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 2b · Linework — stroke leaf + stroke check, matches the app's icon language
function LC_Line({ c = GREEN, s = 120 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none" stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <path d={LEAF_D} />
      <path d="M34 54 l9 9 l21 -25" />
    </svg>
  );
}

// 2c · Duotone — light leaf, solid green check on top
function LC_Duo({ c = GREEN, s = 120, tint = '#a9dcbf' }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <path d={LEAF_D} fill={tint} />
      <path d="M35 55 l9 9 l20 -24" stroke={c} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 2d · Built from two leaves — the check's two arms are each a leaf.
// Redrawn to fill & center the frame (spans ~x15–87 / y13–80).
function LC_TwoLeaf({ c = GREEN, s = 120 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      {/* short arm leaf (lower-left) — reads back via lighter tone */}
      <path d="M42 80 C28 76 17 63 15 47 C32 53 43 65 42 80 Z" fill={c} opacity="0.55" />
      {/* long arm leaf (upper-right) */}
      <path d="M42 80 C50 56 64 33 87 13 C83 46 66 70 42 80 Z" fill={c} />
    </svg>
  );
}

// 2e · Hybrid — a check stroke whose long arm blooms a leaf at the tip
function LC_Bloom({ c = GREEN, s = 120 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <path d="M22 56 l14 14 l16 -19" stroke={c} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M52 51 C58 37 70 26 86 20 C84 42 72 56 52 51 Z" fill={c} />
    </svg>
  );
}

// 2f · Enclosed — open freshness ring around a leaf-check badge
function LC_Badge({ c = GREEN, s = 120 }) {
  const R = 40, C = 2 * Math.PI * R;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r={R} stroke={c} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${C * 0.8} ${C}`} transform="rotate(125 50 50)" />
      <g transform="translate(50 50) scale(0.52) translate(-50 -50)">
        <path d={LEAF_D} fill={c} />
        <path d="M35 55 l9 9 l20 -24" stroke={PAPER} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

Object.assign(window, { LC_Solid, LC_Line, LC_Duo, LC_TwoLeaf, LC_Bloom, LC_Badge });

// ── 2D refined — two-leaf check, redrawn to FILL & center the frame ──
// Shared geometry: vertex bottom-center, short leaf to upper-left,
// long leaf to upper-right. Spans ~x15–87 / y13–80 (was 28–82 / 22–70).
const TL_SHORT = "M42 80 C28 76 17 63 15 47 C32 53 43 65 42 80 Z";
const TL_LONG  = "M42 80 C50 56 64 33 87 13 C83 46 66 70 42 80 Z";

// 2D-A · Two-tone — short arm reads back via lighter tone (depth)
function TL_Tone({ c = GREEN, s = 120, tint }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <path d={TL_SHORT} fill={tint || c} opacity={tint ? 1 : 0.5} />
      <path d={TL_LONG} fill={c} />
    </svg>
  );
}

// 2D-B · Solid — one color, both arms equal. Strongest for 1-color print.
function TL_Solid({ c = GREEN, s = 120 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <path d={TL_SHORT} fill={c} />
      <path d={TL_LONG} fill={c} />
    </svg>
  );
}

// 2D-C · Gap — solid arms split by a hairline notch for crisp definition.
function TL_Gap({ c = GREEN, s = 120, gap = PAPER }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <path d={TL_SHORT} fill={c} />
      <path d={TL_LONG} fill={c} />
      <path d="M42 79 C49 57 61 37 80 19" stroke={gap} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

Object.assign(window, { TL_Tone, TL_Solid, TL_Gap, TL_SHORT, TL_LONG });

Object.assign(window, { MarkSprout, MarkLeafCheck, MarkRing, MarkMonogram, MarkDrop, Wordmark, GREEN, INK, PAPER, WHITE });

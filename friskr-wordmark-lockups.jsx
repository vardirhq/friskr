// friskr-wordmark-lockups.jsx — concept 2D (two-leaf check) meeting the wordmark,
// sitting after the final "r" of "friskr". Six interaction studies.

const WM_FONT = "'Schibsted Grotesk', sans-serif";

// Render the two-leaf mark, solid or two-tone, in any color.
function TL({ s = 64, c = window.GREEN, tone = false, tint }) {
  return tone
    ? <window.TL_Tone s={s} c={c} tint={tint || '#a9dcbf'} />
    : <window.TL_Solid s={s} c={c} />;
}

// Generic lockup: word + mark in a baseline-ish row, fully tunable per study.
// dx = horizontal nudge (negative overlaps into the r), dy = vertical nudge.
function WMLockup({ wordSize = 64, markSize = 64, tone = false, dx = 0, dy = 0, align = 'flex-end', wordColor = window.INK, markColor = window.GREEN, tint }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: align, lineHeight: 1 }}>
      <span style={{ fontFamily: WM_FONT, fontWeight: 800, fontSize: wordSize, letterSpacing: -wordSize * 0.03, color: wordColor }}>friskr</span>
      <div style={{ marginLeft: dx, transform: `translateY(${dy}px)`, display: 'flex' }}>
        <TL s={markSize} c={markColor} tone={tone} tint={tint} />
      </div>
    </div>
  );
}

// Per-study geometry. `paper` props draw on warm paper, `rev` on brand green.
const WM_STUDIES = [
  {
    no: '2D-i', name: 'Trailing tick',
    tagline: 'Baseline-aligned after the r — a clean checkmark that completes the name. "friskr ✓".',
    paper: { wordSize: 72, markSize: 60, dx: 2, dy: 6 },
    rev:   { wordSize: 40, markSize: 34, dx: 1, dy: 4 },
  },
  {
    no: '2D-ii', name: 'Rising sprout',
    tagline: 'Larger mark springing up and to the right off the final r — upward energy, growth.',
    paper: { wordSize: 70, markSize: 88, dx: -8, dy: 2 },
    rev:   { wordSize: 40, markSize: 50, dx: -4, dy: 1 },
  },
  {
    no: '2D-iii', name: 'Sprouting from the r',
    tagline: "Mark tucked into the r's terminal so the leaves appear to grow straight out of the letter.",
    paper: { wordSize: 72, markSize: 72, dx: -30, dy: -16 },
    rev:   { wordSize: 40, markSize: 40, dx: -17, dy: -9 },
  },
  {
    no: '2D-iv', name: 'Settled leaf',
    tagline: 'Two-tone mark dropped to rest just below the baseline — calmer, softer, a leaf coming to land.',
    paper: { wordSize: 72, markSize: 54, dx: 4, dy: 16, tone: true },
    rev:   { wordSize: 40, markSize: 30, dx: 2, dy: 9, tone: true },
  },
  {
    no: '2D-v', name: 'Oversized seal',
    tagline: 'Mark dominant — an oversized stamp-of-approval closing the name. Word recedes a touch.',
    paper: { wordSize: 60, markSize: 108, dx: -12, dy: 6 },
    rev:   { wordSize: 36, markSize: 62, dx: -7, dy: 3 },
  },
  {
    no: '2D-vi', name: 'Full stop',
    tagline: 'Shrunk to a small tick sitting at the baseline like a period. "friskr." — most minimal.',
    paper: { wordSize: 72, markSize: 34, dx: 4, dy: 22 },
    rev:   { wordSize: 40, markSize: 20, dx: 2, dy: 12 },
  },
];

function WMBoard({ no, name, tagline, paper, rev }) {
  return (
    <div style={{ width: '100%', height: '100%', background: window.PAPER, display: 'flex', flexDirection: 'column', padding: 30, fontFamily: WM_FONT, boxSizing: 'border-box' }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#8b938a' }}>{no} · {name}</span>

      {/* hero lockup on paper */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <WMLockup {...paper} />
      </div>

      {/* reverse on brand green */}
      <div style={{ background: window.GREEN, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <WMLockup {...rev} wordColor={window.WHITE} markColor={window.WHITE} tint="rgba(255,255,255,0.5)" />
      </div>

      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#586259', lineHeight: 1.45, textAlign: 'center' }}>{tagline}</p>
    </div>
  );
}

Object.assign(window, { WMBoard, WM_STUDIES });

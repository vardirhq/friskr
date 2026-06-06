// friskr-logo-boards.jsx — lays each concept onto an artboard
const MARKS = {
  sprout: window.MarkSprout,
  leafcheck: window.MarkLeafCheck,
  ring: window.MarkRing,
  monogram: window.MarkMonogram,
  drop: window.MarkDrop,
};

function AppIcon({ Mark, bg, markColor, size = 76, veinColor }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.24, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px -4px rgba(16,30,22,.3)', border: bg === window.PAPER ? '1px solid #e7e1d3' : 'none' }}>
      <Mark c={markColor} s={size * 0.62} veinColor={veinColor} />
    </div>
  );
}

function ConceptBoard({ no, name, markKey, tagline, leafDot, veinOnGreen }) {
  const Mark = markKey ? MARKS[markKey] : null;
  return (
    <div style={{ width: '100%', height: '100%', background: window.PAPER, display: 'flex', flexDirection: 'column', padding: 30, fontFamily: "'Schibsted Grotesk', sans-serif", boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#8b938a' }}>{no} · {name}</span>
      </div>

      {/* hero mark + wordmark */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
        {Mark ? <Mark c={window.GREEN} s={118} /> : (
          <window.Wordmark color={window.INK} size={64} leafDot />
        )}
        {Mark && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Mark c={window.GREEN} s={44} />
            <window.Wordmark color={window.INK} size={42} leafDot={leafDot} />
          </div>
        )}
      </div>

      {/* usage row: app icons + reverse */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', marginBottom: 16 }}>
        {Mark ? <>
          <AppIcon Mark={Mark} bg={window.GREEN} markColor={window.WHITE} veinColor={veinOnGreen ? window.GREEN : window.WHITE} />
          <AppIcon Mark={Mark} bg={window.PAPER} markColor={window.GREEN} veinColor={veinOnGreen ? window.PAPER : window.PAPER} />
          <AppIcon Mark={Mark} bg={window.INK} markColor={window.WHITE} veinColor={veinOnGreen ? window.INK : window.WHITE} />
        </> : <>
          <div style={{ width: 76, height: 76, borderRadius: 18, background: window.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: "'Schibsted Grotesk', sans-serif", fontWeight: 800, fontSize: 40, color: '#fff' }}>f</span></div>
          <div style={{ width: 76, height: 76, borderRadius: 18, background: window.INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: "'Schibsted Grotesk', sans-serif", fontWeight: 800, fontSize: 40, color: window.GREEN }}>f</span></div>
        </>}
      </div>

      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#586259', lineHeight: 1.45, textAlign: 'center' }}>{tagline}</p>
    </div>
  );
}

const CONCEPTS = [
  { no: '01', name: 'Sprout', markKey: 'sprout', leafDot: false, tagline: 'Two leaves rising — growth and freshness. Friendly, organic, unmistakably food.' },
  { no: '02', name: 'Leaf-check', markKey: 'leafcheck', leafDot: false, veinOnGreen: true, tagline: 'A leaf whose vein is a checkmark — "fresh, and used in time." Ties to the core loop.' },
  { no: '03', name: 'Freshness ring', markKey: 'ring', leafDot: false, tagline: "An open ring echoing the app's freshness donut, sprouting a leaf. Most product-native." },
  { no: '04', name: 'Monogram f', markKey: 'monogram', leafDot: false, tagline: 'A lowercase f whose ascender curls into a leaf. Compact, strong as an app icon.' },
  { no: '05', name: 'Dewdrop', markKey: 'drop', leafDot: false, tagline: 'A dew drop carved with a leaf — fresh, cool, calm. Softer, less literal.' },
  { no: '06', name: 'Wordmark + leaf', markKey: null, leafDot: true, tagline: 'Wordmark-forward: the dot of the i becomes a leaf. Most minimal, type-led.' },
];

const LC_VARIANTS = {
  '2a': window.LC_Solid, '2b': window.LC_Line, '2c': window.LC_Duo,
  '2d': window.LC_TwoLeaf, '2e': window.LC_Bloom, '2f': window.LC_Badge,
};

function LeafCheckBoard({ no, name, vkey, tagline }) {
  const Mark = LC_VARIANTS[vkey];
  const tile = (bg, mc, carve, tint, border) => (
    <div style={{ width: 76, height: 76, borderRadius: 18, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px -4px rgba(16,30,22,.3)', border: border ? '1px solid #e7e1d3' : 'none' }}>
      <Mark c={mc} carve={carve} tint={tint} s={47} />
    </div>
  );
  return (
    <div style={{ width: '100%', height: '100%', background: window.PAPER, display: 'flex', flexDirection: 'column', padding: 30, fontFamily: "'Schibsted Grotesk', sans-serif", boxSizing: 'border-box' }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#8b938a' }}>{no} · {name}</span>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
        <Mark c={window.GREEN} s={116} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Mark c={window.GREEN} s={42} />
          <window.Wordmark color={window.INK} size={42} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', marginBottom: 16 }}>
        {tile(window.GREEN, window.WHITE, window.GREEN, '#5cc088', false)}
        {tile(window.PAPER, window.GREEN, window.PAPER, '#a9dcbf', true)}
        {tile(window.INK, window.WHITE, window.INK, '#3a7d57', false)}
      </div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#586259', lineHeight: 1.45, textAlign: 'center' }}>{tagline}</p>
    </div>
  );
}

const LC_CONCEPTS = [
  { no: '2a', name: 'Solid + carve', vkey: '2a', tagline: 'The original, refined. Solid leaf, check carved clean through. Bold and legible at any size.' },
  { no: '2b', name: 'Linework', vkey: '2b', tagline: "Stroke leaf + stroke check — speaks the app's own 1.7px icon language. Lightest, most system-native." },
  { no: '2c', name: 'Duotone', vkey: '2c', tagline: 'Pale leaf, solid green check floating on top. Softer, with a bit more depth and warmth.' },
  { no: '2d', name: 'Two-leaf check', vkey: '2d', tagline: "The checkmark built entirely from two leaves. Cleverest construction — the tick is the foliage." },
  { no: '2e', name: 'Bloom', vkey: '2e', tagline: 'A check whose long arm blooms a leaf at the tip. Reads as motion — the action sprouts growth.' },
  { no: '2f', name: 'Ring badge', vkey: '2f', tagline: "Leaf-check enclosed in the freshness ring. Merges concept 02 + 03 into a complete seal/badge." },
];

function App() {
  return (
    <window.DesignCanvas>
      <window.DCSection id="concepts" title="Friskr — logo concepts" subtitle="Six directions · brand green on warm paper · Schibsted Grotesk">
        {CONCEPTS.map((c) => (
          <window.DCArtboard key={c.no} id={c.no} label={`${c.no} · ${c.name}`} width={520} height={470}>
            <ConceptBoard {...c} />
          </window.DCArtboard>
        ))}
      </window.DCSection>
      <window.DCSection id="leafcheck" title="02 · Leaf-check — variations" subtitle="Same idea, six constructions: solid · linework · duotone · built-from-leaves · bloom · badge">
        {LC_CONCEPTS.map((c) => (
          <window.DCArtboard key={c.no} id={'lc-' + c.no} label={`${c.no} · ${c.name}`} width={520} height={470}>
            <LeafCheckBoard {...c} />
          </window.DCArtboard>
        ))}
      </window.DCSection>
      <window.DCSection id="wordmark" title="2D · Two-leaf check + wordmark" subtitle="The mark placed after the final r — six ways it can meet the word: trailing tick · rising · sprouting · settled · oversized · full stop">
        {window.WM_STUDIES.map((c) => (
          <window.DCArtboard key={c.no} id={'wm-' + c.no} label={`${c.no} · ${c.name}`} width={520} height={420}>
            <window.WMBoard {...c} />
          </window.DCArtboard>
        ))}
      </window.DCSection>
    </window.DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

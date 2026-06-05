import { useState } from 'react';
import { FreshnessRing } from '../components/FreshnessRing';
import { Btn } from '../components/Btn';
import { Press } from '../components/Press';
import { IconLogo, IconLeaf, IconScan, IconHome, IconBell, IconCheck } from '../components/icons';

const STEPS = [
  {
    art: 'hero' as const,
    title: 'Aldri kast mat igjen',
    body: 'friskr holder styr på utløpsdatoer slik at familien bruker opp varene i tide.',
  },
  {
    art: 'scan' as const,
    title: 'Skann og legg til på sekunder',
    body: 'Pek kameraet mot strekkoden — vi fyller inn produktet automatisk. Bare velg dato.',
  },
  {
    art: 'house' as const,
    title: 'Ett delt lager for hele huset',
    body: 'Inviter familien. Alle ser hva som finnes hjemme og hva som må brukes først.',
  },
  {
    art: 'bell' as const,
    title: 'Bli varslet i tide',
    body: 'Få en vennlig påminnelse noen dager før noe går ut på dato.',
  },
];

function Art({ art }: { art: typeof STEPS[number]['art'] }) {
  if (art === 'hero') {
    return (
      <div style={{ position: 'relative', width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FreshnessRing fresh={12} soon={3} expired={1} size={180} stroke={16} />
        <span style={{ position: 'absolute', color: 'var(--primary)', display: 'flex' }}><IconLeaf size={64} strokeWidth={1.5} /></span>
      </div>
    );
  }
  const IconMap = { scan: IconScan, house: IconHome, bell: IconBell } as const;
  const I = IconMap[art];
  return (
    <div style={{ width: 150, height: 150, borderRadius: 44, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <I size={66} strokeWidth={1.5} />
    </div>
  );
}

interface OnboardingProps {
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
          <IconLogo size={22} />
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>friskr</span>
        </div>
        {!last && <Press onClick={onDone} style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-3)' }}>Hopp over</Press>}
      </div>

      <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px', textAlign: 'center', animation: 'friskr-rise .3s ease' }}>
        <div style={{ marginBottom: 40 }}><Art art={s.art} /></div>
        <h1 style={{ margin: '0 0 14px', fontSize: 27, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.15 }}>{s.title}</h1>
        <p style={{ margin: 0, fontSize: 15.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 300 }}>{s.body}</p>
      </div>

      <div style={{ padding: '0 28px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{ height: 7, width: i === step ? 24 : 7, borderRadius: 999, background: i === step ? 'var(--primary)' : 'var(--line)', transition: 'all .25s' }} />
          ))}
        </div>
        <Btn full icon={last ? IconCheck : undefined} onClick={() => last ? onDone() : setStep(step + 1)}>
          {last ? 'Kom i gang' : 'Neste'}
        </Btn>
      </div>
    </div>
  );
}

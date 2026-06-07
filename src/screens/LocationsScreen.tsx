import { useState, useEffect } from 'react';
import { useUiStore } from '../stores/ui';
import { useStockStore } from '../stores/stock';
import { useHouseholdStore } from '../stores/household';
import {
  IconChevL, IconCheck, IconPlus, IconTrash, IconPencil,
  IconLocFridge, IconLocFreezer, IconLocPantry, IconBox, IconHome,
} from '../components/icons';
import { Card } from '../components/Card';
import { Btn } from '../components/Btn';
import { Press } from '../components/Press';
import { Sheet } from '../components/Sheet';
import type { StorageLocation } from '../lib/friskr';
import { useLocationStore } from '../stores/locations';

const LOC_ICONS: Array<[string, string]> = [
  ['locFridge', 'Kjøleskap'],
  ['locFreezer', 'Fryser'],
  ['locPantry', 'Spiskammer'],
  ['box', 'Skap'],
  ['home', 'Annet'],
];

const ICON_COMPONENTS: Record<string, React.ComponentType<{ size?: number }>> = {
  locFridge: IconLocFridge,
  locFreezer: IconLocFreezer,
  locPantry: IconLocPantry,
  box: IconBox,
  home: IconHome,
};

function SwitchMini({ on }: { on: boolean }) {
  return (
    <span style={{ width: 44, height: 26, borderRadius: 999, background: on ? 'hsl(205 65% 48%)' : 'var(--line)', position: 'relative', flexShrink: 0, transition: 'background .18s', display: 'inline-block' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: '#fff', boxShadow: 'var(--shadow-sm)', transition: 'left .18s' }} />
    </span>
  );
}

interface LocationSheetProps {
  open: boolean;
  onClose: () => void;
  editId: string | null;
  initial: StorageLocation | null;
  onSave: (data: { label: string; icon: string; freezer: boolean }) => void;
  onDelete: () => void;
  canDelete: boolean;
}

function LocationSheet({ open, onClose, editId, initial, onSave, onDelete, canDelete }: LocationSheetProps) {
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('box');
  const [freezer, setFreezer] = useState(false);
  const [touchedIcon, setTouchedIcon] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(initial ? initial.label : '');
      setIcon(initial ? initial.icon : 'box');
      setFreezer(initial ? !!initial.freezer : false);
      setTouchedIcon(false);
    }
  }, [open, editId]);

  const toggleFreezer = (v: boolean) => {
    setFreezer(v);
    if (v && !touchedIcon) setIcon('locFreezer');
  };

  const valid = label.trim().length > 0;

  return (
    <Sheet open={open} onClose={onClose} title={editId ? 'Rediger plassering' : 'Ny plassering'}>
      <div style={{ paddingBottom: 6 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', margin: '4px 2px 7px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Navn</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '0 14px', boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
          <input
            value={label}
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
            placeholder="F.eks. Fryser i garasjen"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 15, color: 'var(--ink)', padding: '13px 0' }}
          />
        </div>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', margin: '0 2px 9px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Ikon</label>
        <div style={{ display: 'flex', gap: 9, marginBottom: 18, flexWrap: 'wrap' }}>
          {LOC_ICONS.map(([key, name]) => {
            const on = icon === key;
            const hue = freezer ? 205 : 150;
            const IconCmp = ICON_COMPONENTS[key];
            return (
              <Press
                key={key}
                onClick={() => { setIcon(key); setTouchedIcon(true); }}
                aria-label={name}
                style={{
                  width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: on ? `hsl(${hue} 60% 95%)` : 'var(--surface-2)',
                  color: on ? `hsl(${hue} 55% 42%)` : 'var(--ink-3)',
                  border: '1.5px solid ' + (on ? `hsl(${hue} 55% 60%)` : 'var(--line)'),
                }}
              >
                {IconCmp && <IconCmp size={24} />}
              </Press>
            );
          })}
        </div>

        {/* freezer toggle */}
        <Press
          onClick={() => toggleFreezer(!freezer)}
          style={{
            display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left',
            background: freezer ? 'color-mix(in srgb, hsl(205 70% 50%) 12%, var(--surface))' : 'var(--surface-2)',
            border: '1.5px solid ' + (freezer ? 'hsl(205 60% 65%)' : 'var(--line)'),
            borderRadius: 'var(--r-sm)', padding: '13px 14px', marginBottom: 8,
          }}
        >
          <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: freezer ? 'hsl(205 65% 92%)' : 'var(--surface)', color: freezer ? 'hsl(205 60% 42%)' : 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}>
            <IconLocFreezer size={22} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>Dette er en fryser</p>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>Varer her får forlenget holdbarhet, og «Best før» beholdes som notat.</p>
          </div>
          <SwitchMini on={freezer} />
        </Press>

        <div style={{ height: 12 }} />
        <Btn
          full
          icon={IconCheck}
          onClick={() => onSave({ label: label.trim(), icon, freezer })}
          style={{ opacity: valid ? 1 : 0.5, pointerEvents: valid ? 'auto' : 'none', marginBottom: editId ? 10 : 0 }}
        >
          {editId ? 'Lagre' : 'Legg til plassering'}
        </Btn>

        {editId && (
          <Press
            onClick={onDelete}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
              padding: '13px', borderRadius: 'var(--r-sm)',
              background: canDelete ? 'var(--expired-tint)' : 'var(--surface-2)',
              color: canDelete ? 'var(--expired)' : 'var(--ink-3)',
              fontSize: 14, fontWeight: 700,
            }}
          >
            <IconTrash size={18} /> {canDelete ? 'Slett plassering' : 'Tøm plasseringen for å slette'}
          </Press>
        )}
      </div>
    </Sheet>
  );
}

export function LocationsScreen() {
  const { setTab } = useUiStore();
  const { items } = useStockStore();
  const { household } = useHouseholdStore();
  const { locations, loading, load, create, update, remove } = useLocationStore();
  const [sheet, setSheet] = useState<{ id: string | null } | null>(null);

  useEffect(() => {
    if (!household) return;
    load(household.id).catch(console.error);
  }, [household?.id]);

  const counts: Record<string, number> = {};
  items.forEach((i) => { counts[i.loc] = (counts[i.loc] || 0) + 1; });

  const editing = sheet?.id ? locations.find((l) => l.id === sheet.id) ?? null : null;
  const openAdd = () => setSheet({ id: null });
  const openEdit = (id: string) => setSheet({ id });
  const close = () => setSheet(null);

  const save = async (data: { label: string; icon: string; freezer: boolean }) => {
    if (!household) return;
    if (sheet?.id) {
      await update(sheet.id, data);
    } else {
      await create(household.id, data);
    }
    close();
  };

  const del = async () => {
    if (!sheet?.id || !household) return;
    if ((counts[sheet.id] || 0) > 0) return;
    await remove(sheet.id);
    close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* SubHeader */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 'calc(8px + env(safe-area-inset-top)) 12px 6px' }}>
        <Press
          onClick={() => setTab('settings')}
          style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}
        >
          <IconChevL size={24} />
        </Press>
        <h1 style={{ margin: 0, flex: 1, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Plasseringer</h1>
      </div>

      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '4px 16px calc(24px + env(safe-area-inset-bottom))' }}>
        <p style={{ margin: '0 4px 16px', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          Steder du lagrer mat. Hver vare hører til én plassering — frysere forlenger holdbarheten automatisk.
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <span style={{ width: 28, height: 28, border: '3px solid var(--line)', borderTopColor: 'var(--primary)', borderRadius: 999, animation: 'friskr-spin .8s linear infinite' }} />
          </div>
        ) : (
          <Card pad={4} style={{ padding: '2px 14px', marginBottom: 16 }}>
            {locations.map((loc, i) => {
              const IconCmp = ICON_COMPONENTS[loc.icon] ?? IconBox;
              return (
                <div key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 4px', borderBottom: i === locations.length - 1 ? 'none' : '1px solid var(--line-2)' }}>
                  <span style={{ width: 42, height: 42, borderRadius: 12, background: `hsl(${loc.hue} 60% 95%)`, color: `hsl(${loc.hue} 55% 42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconCmp size={22} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{loc.label}</p>
                      {loc.freezer && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'hsl(205 65% 93%)', color: 'hsl(205 60% 40%)' }}>
                          <IconLocFreezer size={11} />FRYSER
                        </span>
                      )}
                    </div>
                    <p className="tnum" style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{counts[loc.id] || 0} varer</p>
                  </div>
                  {loc.householdId && (
                    <Press
                      onClick={() => openEdit(loc.id)}
                      style={{ width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}
                    >
                      <IconPencil size={17} />
                    </Press>
                  )}
                </div>
              );
            })}
          </Card>
        )}

        <Press
          onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 'var(--r-sm)', background: 'var(--surface)', border: '1.5px dashed var(--line)', color: 'var(--primary)', fontSize: 14, fontWeight: 700 }}
        >
          <IconPlus size={18} /> Legg til plassering
        </Press>
      </div>

      <LocationSheet
        open={!!sheet}
        onClose={close}
        editId={sheet?.id ?? null}
        initial={editing}
        onSave={save}
        onDelete={del}
        canDelete={!!(sheet?.id) && (counts[sheet.id] || 0) === 0 && locations.length > 1}
      />
    </div>
  );
}

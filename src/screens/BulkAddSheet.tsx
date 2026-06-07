import { useState } from 'react';
import type { ShoppingItem } from '../lib/friskr';
import type { CategoryId, LocationId } from '../lib/database.types';
import { useStockStore } from '../stores/stock';
import { useShoppingStore } from '../stores/shopping';
import { useHouseholdStore } from '../stores/household';
import { useUiStore } from '../stores/ui';
import { Sheet } from '../components/Sheet';
import { CatTile } from '../components/CatTile';
import { Press } from '../components/Press';
import { Btn } from '../components/Btn';
import { ICON_MAP } from '../components/icons';
import { IconCheck } from '../components/icons';
import { LOCATIONS } from '../lib/reference';

const FIELD_LABEL: React.CSSProperties = {
  display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)',
  textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 9px',
};

const EXPIRY_CHIPS = [
  { label: 'Ingen dato', days: 7 },
  { label: '+3 d', days: 3 },
  { label: '+1 uke', days: 7 },
  { label: '+2 uker', days: 14 },
];

interface BulkAddSheetProps {
  open: boolean;
  onClose: () => void;
  doneItems: ShoppingItem[];
}

export function BulkAddSheet({ open, onClose, doneItems }: BulkAddSheetProps) {
  const { household } = useHouseholdStore();
  const stockStore = useStockStore();
  const shoppingStore = useShoppingStore();
  const { showToast } = useUiStore();

  const [sharedLoc, setSharedLoc] = useState('kjoleskap');
  // Map of item.id -> selected days index (index into EXPIRY_CHIPS). Default: index 2 (+1 uke)
  const [itemDaysIdx, setItemDaysIdx] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const getItemDaysIdx = (itemId: string) => itemDaysIdx[itemId] ?? 2;

  const itemsWithProduct = doneItems.filter((it) => !!it.productId);

  const handleSave = async () => {
    if (!household) return;
    setLoading(true);
    try {
      await Promise.all(
        itemsWithProduct.map((item) => {
          const chipIdx = getItemDaysIdx(item.id);
          const chip = EXPIRY_CHIPS[chipIdx];
          // "Ingen dato" maps to off=7 as fallback
          const off = chip.days;
          const product = {
            id: item.productId!,
            name: item.name,
            brand: '',
            cat: item.cat as CategoryId,
            shelf: null,
          };
          return stockStore.save(household.id, {
            product,
            qty: item.qty,
            loc: sharedLoc as LocationId,
            off,
            note: null,
            price: null,
            editId: null,
            frozen: sharedLoc === 'fryser',
            bestForOff: null,
          });
        })
      );
      await shoppingStore.clearDone();
      showToast('Lagt til på lager', 'check');
      onClose();
    } catch {
      showToast('Noe gikk galt', 'x');
    } finally {
      setLoading(false);
    }
  };

  const locEntries = Object.entries(LOCATIONS);

  return (
    <Sheet open={open} onClose={onClose} title="Legg i lager" maxH={88}>
      {/* Shared location selector */}
      <label style={FIELD_LABEL}>Plassering</label>
      <div style={{ display: 'flex', gap: 9, marginBottom: 20 }}>
        {locEntries.map(([lk, meta]) => {
          const on = sharedLoc === lk;
          const LocIcon = ICON_MAP[meta.icon];
          return (
            <Press
              key={lk}
              onClick={() => setSharedLoc(lk)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '12px 4px', borderRadius: 'var(--r-sm)',
                background: on ? 'var(--primary-tint)' : 'var(--surface-2)',
                border: '1.5px solid ' + (on ? 'var(--primary)' : 'var(--line)'),
                color: on ? 'var(--on-primary-tint)' : 'var(--ink-2)',
              }}
            >
              {LocIcon && <LocIcon size={20} />}
              <span style={{ fontSize: 11.5, fontWeight: 700 }}>{meta.label}</span>
            </Press>
          );
        })}
      </div>

      {/* Item list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
        {doneItems.map((item) => {
          const hasProduct = !!item.productId;
          const selectedIdx = getItemDaysIdx(item.id);
          return (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: '1px solid var(--line-2)',
              }}
            >
              {/* Left: icon + name */}
              <CatTile cat={item.cat as CategoryId} size={34} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </p>

              {/* Right: expiry chips or manual badge */}
              {hasProduct ? (
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  {EXPIRY_CHIPS.map((chip, idx) => {
                    const on = selectedIdx === idx;
                    return (
                      <Press
                        key={chip.label}
                        onClick={() => setItemDaysIdx((prev) => ({ ...prev, [item.id]: idx }))}
                        style={{
                          padding: '5px 9px', borderRadius: 999,
                          fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                          background: on ? 'var(--primary)' : 'var(--surface-2)',
                          color: on ? 'var(--on-primary)' : 'var(--ink-2)',
                          border: '1px solid ' + (on ? 'var(--primary)' : 'var(--line)'),
                        }}
                      >
                        {chip.label}
                      </Press>
                    );
                  })}
                </div>
              ) : (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--ink-3)',
                  background: 'var(--surface-2)', border: '1px solid var(--line)',
                  borderRadius: 999, padding: '4px 10px', flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                  Legg til manuelt
                </span>
              )}
            </div>
          );
        })}
      </div>

      <Btn full icon={IconCheck} onClick={handleSave} disabled={loading || itemsWithProduct.length === 0}>
        {loading ? 'Lagrer…' : `Legg til lager (${itemsWithProduct.length})`}
      </Btn>
    </Sheet>
  );
}

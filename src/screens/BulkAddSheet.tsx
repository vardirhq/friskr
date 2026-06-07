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
import { IconCheck } from '../components/icons';
import { LOCATIONS } from '../lib/reference';

const EXPIRY_CHIPS = [
  { label: 'Ingen dato', days: 30 },
  { label: '+3 d', days: 3 },
  { label: '+1 uke', days: 7 },
  { label: '+2 uker', days: 14 },
];

const LOC_PILLS = [
  { key: 'kjoleskap', label: 'Kjøl.' },
  { key: 'fryser', label: 'Frys.' },
  { key: 'spiskammer', label: 'Spisk.' },
];

type ItemState = { loc: string; daysIdx: number };

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

  const [itemState, setItemState] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(false);

  const getState = (id: string): ItemState => itemState[id] ?? { loc: 'kjoleskap', daysIdx: 2 };
  const update = (id: string, patch: Partial<ItemState>) =>
    setItemState(prev => ({ ...prev, [id]: { ...getState(id), ...patch } }));

  const itemsWithProduct = doneItems.filter((it) => !!it.productId);

  const handleSave = async () => {
    if (!household) return;
    setLoading(true);
    try {
      await Promise.all(
        itemsWithProduct.map((item) => {
          const state = getState(item.id);
          const chip = EXPIRY_CHIPS[state.daysIdx];
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
            loc: state.loc as LocationId,
            off: chip.days,
            note: null,
            price: null,
            editId: null,
            frozen: LOCATIONS[state.loc]?.freezer ?? false,
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

  return (
    <Sheet open={open} onClose={onClose} title="Legg i lager" maxH={88}>
      <div style={{ marginBottom: 20 }}>
        {doneItems.map((item) => {
          const hasProduct = !!item.productId;
          const state = getState(item.id);

          return (
            <div
              key={item.id}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)',
                padding: '12px 14px',
                marginBottom: 8,
              }}
            >
              {/* Row 1: icon + name + qty badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: hasProduct ? 10 : 0 }}>
                <CatTile cat={item.cat as CategoryId} size={32} />
                <span style={{ fontSize: 14, fontWeight: 700, flex: 1, color: 'var(--ink-1)' }}>
                  {item.name}
                </span>
                {item.qty > 1 && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', flexShrink: 0 }}>
                    ×{item.qty}
                  </span>
                )}
              </div>

              {hasProduct ? (
                <>
                  {/* Row 2: location pills */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {LOC_PILLS.map(({ key, label }) => {
                      const on = state.loc === key;
                      return (
                        <Press
                          key={key}
                          onClick={() => update(item.id, { loc: key })}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: on ? 'var(--primary)' : 'var(--surface)',
                            color: on ? 'var(--on-primary)' : 'var(--ink-2)',
                            border: on ? 'none' : '1px solid var(--line)',
                          }}
                        >
                          {label}
                        </Press>
                      );
                    })}
                  </div>

                  {/* Row 3: expiry chips */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {EXPIRY_CHIPS.map((chip, idx) => {
                      const on = state.daysIdx === idx;
                      return (
                        <Press
                          key={chip.label}
                          onClick={() => update(item.id, { daysIdx: idx })}
                          style={{
                            padding: '5px 9px',
                            borderRadius: 999,
                            fontSize: 11.5,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
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
                </>
              ) : (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--ink-3)',
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

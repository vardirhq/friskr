import { useEffect } from 'react';
import { useAuthStore } from './stores/auth';
import { useHouseholdStore } from './stores/household';
import { useStockStore } from './stores/stock';
import { useSettingsStore } from './stores/settings';
import { useUiStore } from './stores/ui';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { HomeScreen } from './screens/HomeScreen';
import { StockScreen } from './screens/StockScreen';
import { ScanScreen } from './screens/ScanScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ShoppingScreen } from './screens/ShoppingScreen';
import { StatsScreen } from './screens/StatsScreen';
import { AccountScreen } from './screens/AccountScreen';
import { LocationsScreen } from './screens/LocationsScreen';
import { AddSheet } from './screens/AddSheet';
import { HouseholdScreen } from './screens/HouseholdScreen';
import { Onboarding } from './screens/Onboarding';
import { SignInScreen } from './screens/SignInScreen';
import { CreateOrJoinScreen } from './screens/CreateOrJoinScreen';

export default function App() {
  const { user: session, loading: authLoading, init } = useAuthStore();
  const { household, load: loadHousehold, loading: householdLoading } = useHouseholdStore();
  const stockStore = useStockStore();
  const { darkMode } = useSettingsStore();
  const { tab, sheet, toast, setTab, closeSheet, dismissToast } = useUiStore();

  // bootstrap
  useEffect(() => { init(); }, []);

  // dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', darkMode);
  }, [darkMode]);

  // load household once authed
  useEffect(() => {
    if (session) loadHousehold();
  }, [session]);

  // load stock + subscribe realtime once household is known
  useEffect(() => {
    if (!household) return;
    stockStore.load(household.id);
    stockStore.subscribeRealtime(household.id);
    return () => stockStore.unsubscribeRealtime();
  }, [household?.id]);

  // --- routing ---
  if (authLoading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
        <span style={{ width: 32, height: 32, border: '3px solid var(--line)', borderTopColor: 'var(--primary)', borderRadius: 999, animation: 'friskr-spin .8s linear infinite' }} />
      </div>
    );
  }

  if (!session) return <SignInScreen />;

  if (householdLoading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
        <span style={{ width: 32, height: 32, border: '3px solid var(--line)', borderTopColor: 'var(--primary)', borderRadius: 999, animation: 'friskr-spin .8s linear infinite' }} />
      </div>
    );
  }

  if (!household) return <CreateOrJoinScreen />;

  // resolve edit item for AddSheet
  const editItem = sheet?.type === 'edit'
    ? stockStore.items.find((i) => i.id === sheet.itemId) ?? null
    : null;

  const SCREENS = {
    home: HomeScreen,
    stock: StockScreen,
    scan: ScanScreen,
    products: ProductsScreen,
    settings: SettingsScreen,
    shopping: ShoppingScreen,
    stats: StatsScreen,
    account: AccountScreen,
    locations: LocationsScreen,
  };
  const ActiveScreen = SCREENS[tab];

  const MAIN_TABS = ['home', 'stock', 'scan', 'products', 'settings'];
  const isSubScreen = !MAIN_TABS.includes(tab);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--paper)', position: 'relative', overflow: 'hidden' }}>
      {isSubScreen ? (
        <ActiveScreen />
      ) : (
        <>
          {/* scrollable screen area */}
          <div className="noscroll" style={{ flex: 1, overflowY: 'auto', paddingBottom: 68 }}>
            <ActiveScreen />
          </div>

          <BottomNav tab={tab} onChange={setTab} />
        </>
      )}

      {/* overlays */}
      {(sheet?.type === 'add' || sheet?.type === 'edit') && (
        <AddSheet open onClose={closeSheet} editItem={editItem} />
      )}
      {sheet?.type === 'household' && (
        <HouseholdScreen onClose={closeSheet} />
      )}
      {sheet?.type === 'onboarding' && (
        <Onboarding onDone={closeSheet} />
      )}

      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </div>
  );
}

import { supabase } from './supabase';

export function subscribeHousehold(householdId: string, onChange: () => void) {
  const channel = supabase
    .channel(`household:${householdId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'stock_items',
      filter: `household_id=eq.${householdId}`,
    }, () => onChange())
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'household_members',
      filter: `household_id=eq.${householdId}`,
    }, () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

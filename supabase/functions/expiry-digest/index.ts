// supabase/functions/expiry-digest/index.ts
// ----------------------------------------------------------------------------
// Daily push/email digest of items expiring within 3 days, per household.
// Drives the bell / notifications surface in the app.
//
// Runs with the SERVICE ROLE (cron has no user JWT) so it can read every
// household — keep this function private; never expose the service key client-side.
//
// Schedule with pg_cron (see README) or an external scheduler hitting this URL.
// ----------------------------------------------------------------------------
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,   // bypasses RLS — server only
  );

  // Items expiring today..+3, still in stock, grouped by household.
  const { data, error } = await supabase
    .from("stock_status")
    .select("household_id, product_name, days_left, urgency")
    .eq("status", "in_stock")
    .lte("days_left", 3)
    .gte("days_left", 0)
    .order("household_id");

  if (error) return new Response(JSON.stringify({ error }), { status: 500 });

  const byHousehold = new Map<string, typeof data>();
  for (const row of data ?? []) {
    (byHousehold.get(row.household_id) ?? byHousehold.set(row.household_id, []).get(row.household_id)!)
      .push(row);
  }

  // TODO: integrate a push provider (Expo / FCM / APNs) or Resend email here.
  // For each household, look up household_members -> device tokens and send a
  // "N varer utløper snart" summary. Left as a provider-specific integration.
  const summary = [...byHousehold.entries()].map(([hid, items]) => ({
    household_id: hid,
    count: items.length,
    items: items.map((i) => i.product_name),
  }));

  return new Response(JSON.stringify({ digests: summary }), {
    headers: { "content-type": "application/json" },
  });
});

// supabase/functions/scan-lookup/index.ts
// ----------------------------------------------------------------------------
// Barcode -> product lookup for the Skann screen.
// 1. Try the local catalogue (products.barcode), respecting the caller's RLS.
// 2. Fall back to Open Food Facts and shape a draft product (NOT inserted —
//    the client confirms category/shelf-life, then inserts as a custom product).
//
// The prototype's scan is mocked; this is the real replacement.
// Deploy:  supabase functions deploy scan-lookup
// Invoke:  POST { "barcode": "7038010009457" }  with the user's bearer token.
// ----------------------------------------------------------------------------
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { barcode } = await req.json();
    if (!barcode) {
      return json({ error: "barcode required" }, 400);
    }

    // Caller-scoped client so catalogue + household custom rows respect RLS.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: hit } = await supabase
      .from("products")
      .select("id, name, brand, category_id, default_shelf_days, barcode")
      .eq("barcode", barcode)
      .limit(1)
      .maybeSingle();

    if (hit) return json({ source: "catalogue", product: hit });

    // Fallback: Open Food Facts (public, no key). Returns a DRAFT to confirm.
    const off = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands`,
    ).then((r) => r.json()).catch(() => null);

    if (off?.status === 1 && off.product?.product_name) {
      return json({
        source: "openfoodfacts",
        draft: {
          name: off.product.product_name,
          brand: off.product.brands ?? "",
          category_id: "annet",   // user re-categorises in the confirm sheet
          default_shelf_days: null,
          barcode,
        },
      });
    }

    return json({ source: "none", barcode }, 404);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

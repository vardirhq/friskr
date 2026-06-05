import type { FastifyInstance } from 'fastify';
import { or, isNull, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { products } from '../db/schema.js';

const OFF_API = 'https://world.openfoodfacts.org/api/v2/product';

const CAT_MAP: Record<string, string> = {
  'en:dairies': 'meieri', 'en:meats': 'kjott', 'en:fish': 'fisk',
  'en:fruits-and-vegetables': 'frukt', 'en:breads': 'brod',
  'en:beverages': 'drikke', 'en:snacks': 'snacks',
};

function offCategory(tags: string[]): string {
  for (const t of tags) { if (CAT_MAP[t]) return CAT_MAP[t]; }
  return 'annet';
}

export async function scanRoutes(app: FastifyInstance) {
  app.get('/scan', { preHandler: app.requireAuth }, async (req, reply) => {
    const { barcode } = req.query as { barcode?: string };
    const { householdId } = req.user;
    if (!barcode) return reply.code(400).send({ error: 'barcode required', code: 'INVALID_INPUT' });

    const catRows = await db
      .select()
      .from(products)
      .where(
        householdId
          ? or(isNull(products.householdId), eq(products.householdId, householdId))
          : isNull(products.householdId)
      );
    const found = catRows.find((p) => p.barcode === barcode);
    if (found) {
      return {
        source: 'catalogue',
        product: {
          id: found.id, name: found.name, brand: found.brand ?? '',
          cat: found.categoryId, shelf: found.defaultShelfDays ?? null,
          barcode: found.barcode, householdId: found.householdId ?? null,
        },
      };
    }

    try {
      const res = await fetch(`${OFF_API}/${barcode}?fields=product_name,brands,categories_tags,quantity`);
      if (res.ok) {
        const data = await res.json() as { status: number; product?: Record<string, unknown> };
        if (data.status === 1 && data.product) {
          const p = data.product;
          const cat = offCategory((p.categories_tags as string[]) ?? []);
          return {
            source: 'openfoodfacts',
            draft: {
              name: (p.product_name as string) ?? '',
              brand: (p.brands as string) ?? '',
              cat,
              shelf: null,
              barcode,
            },
          };
        }
      }
    } catch {
      // network error → fall through to 'none'
    }

    return { source: 'none', barcode };
  });
}

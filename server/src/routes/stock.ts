import type { FastifyInstance } from 'fastify';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { stockItems } from '../db/schema.js';

function mapRow(r: Record<string, unknown>) {
  const expiryDate = r.expiry_date ? new Date(r.expiry_date as string) : null;
  const bestForDate = r.best_for_date ? new Date(r.best_for_date as string) : null;
  const now = Date.now();
  const msPerDay = 86400000;
  const off = expiryDate ? Math.round((expiryDate.getTime() - now) / msPerDay) : null;
  const bestForOff = bestForDate ? Math.round((bestForDate.getTime() - now) / msPerDay) : null;
  return {
    id: r.id,
    pid: r.product_id,
    loc: r.location_id,
    qty: Number(r.quantity),
    off,
    expiryDate,
    frozen: r.frozen,
    bestForOff,
    bestForDate,
    note: r.note ?? null,
    price: r.price_nok != null ? Number(r.price_nok) : null,
    addedBy: r.added_by_name ?? null,
    status: r.status,
    product: {
      id: r.product_id,
      name: r.product_name,
      brand: r.product_brand ?? '',
      cat: r.category_id,
      shelf: null,
    },
  };
}

export async function stockRoutes(app: FastifyInstance) {
  app.get('/stock', { preHandler: app.requireAuth }, async (req) => {
    const { householdId } = req.user;
    if (!householdId) return [];

    const rows = await db.execute(sql`
      select si.*,
             p.name  as product_name,
             p.brand as product_brand,
             p.category_id,
             hm.display_name as added_by_name
      from stock_items si
      join products p on p.id = si.product_id
      left join household_members hm
        on hm.user_id = si.added_by
       and hm.household_id = si.household_id
      where si.household_id = ${householdId}
        and si.status = 'in_stock'
      order by si.expiry_date asc nulls last
    `);
    return rows.map(mapRow);
  });

  app.post('/stock', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId, userId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });
    const { productId, locationId, quantity, expiryDate, frozen, bestForDate, note, priceNok } =
      (req.body ?? {}) as Record<string, unknown>;

    if (!productId || !locationId || quantity == null) {
      return reply.code(400).send({ error: 'productId, locationId, quantity required', code: 'INVALID_INPUT' });
    }

    const [item] = await db
      .insert(stockItems)
      .values({
        householdId,
        productId: productId as string,
        locationId: locationId as string,
        quantity: String(quantity),
        expiryDate: (expiryDate as string) ?? null,
        frozen: (frozen as boolean) ?? false,
        bestForDate: (bestForDate as string) ?? null,
        note: (note as string) ?? null,
        priceNok: priceNok != null ? String(priceNok) : null,
        addedBy: userId,
      })
      .returning();

    const rows = await db.execute(sql`
      select si.*,
             p.name  as product_name,
             p.brand as product_brand,
             p.category_id,
             hm.display_name as added_by_name
      from stock_items si
      join products p on p.id = si.product_id
      left join household_members hm
        on hm.user_id = si.added_by
       and hm.household_id = si.household_id
      where si.id = ${item.id}
    `);
    return reply.code(201).send(mapRow(rows[0] as Record<string, unknown>));
  });

  app.put('/stock/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    const { id } = req.params as { id: string };
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const existing = await db.select().from(stockItems)
      .where(and(eq(stockItems.id, id), eq(stockItems.householdId, householdId)))
      .limit(1);
    if (!existing[0]) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });

    const { locationId, quantity, expiryDate, frozen, bestForDate, note, priceNok } =
      (req.body ?? {}) as Record<string, unknown>;

    await db.update(stockItems).set({
      ...(locationId != null && { locationId: locationId as string }),
      ...(quantity != null && { quantity: String(quantity) }),
      ...(expiryDate !== undefined && { expiryDate: expiryDate as string }),
      ...(frozen != null && { frozen: frozen as boolean }),
      ...(bestForDate !== undefined && { bestForDate: bestForDate as string }),
      ...(note !== undefined && { note: note as string }),
      ...(priceNok !== undefined && { priceNok: priceNok != null ? String(priceNok) : null }),
    }).where(eq(stockItems.id, id));

    const rows = await db.execute(sql`
      select si.*,
             p.name  as product_name,
             p.brand as product_brand,
             p.category_id,
             hm.display_name as added_by_name
      from stock_items si
      join products p on p.id = si.product_id
      left join household_members hm
        on hm.user_id = si.added_by
       and hm.household_id = si.household_id
      where si.id = ${id}
    `);
    return mapRow(rows[0] as Record<string, unknown>);
  });

  function setStatus(
    app: FastifyInstance,
    method: 'PATCH',
    path: string,
    status: 'used_up' | 'discarded' | 'in_stock'
  ) {
    app.route({
      method,
      url: path,
      preHandler: app.requireAuth,
      handler: async (req, reply) => {
        const { householdId } = req.user;
        const { id } = req.params as { id: string };
        const existing = await db.select().from(stockItems)
          .where(and(eq(stockItems.id, id), eq(stockItems.householdId, householdId!)))
          .limit(1);
        if (!existing[0]) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });
        await db.update(stockItems).set({
          status,
          resolvedAt: status === 'in_stock' ? null : new Date(),
        }).where(eq(stockItems.id, id));
        return { ok: true };
      },
    });
  }

  setStatus(app, 'PATCH', '/stock/:id/consume', 'used_up');
  setStatus(app, 'PATCH', '/stock/:id/discard', 'discarded');
  setStatus(app, 'PATCH', '/stock/:id/restore', 'in_stock');

  app.get('/stock/stats', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    const { since } = req.query as { since?: string };
    if (!householdId) return { saved: 0, savedKr: 0, wasted: 0 };
    if (!since) return reply.code(400).send({ error: 'since query param required', code: 'INVALID_INPUT' });

    const rows = await db
      .select({ status: stockItems.status, quantity: stockItems.quantity, priceNok: stockItems.priceNok })
      .from(stockItems)
      .where(and(
        eq(stockItems.householdId, householdId),
        gte(stockItems.resolvedAt, new Date(since))
      ));

    let saved = 0, savedKr = 0, wasted = 0;
    for (const r of rows) {
      if (r.status === 'used_up') {
        saved++;
        if (r.priceNok) savedKr += Number(r.priceNok) * Number(r.quantity);
      } else if (r.status === 'discarded') wasted++;
    }
    return { saved, savedKr, wasted };
  });
}

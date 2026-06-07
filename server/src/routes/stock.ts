import type { FastifyInstance } from 'fastify';
import { and, eq, sql } from 'drizzle-orm';
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

  app.get('/stock/stats', { preHandler: app.requireAuth }, async (req) => {
    const { householdId } = req.user;
    if (!householdId) {
      return {
        months: [],
        byCategory: [],
        totals: { saved: 0, wasted: 0, kr: 0 },
      };
    }

    // Generate the 6 month slots (current month + 5 prior)
    const now = new Date();
    const monthSlots: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthSlots.push(`${yyyy}-${mm}`);
    }

    // Monthly breakdown query
    const monthRows = await db.execute(sql`
      select
        to_char(date_trunc('month', si.resolved_at), 'YYYY-MM') as month,
        si.status,
        count(*)::int                                            as cnt,
        coalesce(sum(
          case when si.status = 'used_up'
            then cast(si.price_nok as float) * cast(si.quantity as float)
            else 0
          end
        ), 0)::float                                            as kr
      from stock_items si
      where si.household_id = ${householdId}
        and si.resolved_at >= now() - interval '6 months'
        and si.status in ('used_up', 'discarded')
      group by 1, 2
      order by 1
    `);

    // By-category query (discarded only, top 4)
    const catRows = await db.execute(sql`
      select
        p.category_id                as cat,
        count(*)::int                as wasted
      from stock_items si
      join products p on p.id = si.product_id
      where si.household_id = ${householdId}
        and si.resolved_at >= now() - interval '6 months'
        and si.status = 'discarded'
      group by p.category_id
      order by wasted desc
      limit 4
    `);

    // Build months map from query results
    type MonthEntry = { month: string; saved: number; wasted: number; kr: number };
    const monthMap = new Map<string, MonthEntry>();
    for (const slot of monthSlots) {
      monthMap.set(slot, { month: slot, saved: 0, wasted: 0, kr: 0 });
    }
    for (const r of monthRows) {
      const row = r as { month: string; status: string; cnt: number; kr: number };
      const entry = monthMap.get(row.month);
      if (!entry) continue;
      if (row.status === 'used_up') {
        entry.saved += row.cnt;
        entry.kr += Number(row.kr);
      } else if (row.status === 'discarded') {
        entry.wasted += row.cnt;
      }
    }

    const months = monthSlots.map((s) => monthMap.get(s)!);

    const totals = months.reduce(
      (acc, m) => ({ saved: acc.saved + m.saved, wasted: acc.wasted + m.wasted, kr: acc.kr + m.kr }),
      { saved: 0, wasted: 0, kr: 0 }
    );

    const byCategory = (catRows as unknown as Array<{ cat: string; wasted: number }>).map((r) => ({
      cat: r.cat,
      wasted: Number(r.wasted),
    }));

    return { months, byCategory, totals };
  });
}

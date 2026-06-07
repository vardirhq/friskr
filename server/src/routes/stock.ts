import type { FastifyInstance } from 'fastify';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { locations, products, stockItems } from '../db/schema.js';
import {
  optionalBoolean,
  optionalIsoDate,
  optionalMoney,
  optionalText,
  positiveNumber,
} from '../lib/validation.js';

function mapRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    pid: r.product_id,
    loc: r.location_id,
    qty: Number(r.quantity),
    off: r.days_left != null ? Number(r.days_left) : null,
    expiryDate: r.expiry_date ?? null,
    frozen: r.frozen,
    bestForOff: r.best_for_days_left != null ? Number(r.best_for_days_left) : null,
    bestForDate: r.best_for_date ?? null,
    note: r.note ?? null,
    price: r.price_nok != null ? Number(r.price_nok) : null,
    reminderDaysBefore: r.reminder_days_before != null ? Number(r.reminder_days_before) : null,
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

function parseReminderDays(value: unknown): number | null {
  if (value == null) return null;
  const days = Number(value);
  if (!Number.isInteger(days) || days < -1 || days > 14) {
    throw new Error('INVALID_REMINDER');
  }
  return days;
}

export async function stockRoutes(app: FastifyInstance) {
  app.get('/stock', { preHandler: app.requireAuth }, async (req) => {
    const { householdId } = req.user;
    if (!householdId) return [];

    const rows = await db.execute(sql`
      select si.*,
             si.expiry_date - current_date as days_left,
             si.best_for_date - current_date as best_for_days_left,
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
    const { productId, locationId, quantity, expiryDate, frozen, bestForDate, note, priceNok, reminderDaysBefore } =
      (req.body ?? {}) as Record<string, unknown>;

    if (!productId || !locationId || quantity == null) {
      return reply.code(400).send({ error: 'productId, locationId, quantity required', code: 'INVALID_INPUT' });
    }
    let parsedQuantity: number;
    let parsedExpiryDate: string | null;
    let parsedBestForDate: string | null;
    let parsedFrozen: boolean | undefined;
    let parsedPrice: number | null;
    let parsedNote: string | null;
    try {
      parsedQuantity = positiveNumber(quantity);
      parsedExpiryDate = optionalIsoDate(expiryDate);
      parsedBestForDate = optionalIsoDate(bestForDate);
      parsedFrozen = optionalBoolean(frozen);
      parsedPrice = optionalMoney(priceNok);
      parsedNote = optionalText(note, 1000);
    } catch {
      return reply.code(400).send({ error: 'Invalid stock item values', code: 'INVALID_INPUT' });
    }

    const [[product], [location]] = await Promise.all([
      db.select({ id: products.id }).from(products).where(and(
        eq(products.id, String(productId)),
        isNull(products.archivedAt),
        or(isNull(products.householdId), eq(products.householdId, householdId)),
      )).limit(1),
      db.select({ id: locations.id }).from(locations).where(and(
        eq(locations.id, String(locationId)),
        or(isNull(locations.householdId), eq(locations.householdId, householdId)),
      )).limit(1),
    ]);
    if (!product || !location) {
      return reply.code(400).send({ error: 'Invalid product or location', code: 'INVALID_INPUT' });
    }

    let reminder: number | null;
    try {
      reminder = parseReminderDays(reminderDaysBefore);
    } catch {
      return reply.code(400).send({ error: 'reminderDaysBefore must be null or an integer from -1 to 14', code: 'INVALID_INPUT' });
    }

    const [item] = await db
      .insert(stockItems)
      .values({
        householdId,
        productId: productId as string,
        locationId: locationId as string,
        quantity: String(parsedQuantity),
        expiryDate: parsedExpiryDate,
        frozen: parsedFrozen ?? false,
        bestForDate: parsedBestForDate,
        note: parsedNote,
        priceNok: parsedPrice != null ? String(parsedPrice) : null,
        reminderDaysBefore: reminder,
        addedBy: userId,
      })
      .returning();

    const rows = await db.execute(sql`
      select si.*,
             si.expiry_date - current_date as days_left,
             si.best_for_date - current_date as best_for_days_left,
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

    const { locationId, quantity, expiryDate, frozen, bestForDate, note, priceNok, reminderDaysBefore } =
      (req.body ?? {}) as Record<string, unknown>;

    let reminder: number | null | undefined;
    if (reminderDaysBefore !== undefined) {
      try {
        reminder = parseReminderDays(reminderDaysBefore);
      } catch {
        return reply.code(400).send({ error: 'reminderDaysBefore must be null or an integer from -1 to 14', code: 'INVALID_INPUT' });
      }
    }
    let parsedQuantity: number | undefined;
    let parsedExpiryDate: string | null | undefined;
    let parsedBestForDate: string | null | undefined;
    let parsedFrozen: boolean | undefined;
    let parsedPrice: number | null | undefined;
    let parsedNote: string | null | undefined;
    try {
      if (quantity != null) parsedQuantity = positiveNumber(quantity);
      if (expiryDate !== undefined) parsedExpiryDate = optionalIsoDate(expiryDate);
      if (bestForDate !== undefined) parsedBestForDate = optionalIsoDate(bestForDate);
      parsedFrozen = optionalBoolean(frozen);
      if (priceNok !== undefined) parsedPrice = optionalMoney(priceNok);
      if (note !== undefined) parsedNote = optionalText(note, 1000);
    } catch {
      return reply.code(400).send({ error: 'Invalid stock item values', code: 'INVALID_INPUT' });
    }
    if (locationId != null) {
      const [location] = await db.select({ id: locations.id }).from(locations).where(and(
        eq(locations.id, String(locationId)),
        or(isNull(locations.householdId), eq(locations.householdId, householdId)),
      )).limit(1);
      if (!location) return reply.code(400).send({ error: 'Invalid location', code: 'INVALID_INPUT' });
    }

    await db.update(stockItems).set({
      ...(locationId != null && { locationId: locationId as string }),
      ...(parsedQuantity !== undefined && { quantity: String(parsedQuantity) }),
      ...(parsedExpiryDate !== undefined && { expiryDate: parsedExpiryDate }),
      ...(parsedFrozen !== undefined && { frozen: parsedFrozen }),
      ...(parsedBestForDate !== undefined && { bestForDate: parsedBestForDate }),
      ...(parsedNote !== undefined && { note: parsedNote }),
      ...(parsedPrice !== undefined && { priceNok: parsedPrice != null ? String(parsedPrice) : null }),
      ...(reminderDaysBefore !== undefined && { reminderDaysBefore: reminder }),
    }).where(and(eq(stockItems.id, id), eq(stockItems.householdId, householdId)));

    const rows = await db.execute(sql`
      select si.*,
             si.expiry_date - current_date as days_left,
             si.best_for_date - current_date as best_for_days_left,
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
        }).where(and(eq(stockItems.id, id), eq(stockItems.householdId, householdId!)));
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

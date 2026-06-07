import type { FastifyInstance } from 'fastify';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { shoppingListItems } from '../db/schema.js';
import { broadcastChange } from '../plugins/notify.js';

function mapItem(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    productId: (r.product_id as string) ?? null,
    name: r.name as string,
    cat: r.cat as string,
    qty: Number(r.qty),
    done: r.done as boolean,
    auto: r.auto as boolean,
    addedBy: (r.added_by_name as string) ?? null,
  };
}

export async function shoppingRoutes(app: FastifyInstance) {
  // GET /shopping — list items (non-done + done from last 24h)
  app.get('/shopping', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const rows = await db.execute(sql`
      select
        sli.id,
        sli.product_id,
        sli.name,
        sli.cat,
        sli.qty,
        sli.done,
        sli.auto,
        hm.display_name as added_by_name
      from shopping_list_items sli
      left join household_members hm
        on hm.user_id = sli.added_by
       and hm.household_id = sli.household_id
      where sli.household_id = ${householdId}
        and (
          sli.done = false
          or sli.done_at >= now() - interval '24 hours'
        )
      order by
        sli.done asc,
        case when sli.done = false then sli.created_at end asc nulls last,
        case when sli.done = true then sli.done_at end desc nulls last
    `);

    return rows.map((r) => mapItem(r as Record<string, unknown>));
  });

  // POST /shopping — add item
  app.post('/shopping', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId, userId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const { name, cat, qty, productId, auto } = (req.body ?? {}) as Record<string, unknown>;
    if (!name) return reply.code(400).send({ error: 'name required', code: 'INVALID_INPUT' });

    const [item] = await db
      .insert(shoppingListItems)
      .values({
        householdId,
        productId: (productId as string) ?? null,
        name: name as string,
        cat: (cat as string) ?? 'annet',
        qty: qty != null ? Number(qty) : 1,
        auto: (auto as boolean) ?? false,
        addedBy: userId,
      })
      .returning();

    const rows = await db.execute(sql`
      select
        sli.id,
        sli.product_id,
        sli.name,
        sli.cat,
        sli.qty,
        sli.done,
        sli.auto,
        hm.display_name as added_by_name
      from shopping_list_items sli
      left join household_members hm
        on hm.user_id = sli.added_by
       and hm.household_id = sli.household_id
      where sli.id = ${item.id}
    `);

    broadcastChange(householdId);
    return reply.code(201).send(mapItem(rows[0] as Record<string, unknown>));
  });

  // PATCH /shopping/:id — update done/qty
  app.patch('/shopping/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const { id } = req.params as { id: string };
    const { done, qty } = (req.body ?? {}) as Record<string, unknown>;

    const existing = await db
      .select()
      .from(shoppingListItems)
      .where(and(eq(shoppingListItems.id, id), eq(shoppingListItems.householdId, householdId)))
      .limit(1);
    if (!existing[0]) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });

    await db.update(shoppingListItems).set({
      ...(done !== undefined && {
        done: done as boolean,
        doneAt: done ? new Date() : null,
      }),
      ...(qty != null && { qty: Number(qty) }),
    }).where(eq(shoppingListItems.id, id));

    broadcastChange(householdId);
    return { ok: true };
  });

  // DELETE /shopping/done — delete all done items (must be before /:id)
  app.delete('/shopping/done', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const deleted = await db
      .delete(shoppingListItems)
      .where(and(eq(shoppingListItems.householdId, householdId), eq(shoppingListItems.done, true)))
      .returning({ id: shoppingListItems.id });

    broadcastChange(householdId);
    return { deleted: deleted.length };
  });

  // DELETE /shopping/:id — delete single item
  app.delete('/shopping/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const { id } = req.params as { id: string };

    const existing = await db
      .select()
      .from(shoppingListItems)
      .where(and(eq(shoppingListItems.id, id), eq(shoppingListItems.householdId, householdId)))
      .limit(1);
    if (!existing[0]) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });

    await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));

    broadcastChange(householdId);
    return { ok: true };
  });

  // GET /shopping/suggestions — auto-suggest items based on recently consumed stock
  app.get('/shopping/suggestions', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const rows = await db.execute(sql`
      select distinct on (si.product_id)
        si.product_id   as "productId",
        p.name,
        p.category_id   as cat
      from stock_items si
      join products p on p.id = si.product_id
      where si.household_id = ${householdId}
        and si.status = 'used_up'
        and si.resolved_at >= now() - interval '30 days'
        and si.product_id not in (
          select product_id from stock_items
          where household_id = ${householdId} and status = 'in_stock'
        )
        and si.product_id not in (
          select product_id from shopping_list_items
          where household_id = ${householdId} and done = false and product_id is not null
        )
      order by si.product_id, si.resolved_at desc
      limit 8
    `);

    return rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        productId: row['productId'] as string,
        name: row.name as string,
        cat: row.cat as string,
      };
    });
  });
}

import type { FastifyInstance } from 'fastify';
import { and, count, eq, isNull, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { categories, products, shoppingListItems, stockItems } from '../db/schema.js';
import { optionalText } from '../lib/validation.js';

function mapProduct(product: typeof products.$inferSelect) {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand ?? '',
    cat: product.categoryId,
    shelf: product.defaultShelfDays,
    barcode: product.barcode,
    householdId: product.householdId,
    archived: product.archivedAt != null,
  };
}

function shelfDays(value: unknown): number | null {
  if (value == null || value === '') return null;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 0 || days > 3650) throw new Error('INVALID_SHELF');
  return days;
}

function barcodeValue(value: unknown): string | null {
  const barcode = optionalText(value, 64);
  if (barcode && !/^[A-Za-z0-9._-]+$/.test(barcode)) throw new Error('INVALID_BARCODE');
  return barcode;
}

export async function productsRoutes(app: FastifyInstance) {
  app.get('/products', { preHandler: app.requireAuth }, async (req) => {
    const { householdId } = req.user;
    const { includeArchived } = (req.query ?? {}) as { includeArchived?: string };
    const accessible = or(
      isNull(products.householdId),
      eq(products.householdId, householdId ?? ''),
    );
    const rows = await db.select().from(products).where(
      includeArchived === 'true'
        ? accessible
        : and(accessible, isNull(products.archivedAt)),
    );
    return rows.map(mapProduct);
  });

  app.post('/products', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const { name, brand, cat, shelf, barcode } = (req.body ?? {}) as Record<string, unknown>;
    let cleanName: string | null;
    let cleanBrand: string | null;
    let cleanCat: string | null;
    let cleanBarcode: string | null;
    try {
      cleanName = optionalText(name, 200);
      cleanBrand = optionalText(brand, 200);
      cleanCat = optionalText(cat, 50);
      cleanBarcode = barcodeValue(barcode);
    } catch {
      return reply.code(400).send({ error: 'Invalid product values', code: 'INVALID_INPUT' });
    }
    if (!cleanName || !cleanCat) {
      return reply.code(400).send({ error: 'name and cat required', code: 'INVALID_INPUT' });
    }
    const [category] = await db.select({ id: categories.id }).from(categories)
      .where(eq(categories.id, cleanCat)).limit(1);
    if (!category) return reply.code(400).send({ error: 'Invalid category', code: 'INVALID_INPUT' });
    let parsedShelf: number | null;
    try {
      parsedShelf = shelfDays(shelf);
    } catch {
      return reply.code(400).send({ error: 'shelf must be a whole number from 0 to 3650', code: 'INVALID_INPUT' });
    }

    const [product] = await db.insert(products).values({
      householdId,
      name: cleanName,
      brand: cleanBrand ?? '',
      categoryId: cleanCat,
      defaultShelfDays: parsedShelf,
      barcode: cleanBarcode,
    }).returning();

    return reply.code(201).send(mapProduct(product));
  });

  app.patch('/products/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    const { id } = req.params as { id: string };
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const [existing] = await db.select().from(products).where(
      and(eq(products.id, id), eq(products.householdId, householdId)),
    ).limit(1);
    if (!existing) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });

    const { name, brand, cat, shelf, barcode } = (req.body ?? {}) as Record<string, unknown>;
    let cleanName: string | null | undefined;
    let cleanBrand: string | null | undefined;
    let cleanCat: string | null | undefined;
    let cleanBarcode: string | null | undefined;
    try {
      cleanName = name !== undefined ? optionalText(name, 200) : undefined;
      cleanBrand = brand !== undefined ? optionalText(brand, 200) : undefined;
      cleanCat = cat !== undefined ? optionalText(cat, 50) : undefined;
      cleanBarcode = barcode !== undefined ? barcodeValue(barcode) : undefined;
    } catch {
      return reply.code(400).send({ error: 'Invalid product values', code: 'INVALID_INPUT' });
    }
    if (cleanName === null || cleanCat === null) {
      return reply.code(400).send({ error: 'name and cat cannot be empty', code: 'INVALID_INPUT' });
    }
    if (cleanCat !== undefined) {
      const [category] = await db.select({ id: categories.id }).from(categories)
        .where(eq(categories.id, cleanCat)).limit(1);
      if (!category) return reply.code(400).send({ error: 'Invalid category', code: 'INVALID_INPUT' });
    }
    let parsedShelf: number | null | undefined;
    if (shelf !== undefined) {
      try {
        parsedShelf = shelfDays(shelf);
      } catch {
        return reply.code(400).send({ error: 'shelf must be a whole number from 0 to 3650', code: 'INVALID_INPUT' });
      }
    }

    const [updated] = await db.update(products).set({
      ...(cleanName !== undefined && { name: cleanName }),
      ...(cleanBrand !== undefined && { brand: cleanBrand ?? '' }),
      ...(cleanCat !== undefined && { categoryId: cleanCat }),
      ...(shelf !== undefined && { defaultShelfDays: parsedShelf }),
      ...(cleanBarcode !== undefined && { barcode: cleanBarcode }),
    }).where(and(eq(products.id, id), eq(products.householdId, householdId))).returning();

    return mapProduct(updated);
  });

  app.delete('/products/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    const { id } = req.params as { id: string };
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const [existing] = await db.select().from(products).where(
      and(eq(products.id, id), eq(products.householdId, householdId)),
    ).limit(1);
    if (!existing) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });

    const [[stockRef], [shoppingRef]] = await Promise.all([
      db.select({ value: count() }).from(stockItems).where(eq(stockItems.productId, id)),
      db.select({ value: count() }).from(shoppingListItems).where(eq(shoppingListItems.productId, id)),
    ]);

    if (stockRef.value > 0 || shoppingRef.value > 0) {
      await db.update(products).set({ archivedAt: new Date() }).where(eq(products.id, id));
      return { disposition: 'archived' };
    }

    await db.delete(products).where(eq(products.id, id));
    return { disposition: 'deleted' };
  });

  app.post('/products/:id/restore', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    const { id } = req.params as { id: string };
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const [restored] = await db.update(products)
      .set({ archivedAt: null })
      .where(and(eq(products.id, id), eq(products.householdId, householdId)))
      .returning();
    if (!restored) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return mapProduct(restored);
  });
}

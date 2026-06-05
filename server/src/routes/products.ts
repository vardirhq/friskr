import type { FastifyInstance } from 'fastify';
import { or, isNull, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { products } from '../db/schema.js';

export async function productsRoutes(app: FastifyInstance) {
  app.get('/products', { preHandler: app.requireAuth }, async (req) => {
    const { householdId } = req.user;
    return db.select().from(products).where(
      or(isNull(products.householdId), eq(products.householdId, householdId ?? ''))
    );
  });

  app.post('/products', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const { name, brand, categoryId, defaultShelfDays, barcode } =
      (req.body ?? {}) as Record<string, unknown>;

    if (!name || !categoryId) {
      return reply.code(400).send({ error: 'name and categoryId required', code: 'INVALID_INPUT' });
    }

    const [prod] = await db.insert(products).values({
      householdId,
      name: name as string,
      brand: (brand as string) ?? '',
      categoryId: categoryId as string,
      defaultShelfDays: defaultShelfDays != null ? Number(defaultShelfDays) : null,
      barcode: (barcode as string) ?? null,
    }).returning();

    return reply.code(201).send(prod);
  });
}

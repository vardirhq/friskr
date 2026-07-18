import { buildApp } from '../index.js';
import { db } from '../db/client.js';
import {
  stockItems, shoppingListItems, householdMembers, locations, products,
  households, refreshTokens, otpCodes, users,
} from '../db/schema.js';
import { isNotNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

export async function createTestApp(
  configure?: (app: FastifyInstance) => void | Promise<void>,
): Promise<FastifyInstance> {
  const app = await buildApp({ logger: false });
  // Routes must be registered before the instance is ready/listening, so any
  // test-only routes are added here rather than after createTestApp returns.
  if (configure) await configure(app);
  await app.ready();
  return app;
}

export async function cleanDb() {
  await db.delete(shoppingListItems);
  await db.delete(stockItems);
  await db.delete(householdMembers);
  await db.delete(locations).where(isNotNull(locations.householdId));
  await db.delete(products).where(isNotNull(products.householdId));
  await db.delete(households);
  await db.delete(refreshTokens);
  await db.delete(otpCodes);
  await db.delete(users);
}

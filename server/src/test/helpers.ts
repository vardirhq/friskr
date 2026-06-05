import { buildApp } from '../index.js';
import { db } from '../db/client.js';
import {
  stockItems, householdMembers, locations, products,
  households, refreshTokens, otpCodes, users,
} from '../db/schema.js';
import { isNotNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({ logger: false });
  await app.ready();
  return app;
}

export async function cleanDb() {
  await db.delete(stockItems);
  await db.delete(householdMembers);
  await db.delete(locations).where(isNotNull(locations.householdId));
  await db.delete(products).where(isNotNull(products.householdId));
  await db.delete(households);
  await db.delete(refreshTokens);
  await db.delete(otpCodes);
  await db.delete(users);
}

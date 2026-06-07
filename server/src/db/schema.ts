import {
  pgTable, uuid, text, boolean, timestamp, date,
  numeric, integer, uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const otpCodes = pgTable('otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').notNull().default(false),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').notNull().default(false),
});

export const households = pgTable('households', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const householdMembers = pgTable('household_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  displayName: text('display_name'),
  colorHue: integer('color_hue').default(145),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('household_members_user_unique_idx').on(table.userId),
]);

export const householdInvites = pgTable('household_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  sentByUserId: uuid('sent_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  icon: text('icon').notNull(),
  hue: integer('hue').notNull().default(160),
  sort: integer('sort').notNull().default(100),
});

export const locations = pgTable('locations', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  icon: text('icon').notNull(),
  hue: integer('hue').notNull().default(160),
  sort: integer('sort').notNull().default(100),
  freezer: boolean('freezer').notNull().default(false),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  brand: text('brand').default(''),
  categoryId: text('category_id').notNull().references(() => categories.id),
  defaultShelfDays: integer('default_shelf_days'),
  barcode: text('barcode'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

export const stockItems = pgTable('stock_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  locationId: text('location_id').notNull().references(() => locations.id),
  quantity: numeric('quantity').notNull().default('1'),
  expiryDate: date('expiry_date'),
  frozen: boolean('frozen').notNull().default(false),
  bestForDate: date('best_for_date'),
  note: text('note'),
  priceNok: numeric('price_nok', { precision: 10, scale: 2 }),
  reminderDaysBefore: integer('reminder_days_before'),
  status: text('status').notNull().default('in_stock'),
  addedBy: uuid('added_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

export const shoppingListItems = pgTable('shopping_list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  cat: text('cat').notNull().default('annet'),
  qty: integer('qty').notNull().default(1),
  done: boolean('done').notNull().default(false),
  auto: boolean('auto').notNull().default(false),
  addedBy: uuid('added_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  doneAt: timestamp('done_at', { withTimezone: true }),
});

import { pgTable, text, integer, bigint, pgEnum, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const resourceStateEnum = pgEnum('resource_state', [
  'OPEN',
  'CLOSED',
]);

export const resources = pgTable(
  'resources',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    capacity: integer('capacity').notNull(),
    currentBookings: integer('current_bookings').notNull().default(0),
    version: integer('version').notNull().default(1),
    state: resourceStateEnum('state').notNull().default('OPEN'),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    stateIdx: index('resources_state_idx').on(table.state),
    // Data integrity constraints
    capacityPositive: check('capacity_positive', sql`capacity >= 1`),
    currentBookingsNonNegative: check('current_bookings_non_negative', sql`current_bookings >= 0`),
    bookingsWithinCapacity: check('bookings_within_capacity', sql`current_bookings <= capacity`),
  })
);

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

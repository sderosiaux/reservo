import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  pgEnum,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { resources } from './resources';

export const reservationStatusEnum = pgEnum('reservation_status', [
  'pending',
  'confirmed',
  'cancelled',
  'expired',
  'rejected',
]);

export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resourceId: text('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    clientId: text('client_id').notNull(),
    quantity: integer('quantity').notNull(),
    status: reservationStatusEnum('status').notNull().default('pending'),
    rejectionReason: text('rejection_reason'),
    serverTimestamp: bigint('server_timestamp', { mode: 'number' }).notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    // Single column indexes
    resourceIdIdx: index('reservations_resource_id_idx').on(table.resourceId),
    clientIdIdx: index('reservations_client_id_idx').on(table.clientId),
    serverTimestampIdx: index('reservations_server_timestamp_idx').on(table.serverTimestamp),
    statusIdx: index('reservations_status_idx').on(table.status),

    // Composite indexes for common query patterns
    resourceTimestampIdx: index('reservations_resource_timestamp_idx').on(table.resourceId, table.serverTimestamp),
    resourceStatusIdx: index('reservations_resource_status_idx').on(table.resourceId, table.status),
    statusTimestampIdx: index('reservations_status_timestamp_idx').on(table.status, table.serverTimestamp),

    // Data integrity constraints
    quantityPositive: check('quantity_positive', sql`quantity >= 1`),
    rejectionReasonConstraint: check(
      'rejection_reason_only_when_rejected',
      sql`(status = 'rejected' AND rejection_reason IS NOT NULL) OR (status != 'rejected' AND rejection_reason IS NULL)`
    ),
  })
);

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

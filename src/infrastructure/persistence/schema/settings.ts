import { pgTable, text, bigint } from 'drizzle-orm/pg-core';

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

// Well-known settings keys
export const SETTINGS_KEYS = {
  MAINTENANCE_MODE: 'maintenance_mode',
  MAINTENANCE_MESSAGE: 'maintenance_message',
} as const;

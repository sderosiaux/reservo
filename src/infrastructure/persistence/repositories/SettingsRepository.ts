import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { systemSettings, SETTINGS_KEYS } from '../schema/index.js';

export interface MaintenanceStatus {
  enabled: boolean;
  message: string | null;
  updatedAt: number | null;
}

export interface SettingsRepositoryConfig {
  maintenanceCacheTtlMs: number; // Cache TTL in milliseconds
}

const DEFAULT_CONFIG: SettingsRepositoryConfig = {
  maintenanceCacheTtlMs: 30000, // 30 seconds - maintenance mode rarely changes
};

/**
 * SettingsRepository
 *
 * Provides access to system settings with caching for frequently accessed values.
 *
 * Performance optimization: Maintenance status is cached to avoid 2 DB queries
 * on every reservation request. Cache is automatically invalidated when
 * maintenance mode is changed via setMaintenanceMode().
 */
export class SettingsRepository {
  private maintenanceCache: MaintenanceStatus | null = null;
  private maintenanceCacheExpiresAt = 0;
  private config: SettingsRepositoryConfig;

  constructor(config: Partial<SettingsRepositoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get maintenance status with caching.
   * Returns cached value if available and not expired.
   */
  async getMaintenanceStatus(): Promise<MaintenanceStatus> {
    const now = Date.now();

    // Return cached value if valid
    if (this.maintenanceCache && this.maintenanceCacheExpiresAt > now) {
      return this.maintenanceCache;
    }

    // Fetch from database
    const [modeRow, messageRow] = await Promise.all([
      db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, SETTINGS_KEYS.MAINTENANCE_MODE))
        .limit(1),
      db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, SETTINGS_KEYS.MAINTENANCE_MESSAGE))
        .limit(1),
    ]);

    const status: MaintenanceStatus = {
      enabled: modeRow[0]?.value === 'true',
      message: messageRow[0]?.value || null,
      updatedAt: modeRow[0]?.updatedAt || null,
    };

    // Update cache
    this.maintenanceCache = status;
    this.maintenanceCacheExpiresAt = now + this.config.maintenanceCacheTtlMs;

    return status;
  }

  /**
   * Set maintenance mode and invalidate cache.
   */
  async setMaintenanceMode(enabled: boolean, message?: string): Promise<MaintenanceStatus> {
    const now = Date.now();

    // Invalidate cache before making changes
    this.invalidateCache();

    // Upsert maintenance mode
    await db
      .insert(systemSettings)
      .values({
        key: SETTINGS_KEYS.MAINTENANCE_MODE,
        value: String(enabled),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: String(enabled),
          updatedAt: now,
        },
      });

    // Upsert maintenance message if provided
    if (message !== undefined) {
      await db
        .insert(systemSettings)
        .values({
          key: SETTINGS_KEYS.MAINTENANCE_MESSAGE,
          value: message,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: message,
            updatedAt: now,
          },
        });
    }

    // Build new status and cache it
    const currentMessage = message ?? (await this.getMaintenanceStatusFromDb()).message;
    const status: MaintenanceStatus = {
      enabled,
      message: currentMessage,
      updatedAt: now,
    };

    // Update cache with new value
    this.maintenanceCache = status;
    this.maintenanceCacheExpiresAt = now + this.config.maintenanceCacheTtlMs;

    return status;
  }

  /**
   * Invalidate the maintenance status cache.
   * Call this if maintenance mode is changed externally.
   */
  invalidateCache(): void {
    this.maintenanceCache = null;
    this.maintenanceCacheExpiresAt = 0;
  }

  /**
   * Get maintenance status directly from DB (bypasses cache).
   * Used internally to get current message when only mode is changed.
   */
  private async getMaintenanceStatusFromDb(): Promise<MaintenanceStatus> {
    const [modeRow, messageRow] = await Promise.all([
      db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, SETTINGS_KEYS.MAINTENANCE_MODE))
        .limit(1),
      db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, SETTINGS_KEYS.MAINTENANCE_MESSAGE))
        .limit(1),
    ]);

    return {
      enabled: modeRow[0]?.value === 'true',
      message: messageRow[0]?.value || null,
      updatedAt: modeRow[0]?.updatedAt || null,
    };
  }

  async isMaintenanceMode(): Promise<boolean> {
    const status = await this.getMaintenanceStatus();
    return status.enabled;
  }
}

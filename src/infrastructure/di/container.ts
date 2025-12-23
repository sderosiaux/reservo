/**
 * Service Container (Simple Dependency Injection)
 *
 * Provides singleton instances of services to ensure:
 * - Single cache instance across all routes (critical for AvailabilityViewService)
 * - Proper connection pooling
 * - Testability through dependency injection
 */

import { ResourceRepository, ReservationRepository, SettingsRepository } from '../persistence/repositories/index.js';
import { AvailabilityViewService } from '../../application/services/index.js';
import { ReservationCommitService } from '../../application/services/ReservationCommitService.js';
import { ReservationCancellationService } from '../../application/services/ReservationCancellationService.js';
import { getDb } from '../persistence/db.js';

class ServiceContainer {
  private static instance: ServiceContainer | null = null;

  // Repository singletons
  private _resourceRepo: ResourceRepository | null = null;
  private _reservationRepo: ReservationRepository | null = null;
  private _settingsRepo: SettingsRepository | null = null;

  // Service singletons
  private _availabilityService: AvailabilityViewService | null = null;
  private _commitService: ReservationCommitService | null = null;
  private _cancellationService: ReservationCancellationService | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Reset container (useful for testing)
   */
  static reset(): void {
    ServiceContainer.instance = null;
  }

  // ============ Repositories ============

  get resourceRepo(): ResourceRepository {
    if (!this._resourceRepo) {
      this._resourceRepo = new ResourceRepository();
    }
    return this._resourceRepo;
  }

  get reservationRepo(): ReservationRepository {
    if (!this._reservationRepo) {
      this._reservationRepo = new ReservationRepository();
    }
    return this._reservationRepo;
  }

  get settingsRepo(): SettingsRepository {
    if (!this._settingsRepo) {
      this._settingsRepo = new SettingsRepository();
    }
    return this._settingsRepo;
  }

  // ============ Services ============

  /**
   * Singleton AvailabilityViewService
   * CRITICAL: Must be singleton to share cache across all routes
   */
  get availabilityService(): AvailabilityViewService {
    if (!this._availabilityService) {
      this._availabilityService = new AvailabilityViewService(this.resourceRepo, {
        cacheTtlMs: parseInt(process.env.CACHE_TTL_MS || '5000', 10),
        maxCacheSize: parseInt(process.env.CACHE_MAX_SIZE || '10000', 10)
      });
    }
    return this._availabilityService;
  }

  /**
   * ReservationCommitService
   * Uses shared repositories for consistency
   * Receives availabilityService for cache invalidation on commit
   */
  get commitService(): ReservationCommitService {
    if (!this._commitService) {
      this._commitService = new ReservationCommitService(
        getDb(),
        this.resourceRepo,
        this.reservationRepo,
        this.availabilityService
      );
    }
    return this._commitService;
  }

  /**
   * ReservationCancellationService
   * Uses shared repositories for consistency
   * Receives availabilityService for cache invalidation on cancel
   */
  get cancellationService(): ReservationCancellationService {
    if (!this._cancellationService) {
      this._cancellationService = new ReservationCancellationService(
        getDb(),
        this.resourceRepo,
        this.reservationRepo,
        this.availabilityService
      );
    }
    return this._cancellationService;
  }
}

// Export singleton accessor
export const container = ServiceContainer.getInstance();

// Export class for testing
export { ServiceContainer };

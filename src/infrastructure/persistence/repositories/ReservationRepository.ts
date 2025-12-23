/**
 * ReservationRepository - Persistence layer for Reservation entities
 */

import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import { db } from '../db.js';
import { reservations } from '../schema/index.js';
import { Reservation } from '../../../domain/entities/Reservation.js';
import { ReservationId, ResourceId } from '../../../domain/value-objects/index.js';
import { reservationToDomain, reservationToDbInsert, reservationToDbUpdate } from './mappers.js';
import * as schema from '../schema/index.js';

export type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  any
>;

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'rejected';

export interface FindAllReservationsOptions {
  limit?: number;
  offset?: number;
  status?: ReservationStatus;
  resourceId?: string;
  clientId?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
}

export interface FindAllReservationsResult {
  reservations: Reservation[];
  total: number;
}

export interface ClientAggregate {
  clientId: string;
  totalReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
  rejectedReservations: number;
  totalQuantity: number;
  lastReservationAt: number;
}

export interface AnalyticsData {
  totalReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
  rejectedReservations: number;
  totalQuantity: number;
  uniqueClients: number;
  resourceUtilization: Array<{
    resourceId: string;
    reservationCount: number;
    totalQuantity: number;
  }>;
}

export interface IReservationRepository {
  findById(id: ReservationId): Promise<Reservation | null>;
  findByIdForUpdate(id: ReservationId, tx: Transaction): Promise<Reservation | null>;
  findByResourceId(resourceId: ResourceId): Promise<Reservation[]>;
  findAll(options?: FindAllReservationsOptions): Promise<FindAllReservationsResult>;
  getClientAggregates(): Promise<ClientAggregate[]>;
  getAnalytics(): Promise<AnalyticsData>;
  save(reservation: Reservation, tx?: Transaction): Promise<Reservation>;
  countActiveByResourceId(resourceId: ResourceId, tx?: Transaction): Promise<number>;
  sumActiveQuantityByResourceId(resourceId: ResourceId, tx?: Transaction): Promise<number>;
}

export class ReservationRepository implements IReservationRepository {
  /**
   * Find a reservation by ID
   */
  async findById(id: ReservationId): Promise<Reservation | null> {
    const result = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return reservationToDomain(result[0]);
  }

  /**
   * Find a reservation by ID with row-level lock (FOR UPDATE)
   * CRITICAL: This prevents concurrent modifications during atomic cancellations
   */
  async findByIdForUpdate(id: ReservationId, tx: Transaction): Promise<Reservation | null> {
    const result = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, id))
      .for('update')
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return reservationToDomain(result[0]);
  }

  /**
   * Find all reservations for a specific resource
   */
  async findByResourceId(resourceId: ResourceId): Promise<Reservation[]> {
    const result = await db
      .select()
      .from(reservations)
      .where(eq(reservations.resourceId, resourceId))
      .orderBy(reservations.serverTimestamp);

    return result.map(reservationToDomain);
  }

  /**
   * Find all reservations with optional filtering and pagination
   */
  async findAll(options: FindAllReservationsOptions = {}): Promise<FindAllReservationsResult> {
    const { limit = 100, offset = 0, status, resourceId, clientId, fromTimestamp, toTimestamp } = options;

    const conditions = [];
    if (status) {
      conditions.push(eq(reservations.status, status));
    }
    if (resourceId) {
      conditions.push(eq(reservations.resourceId, resourceId));
    }
    if (clientId) {
      conditions.push(eq(reservations.clientId, clientId));
    }
    if (fromTimestamp) {
      conditions.push(gte(reservations.serverTimestamp, fromTimestamp));
    }
    if (toTimestamp) {
      conditions.push(lte(reservations.serverTimestamp, toTimestamp));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(reservations)
        .where(whereClause)
        .orderBy(desc(reservations.serverTimestamp))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
        .from(reservations)
        .where(whereClause),
    ]);

    return {
      reservations: items.map(reservationToDomain),
      total: countResult[0]?.count ?? 0,
    };
  }

  /**
   * Get aggregated client statistics from reservations
   */
  async getClientAggregates(): Promise<ClientAggregate[]> {
    const result = await db
      .select({
        clientId: reservations.clientId,
        totalReservations: sql<number>`CAST(COUNT(*) AS INTEGER)`,
        confirmedReservations: sql<number>`CAST(COUNT(CASE WHEN ${reservations.status} = 'confirmed' THEN 1 END) AS INTEGER)`,
        cancelledReservations: sql<number>`CAST(COUNT(CASE WHEN ${reservations.status} = 'cancelled' THEN 1 END) AS INTEGER)`,
        rejectedReservations: sql<number>`CAST(COUNT(CASE WHEN ${reservations.status} = 'rejected' THEN 1 END) AS INTEGER)`,
        totalQuantity: sql<number>`CAST(COALESCE(SUM(${reservations.quantity}), 0) AS INTEGER)`,
        lastReservationAt: sql<number>`MAX(${reservations.serverTimestamp})`,
      })
      .from(reservations)
      .groupBy(reservations.clientId)
      .orderBy(desc(sql`MAX(${reservations.serverTimestamp})`));

    return result;
  }

  /**
   * Get analytics data for the dashboard
   */
  async getAnalytics(): Promise<AnalyticsData> {
    const [stats, resourceStats] = await Promise.all([
      db
        .select({
          totalReservations: sql<number>`CAST(COUNT(*) AS INTEGER)`,
          confirmedReservations: sql<number>`CAST(COUNT(CASE WHEN ${reservations.status} = 'confirmed' THEN 1 END) AS INTEGER)`,
          cancelledReservations: sql<number>`CAST(COUNT(CASE WHEN ${reservations.status} = 'cancelled' THEN 1 END) AS INTEGER)`,
          rejectedReservations: sql<number>`CAST(COUNT(CASE WHEN ${reservations.status} = 'rejected' THEN 1 END) AS INTEGER)`,
          totalQuantity: sql<number>`CAST(COALESCE(SUM(${reservations.quantity}), 0) AS INTEGER)`,
          uniqueClients: sql<number>`CAST(COUNT(DISTINCT ${reservations.clientId}) AS INTEGER)`,
        })
        .from(reservations),
      db
        .select({
          resourceId: reservations.resourceId,
          reservationCount: sql<number>`CAST(COUNT(*) AS INTEGER)`,
          totalQuantity: sql<number>`CAST(COALESCE(SUM(${reservations.quantity}), 0) AS INTEGER)`,
        })
        .from(reservations)
        .where(eq(reservations.status, 'confirmed'))
        .groupBy(reservations.resourceId)
        .orderBy(desc(sql`COUNT(*)`)),
    ]);

    const stat = stats[0];
    return {
      totalReservations: stat?.totalReservations ?? 0,
      confirmedReservations: stat?.confirmedReservations ?? 0,
      cancelledReservations: stat?.cancelledReservations ?? 0,
      rejectedReservations: stat?.rejectedReservations ?? 0,
      totalQuantity: stat?.totalQuantity ?? 0,
      uniqueClients: stat?.uniqueClients ?? 0,
      resourceUtilization: resourceStats,
    };
  }

  /**
   * Save a new reservation or update an existing one
   * Supports transaction context for atomic operations
   */
  async save(reservation: Reservation, tx?: Transaction): Promise<Reservation> {
    const dbReservation = reservationToDbInsert(reservation);
    const executor = tx || db;

    const result = await executor
      .insert(reservations)
      .values(dbReservation)
      .onConflictDoUpdate({
        target: reservations.id,
        set: reservationToDbUpdate(reservation),
      })
      .returning();

    return reservationToDomain(result[0]);
  }

  /**
   * Count active (confirmed) reservations for a specific resource
   * CRITICAL: This is used to validate capacity during commits
   */
  async countActiveByResourceId(resourceId: ResourceId, tx?: Transaction): Promise<number> {
    const executor = tx || db;

    const result = await executor
      .select({
        count: sql<number>`CAST(COUNT(*) AS INTEGER)`,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.resourceId, resourceId),
          eq(reservations.status, 'confirmed')
        )
      );

    return result[0]?.count ?? 0;
  }

  /**
   * Sum total booked quantity for confirmed reservations on a resource
   * CRITICAL: Used for counter validation to detect drift between
   * resource.currentBookings and actual reservation quantities
   */
  async sumActiveQuantityByResourceId(resourceId: ResourceId, tx?: Transaction): Promise<number> {
    const executor = tx || db;

    const result = await executor
      .select({
        totalQuantity: sql<number>`CAST(COALESCE(SUM(${reservations.quantity}), 0) AS INTEGER)`,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.resourceId, resourceId),
          eq(reservations.status, 'confirmed')
        )
      );

    return result[0]?.totalQuantity ?? 0;
  }
}

/**
 * Factory function to create a ReservationRepository instance
 */
export function createReservationRepository(): IReservationRepository {
  return new ReservationRepository();
}

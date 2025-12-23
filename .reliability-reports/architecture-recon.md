# Reservo Architecture Reconnaissance Report

## Executive Summary

**Reservo** is a strong-consistency reservation engine for small B2C/SMB events (meetups, trainings, restaurants, local transport). It guarantees **zero overbooking** through atomic database transactions with row-level locking, combined with eventually-consistent availability views for UX.

**Codebase**: ~3,570 LOC (TypeScript), well-layered clean architecture.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ (ES2022 modules) |
| Web Framework | Fastify 5.x |
| Database | PostgreSQL 16 with Drizzle ORM |
| Validation | Zod |
| Logging | Pino |
| Testing | Vitest + Playwright |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT TIER                                │
│  Browser / Mobile App / Admin Dashboard                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/HTTPS
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  APPLICATION TIER (Fastify)                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ HTTP Server (Single-threaded event loop)                   │ │
│  │  - CORS + Compression middleware                           │ │
│  │  - Auth (API key) middleware                               │ │
│  │  - Error handler (typed error mapping)                     │ │
│  └──────────────────┬─────────────────────────────────────────┘ │
│                     │                                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Application Services                                       │ │
│  │  ├─ ReservationCommitService (FOR UPDATE lock)            │ │
│  │  ├─ ReservationCancellationService                        │ │
│  │  └─ AvailabilityViewService (LRU cache, 5s TTL)          │ │
│  └─────────────────┬──────────────────────────────────────────┘ │
│                    │                                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Repositories (Data Access)                                 │ │
│  │  ├─ ResourceRepository (findByIdForUpdate)                │ │
│  │  ├─ ReservationRepository                                  │ │
│  │  └─ SettingsRepository (cached)                           │ │
│  └─────────────────┬──────────────────────────────────────────┘ │
│                    │                                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ In-Memory State (Per Instance)                             │ │
│  │  ├─ AvailabilityViewService cache (LRU)                   │ │
│  │  └─ SettingsRepository cache (maintenance mode)           │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ TCP (postgres-js)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   DATABASE TIER (PostgreSQL)                    │
│  ├─ resources (state, currentBookings counter)                 │
│  ├─ reservations (immutable history)                           │
│  └─ system_settings (configuration)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Critical Files (20)

| # | File | Risk | Purpose |
|---|------|------|---------|
| 1 | ReservationCommitService.ts | CRITICAL | Atomic commit with FOR UPDATE lock |
| 2 | ResourceRepository.ts | CRITICAL | Row lock implementation |
| 3 | ReservationRepository.ts | HIGH | Save/query reservations |
| 4 | reservations.ts (schema) | HIGH | DB constraints, indexes |
| 5 | reservations.ts (routes) | HIGH | POST /commit endpoint |
| 6 | AvailabilityViewService.ts | MEDIUM | LRU cache |
| 7 | availability.ts (routes) | MEDIUM | Cache invalidation |
| 8 | ReservationCancellationService.ts | MEDIUM | Atomic cancel |
| 9 | db.ts | MEDIUM | Connection pool |
| 10 | server.ts | MEDIUM | Fastify setup |
| 11 | auth.ts | MEDIUM | API key auth |
| 12 | SettingsRepository.ts | MEDIUM | Settings cache |
| 13 | resources.ts (schema) | MEDIUM | DB constraints |
| 14 | analytics.ts (routes) | MEDIUM | GROUP BY queries |
| 15 | Resource.ts (entity) | LOW | Immutable entity |
| 16 | Reservation.ts (entity) | LOW | Immutable entity |
| 17 | container.ts | LOW | DI singleton |
| 18 | errorHandler.ts | LOW | Error mapping |
| 19 | resources.ts (routes) | LOW | CRUD |
| 20 | errors.ts | LOW | Domain errors |

---

## Key Concurrency Patterns

### 1. Atomic Write with FOR UPDATE Lock
```typescript
await db.transaction(async (tx) => {
  const resource = await findByIdForUpdate(resourceId, tx);  // LOCK
  if (!canAccommodate(resource, quantity)) reject();
  await reservationRepo.save(reservation, tx);
  await resourceRepo.updateWithOptimisticLock(resource, tx);
});
```

### 2. Eventual Consistency Cache (5s TTL)
```typescript
const cached = cache.get(resourceId);
if (cached && !expired) return cached;  // May be stale
return fetchFromDB();
```

### 3. Optimistic Locking (Version Check)
```typescript
UPDATE resources SET ... WHERE id = ? AND version = ?
```

---

## Multi-Instance Deployment Risks

| Risk | Severity | Issue |
|------|----------|-------|
| Cache Incoherence | CRITICAL | Each instance has own LRU cache |
| No Connection Proxy | HIGH | Each instance has 50-connection pool |
| No Graceful Shutdown | HIGH | In-flight requests aborted |
| No Statement Timeout | HIGH | Slow queries block event loop |
| Settings Cache | MEDIUM | Maintenance mode not instant |

---

## Storage Access Patterns

### Writes (Hot)
- Commit: SELECT FOR UPDATE + INSERT + UPDATE (row lock)
- Cancel: UPDATE reservation + UPDATE resource (row lock)

### Reads
- Availability: Cached (5s TTL), eventually consistent
- Analytics: Full table scan GROUP BY

### Indexes
- reservations: (resourceId, serverTimestamp), (resourceId, status), (status, serverTimestamp), (clientId)
- resources: (state)
- Missing: No index on resources(type)

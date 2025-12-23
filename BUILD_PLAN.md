# Build Plan - Reservation Engine v2

## Vue d'ensemble

Plan de construction en **4 phases** progressives. Chaque phase produit une valeur utilisable.

---

## Phase 1 : Core Engine (Fondations)

**Objectif** : Moteur fonctionnel minimal capable de réserver une ressource.

### 1.1 Setup projet

- [ ] Initialisation Node.js/TypeScript
- [ ] Configuration ESLint + Prettier
- [ ] Structure dossiers (`src/`, `tests/`, `scripts/`)
- [ ] Docker Compose pour dev (PostgreSQL)

### 1.2 Domain Model

- [ ] Entity `Resource` (id, type, capacity, version, state)
- [ ] Entity `Reservation` (id, resource_id, client_id, quantity, status, server_timestamp)
- [ ] Value Objects (ResourceId, ClientId, Quantity)
- [ ] Domain Events (ReservationConfirmed, ReservationRejected)

### 1.3 Persistence

- [ ] Schema PostgreSQL avec versioning optimiste
- [ ] Repository `ResourceRepository`
- [ ] Repository `ReservationRepository`
- [ ] Migrations avec versioning

### 1.4 Reservation Commit (coeur)

- [ ] Service `ReservationCommitService`
- [ ] Logique d'arbitrage atomique (transaction + row lock)
- [ ] Gestion du timestamp serveur comme autorité
- [ ] Codes de refus : `RESOURCE_FULL`, `RESOURCE_CLOSED`, `INVALID_STATE`

### 1.5 Tests critiques

- [ ] Tests unitaires domain
- [ ] Tests d'intégration commit atomique
- [ ] **Tests de concurrence** (simulations multi-threads)
- [ ] Vérification : jamais de surbooking

**Livrable Phase 1** : Service standalone qui réserve sans surbooking.

---

## Phase 2 : API Layer

**Objectif** : Exposer le moteur via REST API.

### 2.1 HTTP Framework

- [ ] Setup Fastify (performance + validation schema)
- [ ] Structure routes
- [ ] Middleware error handling unifié

### 2.2 Endpoints

- [ ] `POST /resources` - Création ressource (admin)
- [ ] `GET /resources/:id` - Lecture ressource
- [ ] `GET /availability?resource_id=` - Vue disponibilité (cacheable)
- [ ] `POST /reservations` - Commit réservation
- [ ] `GET /reservations/:id` - Lecture réservation

### 2.3 Validation & Sécurité

- [ ] JSON Schema validation sur inputs
- [ ] Rate limiting basique
- [ ] Headers de sécurité
- [ ] Pas d'exposition détails internes dans erreurs

### 2.4 Availability View

- [ ] Service `AvailabilityViewService`
- [ ] Cache en mémoire avec TTL configurable
- [ ] Invalidation sur events
- [ ] Header `X-Cache-Status` pour debug

### 2.5 Documentation

- [ ] OpenAPI spec auto-générée
- [ ] Exemples de requêtes/réponses

**Livrable Phase 2** : API REST fonctionnelle et documentée.

---

## Phase 3 : Observabilité & Robustesse

**Objectif** : Production-ready avec logs et monitoring.

### 3.1 Structured Logging

- [ ] Logger Pino (structured JSON)
- [ ] Correlation ID par requête
- [ ] Logs d'arbitrage détaillés (opérateur only)
- [ ] Timeline des décisions de commit

### 3.2 Métriques

- [ ] Prometheus metrics endpoint
- [ ] Compteurs : reservations_total, rejections_total
- [ ] Histogrammes : commit_duration_seconds
- [ ] Gauges : active_resources, capacity_utilization

### 3.3 Health Checks

- [ ] `GET /health` (liveness)
- [ ] `GET /ready` (readiness - DB connectivity)
- [ ] Graceful shutdown

### 3.4 Configuration

- [ ] Config via env vars
- [ ] Validation au startup
- [ ] Valeurs par défaut sensées

### 3.5 Error Recovery

- [ ] Retry logic pour connections DB
- [ ] Circuit breaker pattern
- [ ] Dead letter logging pour events échoués

**Livrable Phase 3** : Système observable et résilient.

---

## Phase 4 : Features Secondaires

**Objectif** : Compléter l'expérience utilisateur.

### 4.1 Waiting List (optionnelle)

- [ ] Entity `WaitingListEntry`
- [ ] `POST /waiting-list/join`
- [ ] `DELETE /waiting-list/leave`
- [ ] Notification hook sur libération capacité
- [ ] Ordonnancement strict par timestamp

### 4.2 Cancellation

- [ ] `POST /reservations/:id/cancel`
- [ ] Libération atomique de capacité
- [ ] Event `ReservationCancelled`
- [ ] Trigger waiting list si activée

### 4.3 Admin API

- [ ] `PATCH /resources/:id` - Modifier capacité
- [ ] `POST /resources/:id/close` - Fermer ressource
- [ ] `POST /resources/:id/reopen` - Réouvrir
- [ ] Audit log des actions admin

### 4.4 Bulk Operations (admin)

- [ ] Import CSV de ressources
- [ ] Export réservations

**Livrable Phase 4** : Feature-complete pour v2.

---

## Architecture cible

```
┌─────────────────────────────────────────────────────┐
│                    API Layer                        │
│  (Fastify + validation + rate limiting)             │
├─────────────────────────────────────────────────────┤
│              Application Services                   │
│  ┌──────────────────┐  ┌────────────────────────┐   │
│  │ ReservationCommit │  │   AvailabilityView    │   │
│  │     Service       │  │      Service          │   │
│  │  (write path)     │  │   (read path/cache)   │   │
│  └────────┬─────────┘  └───────────┬───────────┘   │
├───────────┼────────────────────────┼───────────────┤
│           │      Domain Layer      │               │
│  ┌────────▼────────┐  ┌────────────▼────────────┐  │
│  │    Resource     │  │     Reservation         │  │
│  │   Aggregate     │  │      Aggregate          │  │
│  └─────────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│              Infrastructure Layer                   │
│  ┌─────────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ PostgreSQL  │  │  Cache   │  │   Logger     │   │
│  │ Repository  │  │ (memory) │  │   (Pino)     │   │
│  └─────────────┘  └──────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Stack technique

| Couche | Choix | Justification |
|--------|-------|---------------|
| Runtime | Node.js 20 LTS | Stable, async natif |
| Language | TypeScript strict | Safety + DX |
| HTTP | Fastify | Performance, schema validation |
| Database | PostgreSQL 16 | ACID, row locking, mature |
| ORM | Drizzle | Type-safe, SQL proche |
| Cache | In-memory (Map) | Simple, suffisant pour v2 |
| Logging | Pino | Structured, performant |
| Testing | Vitest | Rapide, TS natif |
| Container | Docker | Dev + deploy unifié |

---

## Contraintes techniques clés

### Atomic Commit

```sql
-- Pattern de réservation atomique
BEGIN;
SELECT * FROM resources WHERE id = $1 FOR UPDATE;
-- Check capacity
INSERT INTO reservations (...) ...;
UPDATE resources SET version = version + 1, ...;
COMMIT;
```

### Timestamp Authority

```typescript
// Le serveur décide du temps, jamais le client
const serverTimestamp = Date.now();
reservation.createdAt = serverTimestamp;
```

### No Overbooking Guarantee

```typescript
// Invariant vérifié à chaque commit
assert(
  resource.capacity >= currentBookings + requestedQuantity,
  'Overbooking prevented'
);
```

---

## Tests de validation

### Scénario concurrence

1. Créer ressource avec capacité = 1
2. Lancer 100 requêtes simultanées
3. Vérifier : exactement 1 succès, 99 rejets
4. Vérifier : 0 surbooking

### Scénario timeline

1. Créer ressource
2. Faire 10 réservations séquentielles
3. Vérifier : ordre des timestamps cohérent
4. Vérifier : logs permettent de reconstruire la timeline

---

## Ordre de priorité

1. **Phase 1** : Non négociable - c'est le produit
2. **Phase 2** : Nécessaire pour utilisation réelle
3. **Phase 3** : Requis avant production
4. **Phase 4** : Nice to have, livrable progressivement

---

## Ce qu'on ne build PAS

- UI/Frontend
- Payment integration
- Email service (juste des hooks)
- Multi-tenant (single tenant first)
- Distributed locking (single node first)
- GraphQL (REST suffit)

---

## Prochaine action

Démarrer Phase 1.1 : Setup projet.

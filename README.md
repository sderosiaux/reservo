# Reservo

A reservation engine that guarantees no overbooking.

## Why

Most reservation systems fail under concurrent load. When 100 users try to book the last seat simultaneously, many end up with confirmation emails for a seat that doesn't exist.

Reservo solves this by treating reservations as atomic commits. The database is the single source of truth, and row-level locking ensures only one request wins the last slot.

## What

**Core guarantees:**
- Single winner for the last slot
- No overbooking, ever
- Server timestamp is authoritative
- Deterministic ordering within the same millisecond

**How it works:**
1. Client requests a reservation
2. Server acquires a row lock on the resource
3. Capacity is verified inside the transaction
4. Reservation is confirmed or rejected atomically
5. Lock is released, next request proceeds

Every rejected request is a feature, not a bug. The system is working correctly when it says "no" to requests that would cause overbooking.

## Use cases

- Event ticketing (concerts, conferences, workshops)
- Restaurant reservations
- Appointment booking (medical, salon, consulting)
- Resource scheduling (meeting rooms, equipment)
- Any scenario where capacity is finite and overbooking is unacceptable

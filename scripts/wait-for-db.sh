#!/usr/bin/env bash

# Script to wait for PostgreSQL to be ready
# Usage: ./scripts/wait-for-db.sh [host] [port] [user] [database] [max_attempts]

set -e

HOST="${1:-localhost}"
PORT="${2:-5432}"
USER="${3:-reservo}"
DATABASE="${4:-reservo}"
MAX_ATTEMPTS="${5:-30}"

echo "Waiting for PostgreSQL at ${HOST}:${PORT} (database: ${DATABASE}, user: ${USER})..."

attempt=0
until pg_isready -h "$HOST" -p "$PORT" -U "$USER" -d "$DATABASE" > /dev/null 2>&1; do
  attempt=$((attempt + 1))

  if [ $attempt -ge $MAX_ATTEMPTS ]; then
    echo "ERROR: PostgreSQL did not become ready after ${MAX_ATTEMPTS} attempts"
    exit 1
  fi

  echo "Attempt $attempt/$MAX_ATTEMPTS: PostgreSQL is unavailable - sleeping 1 second..."
  sleep 1
done

echo "PostgreSQL is ready and accepting connections!"

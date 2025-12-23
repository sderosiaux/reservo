#!/usr/bin/env npx tsx

/**
 * Load test script - continuous reservations at ~10/s for 5 minutes
 */

const API_BASE = process.env.API_URL || 'http://localhost:3000/api/v1';
const DURATION_MS = 10 * 60 * 1000; // 10 minutes
const TARGET_RPS = 10; // requests per second
const INTERVAL_MS = 1000 / TARGET_RPS; // 100ms between requests

// Resources to create for load testing
const LOAD_TEST_RESOURCES = [
  { id: 'load-test-room-1', type: 'room', capacity: 10000 },
  { id: 'load-test-room-2', type: 'room', capacity: 10000 },
  { id: 'load-test-room-3', type: 'room', capacity: 10000 },
  { id: 'load-test-venue-1', type: 'venue', capacity: 50000 },
  { id: 'load-test-venue-2', type: 'venue', capacity: 50000 },
];

interface Stats {
  total: number;
  confirmed: number;
  rejected: number;
  errors: number;
  latencies: number[];
}

const stats: Stats = {
  total: 0,
  confirmed: 0,
  rejected: 0,
  errors: 0,
  latencies: [],
};

async function createResource(resource: { id: string; type: string; capacity: number }) {
  try {
    const res = await fetch(`${API_BASE}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resource),
    });
    if (res.ok) {
      console.log(`  Created resource: ${resource.id} (capacity: ${resource.capacity})`);
    } else if (res.status === 409) {
      console.log(`  Resource exists: ${resource.id}`);
    } else {
      console.log(`  Failed to create ${resource.id}: ${res.status}`);
    }
  } catch (err) {
    console.log(`  Error creating ${resource.id}: ${err}`);
  }
}

async function makeReservation(): Promise<void> {
  const resource = LOAD_TEST_RESOURCES[Math.floor(Math.random() * LOAD_TEST_RESOURCES.length)];
  const clientId = `client-${Math.random().toString(36).substring(2, 10)}`;
  const quantity = Math.floor(Math.random() * 3) + 1; // 1-3

  const start = Date.now();
  try {
    const res = await fetch(`${API_BASE}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceId: resource.id,
        clientId,
        quantity,
      }),
    });

    const latency = Date.now() - start;
    stats.latencies.push(latency);
    stats.total++;

    if (res.ok) {
      const data = await res.json();
      if (data.status?.toLowerCase() === 'confirmed') {
        stats.confirmed++;
      } else {
        stats.rejected++;
      }
    } else {
      stats.errors++;
    }
  } catch {
    stats.errors++;
    stats.total++;
  }
}

function getPercentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function printStats(elapsed: number) {
  const elapsedSec = elapsed / 1000;
  const rps = stats.total / elapsedSec;
  const successRate = stats.total > 0 ? ((stats.confirmed / stats.total) * 100).toFixed(1) : '0';
  const avgLatency = stats.latencies.length > 0
    ? (stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length).toFixed(0)
    : 0;
  const p50 = getPercentile(stats.latencies, 0.5);
  const p95 = getPercentile(stats.latencies, 0.95);
  const p99 = getPercentile(stats.latencies, 0.99);

  console.clear();
  console.log('='.repeat(60));
  console.log('  RESERVO LOAD TEST - LIVE STATS');
  console.log('='.repeat(60));
  console.log();
  console.log(`  Elapsed:     ${elapsedSec.toFixed(0)}s / ${DURATION_MS / 1000}s`);
  console.log(`  Target RPS:  ${TARGET_RPS}`);
  console.log(`  Actual RPS:  ${rps.toFixed(1)}`);
  console.log();
  console.log('-'.repeat(60));
  console.log('  REQUESTS');
  console.log('-'.repeat(60));
  console.log(`  Total:       ${stats.total}`);
  console.log(`  Confirmed:   ${stats.confirmed} (${successRate}%)`);
  console.log(`  Rejected:    ${stats.rejected}`);
  console.log(`  Errors:      ${stats.errors}`);
  console.log();
  console.log('-'.repeat(60));
  console.log('  LATENCY (ms)');
  console.log('-'.repeat(60));
  console.log(`  Avg:         ${avgLatency}ms`);
  console.log(`  P50:         ${p50}ms`);
  console.log(`  P95:         ${p95}ms`);
  console.log(`  P99:         ${p99}ms`);
  console.log();
  console.log('='.repeat(60));
  console.log('  Press Ctrl+C to stop');
  console.log('='.repeat(60));
}

async function main() {
  console.log('RESERVO LOAD TEST');
  console.log('=================\n');
  console.log(`Duration: ${DURATION_MS / 1000}s`);
  console.log(`Target: ${TARGET_RPS} requests/second\n`);

  // Create resources
  console.log('Setting up resources...');
  for (const resource of LOAD_TEST_RESOURCES) {
    await createResource(resource);
  }
  console.log('\nStarting load test...\n');

  const startTime = Date.now();
  let requestCount = 0;

  // Start continuous requests
  const interval = setInterval(() => {
    makeReservation();
    requestCount++;
  }, INTERVAL_MS);

  // Stats display interval
  const statsInterval = setInterval(() => {
    printStats(Date.now() - startTime);
  }, 500);

  // Stop after duration
  setTimeout(() => {
    clearInterval(interval);
    clearInterval(statsInterval);

    // Final stats
    console.log('\n\nFINAL RESULTS');
    console.log('=============\n');
    printStats(Date.now() - startTime);
    process.exit(0);
  }, DURATION_MS);
}

main().catch(console.error);

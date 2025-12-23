#!/usr/bin/env npx tsx

/**
 * Seed script to generate various resources for development/testing
 * Run with: npx tsx scripts/seed-resources.ts
 */

const API_BASE = process.env.API_URL || 'http://localhost:3000/api/v1';

interface Resource {
  id: string;
  type: string;
  capacity: number;
}

const resources: Resource[] = [
  // Conference Rooms
  { id: 'conf-room-a', type: 'conference-room', capacity: 10 },
  { id: 'conf-room-b', type: 'conference-room', capacity: 20 },
  { id: 'conf-room-c', type: 'conference-room', capacity: 6 },
  { id: 'boardroom', type: 'conference-room', capacity: 16 },
  { id: 'training-room', type: 'conference-room', capacity: 30 },

  // Meeting Rooms
  { id: 'meeting-room-1', type: 'meeting-room', capacity: 4 },
  { id: 'meeting-room-2', type: 'meeting-room', capacity: 4 },
  { id: 'meeting-room-3', type: 'meeting-room', capacity: 6 },
  { id: 'huddle-space-a', type: 'meeting-room', capacity: 3 },
  { id: 'huddle-space-b', type: 'meeting-room', capacity: 3 },

  // Desks / Workstations
  { id: 'desk-floor-1-a', type: 'desk', capacity: 1 },
  { id: 'desk-floor-1-b', type: 'desk', capacity: 1 },
  { id: 'desk-floor-1-c', type: 'desk', capacity: 1 },
  { id: 'desk-floor-2-a', type: 'desk', capacity: 1 },
  { id: 'desk-floor-2-b', type: 'desk', capacity: 1 },
  { id: 'standing-desk-1', type: 'desk', capacity: 1 },
  { id: 'standing-desk-2', type: 'desk', capacity: 1 },

  // Parking Spots
  { id: 'parking-a1', type: 'parking', capacity: 1 },
  { id: 'parking-a2', type: 'parking', capacity: 1 },
  { id: 'parking-a3', type: 'parking', capacity: 1 },
  { id: 'parking-b1', type: 'parking', capacity: 1 },
  { id: 'parking-b2', type: 'parking', capacity: 1 },
  { id: 'parking-ev-1', type: 'parking', capacity: 1 },
  { id: 'parking-ev-2', type: 'parking', capacity: 1 },

  // Equipment
  { id: 'projector-portable-1', type: 'equipment', capacity: 1 },
  { id: 'projector-portable-2', type: 'equipment', capacity: 1 },
  { id: 'video-camera', type: 'equipment', capacity: 1 },
  { id: 'podcast-kit', type: 'equipment', capacity: 1 },
  { id: 'whiteboard-mobile', type: 'equipment', capacity: 3 },

  // Vehicles
  { id: 'company-car-1', type: 'vehicle', capacity: 1 },
  { id: 'company-car-2', type: 'vehicle', capacity: 1 },
  { id: 'van-cargo', type: 'vehicle', capacity: 1 },

  // Event Spaces
  { id: 'rooftop-terrace', type: 'event-space', capacity: 50 },
  { id: 'lobby-area', type: 'event-space', capacity: 30 },
  { id: 'cafeteria', type: 'event-space', capacity: 100 },

  // Labs / Specialized Rooms
  { id: 'usability-lab', type: 'lab', capacity: 8 },
  { id: 'photo-studio', type: 'lab', capacity: 5 },
  { id: 'sound-booth', type: 'lab', capacity: 2 },
];

async function createResource(resource: Resource): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resource),
    });

    if (response.status === 201) {
      console.log(`  Created: ${resource.id} (${resource.type}, capacity: ${resource.capacity})`);
      return true;
    } else if (response.status === 409) {
      console.log(`  Exists:  ${resource.id}`);
      return true;
    } else {
      const error = await response.json();
      console.error(`  Failed:  ${resource.id} - ${error.message || response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`  Error:   ${resource.id} - ${error}`);
    return false;
  }
}

async function main() {
  console.log('Seeding resources...\n');
  console.log(`API: ${API_BASE}\n`);

  const types = [...new Set(resources.map(r => r.type))];
  let created = 0;
  let failed = 0;

  for (const type of types) {
    const typeResources = resources.filter(r => r.type === type);
    console.log(`${type} (${typeResources.length}):`);

    for (const resource of typeResources) {
      const success = await createResource(resource);
      if (success) created++;
      else failed++;
    }
    console.log('');
  }

  console.log('---');
  console.log(`Total: ${created} created/existing, ${failed} failed`);
  console.log(`\nResources available at: ${API_BASE}/resources`);
}

main().catch(console.error);

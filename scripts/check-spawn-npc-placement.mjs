import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const generator = readFileSync(resolve(root, 'src/engine/DungeonGenerator.ts'), 'utf8');
const failures = [];

function assertContains(needle, message) {
  if (!generator.includes(needle)) {
    failures.push(message);
  }
}

assertContains(
  'const SPAWN_NPC_X_OFFSET = 2;',
  'Spawn NPC horizontal offset must stay at 2 meters.'
);
assertContains(
  'startYaw: 0',
  'Initial camera yaw must keep the starting view aligned with world north.'
);
assertContains(
  'startPosition: new THREE.Vector3(ENTRANCE_X, 0, -3)',
  'Initial player spawn must stay inside the mirrored dungeon entrance.'
);
assertContains(
  'entranceDoor.center.x + SPAWN_NPC_X_OFFSET',
  'Spawn NPC must stay on the east/right side of the entrance door (x increasing).'
);
assertContains(
  'return mirrorDungeonLayout({',
  'Dungeon layout must be mirrored on Z so the dungeon extends north while keeping X+ on the right.'
);
assertContains(
  'function mirrorDungeonLayout(layout: DungeonLayout): DungeonLayout {',
  'Dungeon generator must keep the Z-axis mirror helper for spawn orientation consistency.'
);
assertContains(
  'const layoutStartPosition = mirrorVector3OnZ(DUNGEON_CONFIG.startPosition);',
  'Spawn-related placement checks must use layout-space start coordinates before mirroring.'
);
assertContains(
  'const safeMaxLane = Math.min(overlapMax, spawnBounds.minCol + spawnBounds.width - 2);',
  'Spawn entrance corridor must reserve space on the right side of the door for the NPC.'
);
assertContains(
  "throw new Error('Unable to reserve space for the spawn NPC to the right of the entrance door.');",
  'Spawn generator must fail fast if the right side of the door cannot fit the NPC.'
);

if (failures.length > 0) {
  console.error('Spawn NPC placement regression check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Spawn NPC placement regression check passed.');

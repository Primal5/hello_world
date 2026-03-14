import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const epsilon = 1e-4;
const generationCount = 50;

function overlaps(aMin, aMax, bMin, bMax) {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin) > epsilon;
}

function getDoorRange(door) {
  if (Math.abs(Math.sin(door.rotationY)) < 0.5) {
    return {
      axis: 'x',
      line: door.center.z,
      min: door.center.x - door.width / 2,
      max: door.center.x + door.width / 2
    };
  }

  return {
    axis: 'z',
    line: door.center.x,
    min: door.center.z - door.width / 2,
    max: door.center.z + door.width / 2
  };
}

function getWallRange(segment) {
  return segment.axis === 'x'
    ? [Math.min(segment.start.x, segment.end.x), Math.max(segment.start.x, segment.end.x)]
    : [Math.min(segment.start.y, segment.end.y), Math.max(segment.start.y, segment.end.y)];
}

const result = await build({
  entryPoints: ['src/engine/DungeonGenerator.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false
});

const tempDir = path.join(process.cwd(), 'scripts', 'temp');
await fs.mkdir(tempDir, { recursive: true });
const outfile = path.join(tempDir, `door-clearance-check-${Date.now()}.mjs`);
await fs.writeFile(outfile, result.outputFiles[0].text, 'utf8');

try {
  const mod = await import(pathToFileURL(outfile).href);
  const failures = [];

  for (let run = 0; run < generationCount; run += 1) {
    const layout = mod.generateDungeonLayout();

    for (const door of layout.doors) {
      const doorRange = getDoorRange(door);

      for (const segment of layout.wallSegments) {
        if (segment.axis !== doorRange.axis) {
          continue;
        }

        if (Math.abs(segment.line - doorRange.line) >= epsilon) {
          continue;
        }

        const wallYMin = segment.center.y - segment.size.y / 2;
        if (wallYMin < door.height - epsilon) {
          const [wallMin, wallMax] = getWallRange(segment);
          if (overlaps(doorRange.min, doorRange.max, wallMin, wallMax)) {
            failures.push({
              run,
              doorId: door.id,
              wallId: segment.id
            });
          }
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error('Door clearance check failed.');
    console.error('Blocked doorway samples:', failures.slice(0, 20));
    process.exitCode = 1;
  } else {
    console.log('Door clearance check passed.');
  }
} finally {
  await fs.unlink(outfile).catch(() => {});
}

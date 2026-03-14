import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const epsilon = 1e-4;

function overlaps(aMin, aMax, bMin, bMax) {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin) > epsilon;
}

function getRange(segment) {
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
const outfile = path.join(tempDir, `dungeon-check-${Date.now()}.mjs`);
await fs.writeFile(outfile, result.outputFiles[0].text, 'utf8');

try {
  const mod = await import(pathToFileURL(outfile).href);
  const layout = mod.generateDungeonLayout();
  const duplicates = [];
  const overlapsFound = [];

  for (let i = 0; i < layout.wallSegments.length; i += 1) {
    const a = layout.wallSegments[i];
    for (let j = i + 1; j < layout.wallSegments.length; j += 1) {
      const b = layout.wallSegments[j];
      const sameBox =
        Math.abs(a.center.x - b.center.x) < epsilon &&
        Math.abs(a.center.y - b.center.y) < epsilon &&
        Math.abs(a.center.z - b.center.z) < epsilon &&
        Math.abs(a.size.x - b.size.x) < epsilon &&
        Math.abs(a.size.y - b.size.y) < epsilon &&
        Math.abs(a.size.z - b.size.z) < epsilon;

      if (sameBox) {
        duplicates.push([a.id, b.id]);
        continue;
      }

      if (a.axis !== b.axis || Math.abs(a.center.y - b.center.y) >= epsilon) {
        continue;
      }

      if (a.axis === 'x' && Math.abs(a.line - b.line) < epsilon) {
        const [aMin, aMax] = getRange(a);
        const [bMin, bMax] = getRange(b);
        if (overlaps(aMin, aMax, bMin, bMax)) {
          overlapsFound.push([a.id, b.id]);
        }
      }

      if (a.axis === 'z' && Math.abs(a.line - b.line) < epsilon) {
        const [aMin, aMax] = getRange(a);
        const [bMin, bMax] = getRange(b);
        if (overlaps(aMin, aMax, bMin, bMax)) {
          overlapsFound.push([a.id, b.id]);
        }
      }
    }
  }

  if (duplicates.length > 0 || overlapsFound.length > 0) {
    console.error('Wall overlap check failed.');
    if (duplicates.length > 0) {
      console.error('Exact duplicates:', duplicates);
    }
    if (overlapsFound.length > 0) {
      console.error('Colinear overlaps:', overlapsFound);
    }
    process.exitCode = 1;
  } else {
    console.log('Wall overlap check passed.');
  }
} finally {
  await fs.unlink(outfile).catch(() => {});
}


import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const srcRoot = join(root, 'src');
const protectedRoots = [
  join(srcRoot, 'core'),
  join(srcRoot, 'engine'),
  join(srcRoot, 'ui'),
  join(srcRoot, 'gameplay', 'interaction'),
  join(srcRoot, 'data')
];
const allowList = new Set([
  join(srcRoot, 'text', 'DisplayText.ts')
]);

function collectFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }
    if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

function isProtectedFile(filePath) {
  if (allowList.has(filePath)) {
    return false;
  }
  return protectedRoots.some((dir) => filePath.startsWith(dir));
}

function findViolations(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const violations = [];
  const stringPattern = /(['"`])((?:\\.|(?!\1).)*)\1/g;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) {
      return;
    }

    for (const match of trimmed.matchAll(stringPattern)) {
      const value = match[2];
      const hasLetters = /[A-Za-zÀ-ÿ]/.test(value);
      const hasWhitespace = /\s/.test(value);
      const looksLikeText = hasLetters && hasWhitespace;
      const allowedSnippet = value.includes('DISPLAY_TEXT') || value.includes('../') || value.includes('./');
      if (looksLikeText && !allowedSnippet) {
        violations.push({ line: index + 1, value });
      }
    }
  });

  return violations;
}

const allFiles = collectFiles(srcRoot).filter(isProtectedFile);
const violations = allFiles.flatMap((filePath) =>
  findViolations(filePath).map((violation) => ({
    filePath: relative(root, filePath),
    ...violation
  }))
);

if (violations.length > 0) {
  console.error('Raw display text found outside src/text/DisplayText.ts:');
  for (const violation of violations) {
    console.error(`- ${violation.filePath}:${violation.line} -> ${violation.value}`);
  }
  process.exit(1);
}

console.log('Display text check passed.');

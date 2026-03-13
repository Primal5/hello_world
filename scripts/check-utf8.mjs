import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".html",
  ".css",
  ".md",
  ".yml",
  ".yaml",
  ".txt"
]);
const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  "coverage",
  ".idea",
  ".vscode"
]);
const badFiles = [];

function isUtf8(buffer) {
  let i = 0;
  while (i < buffer.length) {
    const byte1 = buffer[i];
    if (byte1 <= 0x7f) {
      i += 1;
      continue;
    }
    if (byte1 >= 0xc2 && byte1 <= 0xdf) {
      if (i + 1 >= buffer.length) return false;
      const byte2 = buffer[i + 1];
      if ((byte2 & 0xc0) !== 0x80) return false;
      i += 2;
      continue;
    }
    if (byte1 === 0xe0) {
      if (i + 2 >= buffer.length) return false;
      const byte2 = buffer[i + 1];
      const byte3 = buffer[i + 2];
      if (byte2 < 0xa0 || byte2 > 0xbf) return false;
      if ((byte3 & 0xc0) !== 0x80) return false;
      i += 3;
      continue;
    }
    if (byte1 >= 0xe1 && byte1 <= 0xec) {
      if (i + 2 >= buffer.length) return false;
      const byte2 = buffer[i + 1];
      const byte3 = buffer[i + 2];
      if ((byte2 & 0xc0) !== 0x80 || (byte3 & 0xc0) !== 0x80) return false;
      i += 3;
      continue;
    }
    if (byte1 === 0xed) {
      if (i + 2 >= buffer.length) return false;
      const byte2 = buffer[i + 1];
      const byte3 = buffer[i + 2];
      if (byte2 < 0x80 || byte2 > 0x9f) return false;
      if ((byte3 & 0xc0) !== 0x80) return false;
      i += 3;
      continue;
    }
    if (byte1 >= 0xee && byte1 <= 0xef) {
      if (i + 2 >= buffer.length) return false;
      const byte2 = buffer[i + 1];
      const byte3 = buffer[i + 2];
      if ((byte2 & 0xc0) !== 0x80 || (byte3 & 0xc0) !== 0x80) return false;
      i += 3;
      continue;
    }
    if (byte1 === 0xf0) {
      if (i + 3 >= buffer.length) return false;
      const byte2 = buffer[i + 1];
      const byte3 = buffer[i + 2];
      const byte4 = buffer[i + 3];
      if (byte2 < 0x90 || byte2 > 0xbf) return false;
      if ((byte3 & 0xc0) !== 0x80 || (byte4 & 0xc0) !== 0x80) return false;
      i += 4;
      continue;
    }
    if (byte1 >= 0xf1 && byte1 <= 0xf3) {
      if (i + 3 >= buffer.length) return false;
      const byte2 = buffer[i + 1];
      const byte3 = buffer[i + 2];
      const byte4 = buffer[i + 3];
      if (
        (byte2 & 0xc0) !== 0x80 ||
        (byte3 & 0xc0) !== 0x80 ||
        (byte4 & 0xc0) !== 0x80
      ) {
        return false;
      }
      i += 4;
      continue;
    }
    if (byte1 === 0xf4) {
      if (i + 3 >= buffer.length) return false;
      const byte2 = buffer[i + 1];
      const byte3 = buffer[i + 2];
      const byte4 = buffer[i + 3];
      if (byte2 < 0x80 || byte2 > 0x8f) return false;
      if ((byte3 & 0xc0) !== 0x80 || (byte4 & 0xc0) !== 0x80) return false;
      i += 4;
      continue;
    }
    return false;
  }
  return true;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(fullPath);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    const buffer = fs.readFileSync(fullPath);
    const hasBom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
    if (hasBom || !isUtf8(buffer)) {
      badFiles.push(path.relative(ROOT, fullPath));
    }
  }
}

walk(ROOT);

if (badFiles.length > 0) {
  console.error("Invalid UTF-8 files detected:");
  for (const file of badFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("UTF-8 check passed.");
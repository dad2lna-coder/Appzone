#!/usr/bin/env node
/**
 * Rewrite the README.md app-link list between
 * <!-- APP-LINKS:START --> and <!-- APP-LINKS:END -->
 * from the current folders under apps/.
 *
 * Plain Node, no dependencies. Run from the repo root:
 *   node tools/update-readme-links.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const START = '<!-- APP-LINKS:START -->';
const END = '<!-- APP-LINKS:END -->';
const BASE = 'https://dad2lna-coder.github.io/Appzone';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appsDir = join(root, 'apps');
const readmePath = join(root, 'README.md');

function titleCase(name) {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const entries = await readdir(appsDir, { withFileTypes: true });
const apps = entries
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

const lines = [
  `- [Appzone index](${BASE}/)`,
  ...apps.map((name) => `- [${titleCase(name)}](${BASE}/${name}/)`),
];
const block = `${START}\n${lines.join('\n')}\n${END}`;

const readme = await readFile(readmePath, 'utf8');
const startIdx = readme.indexOf(START);
const endIdx = readme.indexOf(END);
if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
  console.error(
    'README.md is missing <!-- APP-LINKS:START --> / <!-- APP-LINKS:END --> markers',
  );
  process.exit(1);
}

const next = readme.slice(0, startIdx) + block + readme.slice(endIdx + END.length);
if (next === readme) {
  console.log('README.md app links already up to date');
} else {
  await writeFile(readmePath, next);
  console.log(`Updated README.md app links (${apps.length} apps)`);
}

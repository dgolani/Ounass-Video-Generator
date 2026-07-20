// One-off: vendor the Google Fonts families into the repo so export-time
// font embedding never leaves the origin.
// Usage: node vendor-google-fonts.mjs <appDir>
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const APP = process.argv[2];
if (!APP) throw new Error('pass app dir');

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300&family=Nunito+Sans:ital,opsz,wght@0,6..12,300;0,6..12,400;0,6..12,600;0,6..12,700;0,6..12,900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Inter:wght@300;400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Cairo:wght@300;400;500;600;700;800&display=swap';

// Chrome UA → Google serves woff2 with unicode-range subsets.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const KEEP_SUBSETS = new Set(['latin', 'latin-ext', 'arabic']);

const res = await fetch(CSS_URL, { headers: { 'User-Agent': UA } });
if (!res.ok) throw new Error(`css fetch failed: ${res.status}`);
const css = await res.text();

// Blocks look like: /* latin */\n@font-face { ... }
const blockRe = /\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g;
const fontDir = path.join(APP, 'src/assets/fonts/google');
await mkdir(fontDir, { recursive: true });

let out =
  `/* AUTO-VENDORED from Google Fonts (${new Date().toISOString().slice(0, 10)}).\n` +
  ` * Same families/weights the old fonts.googleapis.com <link> served, self-hosted\n` +
  ` * so export-time font embedding (getFontEmbedCSS) never needs a cross-origin\n` +
  ` * fetch — corporate proxies / ad-blockers were breaking exports for marketing.\n` +
  ` * Subsets kept: latin, latin-ext, arabic. Regenerate via the scratchpad script\n` +
  ` * if families change (see HANDOFF.md §fonts).\n */\n\n`;

let m;
let count = 0;
const seenNames = new Set();
while ((m = blockRe.exec(css)) !== null) {
  const [, subset, block] = m;
  if (!KEEP_SUBSETS.has(subset)) continue;
  const family = block.match(/font-family:\s*'([^']+)'/)?.[1];
  const style = block.match(/font-style:\s*(\w+)/)?.[1] ?? 'normal';
  const weight = block.match(/font-weight:\s*([\d ]+)/)?.[1]?.trim().replace(/\s+/g, '-') ?? '400';
  const url = block.match(/src:\s*url\((https:[^)]+\.woff2)\)/)?.[1];
  if (!family || !url) throw new Error(`unparseable block:\n${block}`);

  let base = `${family.replace(/\s+/g, '')}-${weight}${style === 'italic' ? '-italic' : ''}-${subset}`;
  let name = `${base}.woff2`;
  for (let i = 2; seenNames.has(name); i++) name = `${base}-${i}.woff2`;
  seenNames.add(name);

  const fres = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!fres.ok) throw new Error(`font fetch failed ${fres.status}: ${url}`);
  await writeFile(path.join(fontDir, name), Buffer.from(await fres.arrayBuffer()));

  out += `/* ${subset} */\n` + block.replace(url, `../assets/fonts/google/${name}`) + '\n';
  count++;
  process.stdout.write(`${name}\n`);
}

if (count === 0) throw new Error('no blocks matched — CSS format changed?');
await writeFile(path.join(APP, 'src/styles/google-fonts.css'), out);
console.log(`\n${count} faces vendored → src/assets/fonts/google + src/styles/google-fonts.css`);

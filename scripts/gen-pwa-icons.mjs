// Gera os PNG dos icones a partir de public/icon.svg e public/icons/maskable.svg (chromium do Playwright).
// Uso: node scripts/gen-pwa-icons.mjs   (so quando o desenho mudar; os PNG ficam versionados)
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const exe = process.env.FARO_CHROMIUM || '/opt/pw-browsers/chromium';
const jobs = [
  ['public/icon.svg', 'public/icons/icon-192.png', 192],
  ['public/icon.svg', 'public/icons/icon-512.png', 512],
  ['public/icons/maskable.svg', 'public/icons/maskable-512.png', 512],
];
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
for (const [src, dst, size] of jobs) {
  const svg = await readFile(join(root, src), 'utf8');
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body>`);
  await writeFile(join(root, dst), await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }));
  await page.close();
}
await browser.close();
console.log('icones gerados');

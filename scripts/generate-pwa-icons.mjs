// Gera os ícones PNG do PWA a partir de icon-512.png (derivado do símbolo FARO).
// Uso (só em desenvolvimento, não roda no build): NODE_PATH=$(npm root -g) node scripts/generate-pwa-icons.mjs
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';

const { chromium } = createRequire(import.meta.url)('playwright');
const source = `data:image/png;base64,${(await readFile('icon-512.png')).toString('base64')}`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const render = (size, scale, background) => page.evaluate(async ({ source, size, scale, background }) => {
  const img = new Image();
  img.src = source;
  await img.decode();
  const canvas = document.getElementById('c');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, size, size); }
  const drawn = size * scale;
  ctx.drawImage(img, (size - drawn) / 2, (size - drawn) / 2, drawn, drawn);
  return canvas.toDataURL('image/png').split(',')[1];
}, { source, size, scale, background });

const cream = await page.evaluate(async source => {
  const img = new Image(); img.src = source; await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 2, 2, 1, 1, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r},${g},${b})`;
}, source);

const outputs = {
  'icon-192.png': [192, 1],
  'apple-touch-icon.png': [180, 1],
  'favicon-32.png': [32, 1],
  // Maskable: logo a 66% sobre fundo creme sólido para ficar dentro da safe zone (círculo de 80%).
  'icon-maskable-512.png': [512, 0.66]
};
for (const [name, [size, scale]] of Object.entries(outputs)) {
  await writeFile(name, Buffer.from(await render(size, scale, cream), 'base64'));
  console.log('ok', name, size);
}
await browser.close();

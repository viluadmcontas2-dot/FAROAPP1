import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { buildHeadersFile, buildRedirectsFile } from './csp.mjs';

const SITE = '_site';

// Hashes rígidos protegem somente o núcleo aprovado contra divergência acidental.
// A saída é estática e independente do provedor de hosting.
const immutable = new Map(Object.entries({
  'legacy-shell.html': '2562a71314dc3f4fe834985e1a39e022e1565c1268a732917ad267a3cf09ab7b',
  'app.js': '9a8511e85c8b08225aab1d08b3fd486690377f88fc6ebc58856389f30f1995bb',
  'faro-mark.svg': 'b47e7aa970e50a90fabbbefb6ec21aca8db7557d8590d6687532f575212f6563',
  'icon.svg': '482dca327e2ba36c5893ccd83e43e1a7f05a106e03bfcbfee118877f7d9126ba'
}));

const copyFiles = [
  'app-shell.html',
  'legacy-shell.html',
  'app.js',
  'faro-safe.js',
  'faro-brand-r2.js',
  'faro-platform.js',
  'faro-update.js',
  'faro-state.js',
  'faro-energy.js',
  'faro-home-r2.js',
  'faro-register-earnings.js',
  'faro-register.js',
  'faro-finance.js',
  'faro-reserves.js',
  'faro-interactions.js',
  'faro-planning.js',
  'faro-planning-invariants.js',
  'faro-r3b.js',
  'faro-r3-routing.js',
  'faro-navigation.js',
  'faro-config.js',
  'faro-plans.js',
  'faro-account.js',
  'faro-notifications.js',
  'faro-r2-polish.js',
  'faro-pwa.js',
  'faro-onboarding.js',
  'faro-onboarding-commit.js',
  'faro-tour.js',
  'styles.css',
  'faro-theme.css',
  'index.html',
  'offline.html',
  'termos.html',
  'privacidade.html',
  'legal.css',
  'manifest.webmanifest',
  'sw.js',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'favicon-32.png',
  'screenshot-home.png',
  'screenshot-register.png',
  'faro-mark.svg',
  // Dependências de terceiros hospedadas localmente com versão fixa (sem CDN).
  'vendor/chart-4.5.1.umd.min.js',
  'vendor/fontawesome-6.4.0/css/all.min.css',
  'vendor/fontawesome-6.4.0/webfonts/fa-brands-400.woff2',
  'vendor/fontawesome-6.4.0/webfonts/fa-regular-400.woff2',
  'vendor/fontawesome-6.4.0/webfonts/fa-solid-900.woff2',
  'vendor/fontawesome-6.4.0/webfonts/fa-v4compatibility.woff2',
  'vendor/fonts/plus-jakarta-sans-latin-400-normal.woff2',
  'vendor/fonts/plus-jakarta-sans-latin-500-normal.woff2',
  'vendor/fonts/plus-jakarta-sans-latin-600-normal.woff2',
  'vendor/fonts/plus-jakarta-sans-latin-700-normal.woff2',
  'vendor/fonts/plus-jakarta-sans-latin-800-normal.woff2',
  'vendor/fonts/plus-jakarta-sans.css',
  'vendor/supabase-js-2.112.3.mjs',
  'vendor/tailwind.css',
  'assets/platforms/faro-platform-99.svg',
  'assets/platforms/faro-platform-indrive.svg',
  'assets/platforms/faro-platform-uber.svg'
];

const hash = buffer => createHash('sha256').update(buffer).digest('hex');

async function readVerified(path) {
  const buffer = await readFile(path);
  const wanted = immutable.get(path);
  if (wanted) {
    const actual = hash(buffer);
    if (actual !== wanted) throw new Error(`NÚCLEO FARO DIVERGIU: ${path} esperado=${wanted} recebido=${actual}`);
  }
  return buffer;
}

function transformAppJs(source) {
  const from = "const STORAGE_KEY = 'vetta-driver-intelligence-v3';";
  const to = "const STORAGE_KEY = 'faro-app-finance-v1';";
  if (!source.includes(from)) throw new Error('Transformação ausente: armazenamento FARO');
  return source.replace(from, to);
}

await rm(SITE, { recursive: true, force: true });
await mkdir(SITE, { recursive: true });

for (const path of copyFiles) {
  const buffer = await readVerified(path);
  const target = join(SITE, path);
  await mkdir(dirname(target), { recursive: true });
  if (path === 'app.js') await writeFile(target, transformAppJs(buffer.toString('utf8')));
  else await cp(path, target);
}

// Cloudflare Pages: cabeçalhos de segurança/cache e fallback de SPA (mesma política do vercel.json).
await writeFile(join(SITE, '_headers'), buildHeadersFile());
await writeFile(join(SITE, '_redirects'), buildRedirectsFile());

await mkdir(join(SITE, '.well-known'), { recursive: true });
await writeFile(join(SITE, '.well-known', 'faro-baseline.json'), `${JSON.stringify({
  name: 'FARO',
  tagline: 'APP DO MOTORISTA!',
  sourceZipSha256: '22f83f11d25f4d452ae570e0153e9289d02060c423ad4bd5d7a7bcb96235f5c4',
  brandAssetSha256: '06d155f9f8bbdef8d18918d29c8f6bf75b7b55c38971d076587a97bb7d45f940',
  branch: process.env.BRANCH || 'main',
  commit: process.env.COMMIT_REF || null
}, null, 2)}\n`);

console.log('FARO static site ready: protected core copied to _site');

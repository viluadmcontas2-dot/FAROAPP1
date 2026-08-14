import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const SITE = '_site';

// Durante o refinamento, hashes rígidos ficam apenas no núcleo aprovado que não pode mudar por acidente.
// Os módulos de experiência são validados por contrato/comportamento nos testes, não por ritual de hash a cada microajuste.
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
  'faro-brand.js',
  'faro-platform.js',
  'faro-onboarding.js',
  'styles.css',
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'icon.svg',
  'faro-mark.svg'
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
  let value = source;
  const from = "const STORAGE_KEY = 'vetta-driver-intelligence-v3';";
  const to = "const STORAGE_KEY = 'faro-app-finance-v1';";
  if (!value.includes(from)) throw new Error('Transformação ausente: armazenamento FARO');
  return value.replace(from, to);
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

await mkdir(join(SITE, '.well-known'), { recursive: true });
await writeFile(join(SITE, '.well-known', 'faro-baseline.json'), `${JSON.stringify({
  name: 'FARO',
  tagline: 'APP DO MOTORISTA!',
  sourceZipSha256: '22f83f11d25f4d452ae570e0153e9289d02060c423ad4bd5d7a7bcb96235f5c4',
  brandAssetSha256: '06d155f9f8bbdef8d18918d29c8f6bf75b7b55c38971d076587a97bb7d45f940',
  branch: process.env.BRANCH || 'release/faro-v1-comercial-22-08',
  commit: process.env.COMMIT_REF || null
}, null, 2)}\n`);

console.log('FARO pronto para validação: núcleo protegido e experiência atual copiada');

import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const SITE = '_site';
const expected = new Map(Object.entries({
  "app-shell.html": "2b669504723579d2e0d3ddef11c029cc27f636cfa011e99518b714e1a3d10ca7",
  "legacy-shell.html": "2562a71314dc3f4fe834985e1a39e022e1565c1268a732917ad267a3cf09ab7b",
  "app.js": "9a8511e85c8b08225aab1d08b3fd486690377f88fc6ebc58856389f30f1995bb",
  "faro-brand.js": "eef640211c833154c0272c1e3008201f2a9d0532c2403eb092be6a7d2497d701",
  "styles.css": "7befb2cdbe66395fb4b413282e25671a63bab0e313d20e4d01d8b41e25d2af73",
  "index.html": "c0066b474c486104956d768a1340bbf7efbfd62cef11cd563d265a175db2f41d",
  "manifest.webmanifest": "178ada16f5e3389718adc4edd05d72f08373dd4ba2e95fd447490f09c6cfe2bc",
  "sw.js": "221445ec5561054c62e47883f239d1e4fec9826f57c2d30e34c5b9a83a356aa5",
  "icon.svg": "482dca327e2ba36c5893ccd83e43e1a7f05a106e03bfcbfee118877f7d9126ba",
  "faro-mark.svg": "b47e7aa970e50a90fabbbefb6ec21aca8db7557d8590d6687532f575212f6563"
}));

const hash = buffer => createHash('sha256').update(buffer).digest('hex');

async function verified(path) {
  const buffer = await readFile(path);
  const actual = hash(buffer);
  const wanted = expected.get(path);
  if (actual !== wanted) throw new Error(`FONTE FARO DIVERGIU: ${path} esperado=${wanted} recebido=${actual}`);
  return buffer;
}

function transformAppJs(source) {
  let value = source;
  const replaceOne = (from, to, label) => {
    if (!value.includes(from)) throw new Error(`Transformação ausente: ${label}`);
    value = value.replace(from, to);
  };
  replaceOne("const STORAGE_KEY = 'vetta-driver-intelligence-v3';", "const STORAGE_KEY = 'faro-app-finance-v1';", 'storage Faro');
  replaceOne('  onboardingComplete: false,', '  onboardingComplete: true,', 'onboarding default');
  const onboarding = /  prepareOnboarding\(\) \{\n    if \(this\.state\.onboardingComplete\) return;[\s\S]*?\n  \},\n  fillOnboardingFuel/;
  if (!onboarding.test(value)) throw new Error('Bloco prepareOnboarding não localizado');
  value = value.replace(onboarding, `  prepareOnboarding() {\n    // Onboarding reservado para fase futura.\n    return;\n  },\n  fillOnboardingFuel`);
  return value;
}

await rm(SITE, { recursive: true, force: true });
await mkdir(SITE, { recursive: true });

for (const path of expected.keys()) {
  const buffer = await verified(path);
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
  branch: process.env.BRANCH || 'FAROAPP1CLEAN',
  commit: process.env.COMMIT_REF || null,
}, null, 2)}\n`);

console.log('FARO built from verified branded source');

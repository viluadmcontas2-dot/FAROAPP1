import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const SITE = '_site';
const expected = new Map(Object.entries({
  'app-shell.html': '2562a71314dc3f4fe834985e1a39e022e1565c1268a732917ad267a3cf09ab7b',
  'app.js': '9a8511e85c8b08225aab1d08b3fd486690377f88fc6ebc58856389f30f1995bb',
  'styles.css': '7befb2cdbe66395fb4b413282e25671a63bab0e313d20e4d01d8b41e25d2af73',
  'index.html': '4ee9ccf908515816ace3cc9454f4c90955d7c9fdb1a874a4a980a4ec3899ddd7',
  'manifest.webmanifest': '35a93de7ef22e687a233c2fe1d1b94b7be09f04a871f0551f23900ab7259235b',
  'sw.js': '44e6fcdfe5eee5593744c8cf2d25e69b8323cf36ae11a0a9506a21e93f3c7129',
  'icon.svg': 'e9a8d61cabdb5fe71189ac5da54ec1305d2695e300d4922d640bdd33a936e6d9',
  'icon-192.png': 'fa690c0c4738af8a6f57eac9e6c07521772ceac0b071141309c3e378b3996974',
  'icon-512.png': 'c33d2754336f0878e496b503af6f8b8f502fe47b01ed704f719a4302ce6b64d8',
}));

const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const brandText = value => value.replaceAll('CalculaAê', 'TESTE NETLIFY OF').replaceAll('VETTA', 'TESTE NETLIFY OF');

async function verified(path) {
  const buffer = await readFile(path);
  const actual = hash(buffer);
  const wanted = expected.get(path);
  if (actual !== wanted) throw new Error(`BASELINE DIVERGIU: ${path} esperado=${wanted} recebido=${actual}`);
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
  value = brandText(value).replaceAll('vetta-backup-', 'teste-netlify-of-backup-');
  return value;
}

await rm(SITE, { recursive: true, force: true });
await mkdir(SITE, { recursive: true });

for (const path of expected.keys()) {
  const buffer = await verified(path);
  const target = join(SITE, path);
  await mkdir(dirname(target), { recursive: true });
  if (path === 'app.js') {
    await writeFile(target, transformAppJs(buffer.toString('utf8')));
  } else if (path === 'app-shell.html' || path === 'index.html') {
    await writeFile(target, brandText(buffer.toString('utf8')));
  } else if (path === 'manifest.webmanifest') {
    const manifest = JSON.parse(buffer.toString('utf8'));
    manifest.name = 'TESTE NETLIFY OF';
    manifest.short_name = 'TESTE NETLIFY OF';
    manifest.description = 'Teste funcional direto para motoristas de aplicativo, baseado no ZIP aprovado.';
    await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`);
  } else if (path === 'sw.js') {
    const source = buffer.toString('utf8');
    if (!source.includes("const CACHE = 'calculaae-install-flow-5';")) throw new Error('Cache PWA esperado não localizado');
    await writeFile(target, source.replace("const CACHE = 'calculaae-install-flow-5';", "const CACHE = 'teste-netlify-of-zip-baseline-1';"));
  } else {
    await cp(path, target);
  }
}

await mkdir(join(SITE, '.well-known'), { recursive: true });
await writeFile(join(SITE, '.well-known', 'teste-netlify-of-baseline.json'), `${JSON.stringify({
  name: 'TESTE NETLIFY OF',
  sourceZipSha256: '22f83f11d25f4d452ae570e0153e9289d02060c423ad4bd5d7a7bcb96235f5c4',
  branch: process.env.BRANCH || 'FAROAPP1CLEAN',
  commit: process.env.COMMIT_REF || null,
}, null, 2)}\n`);

console.log('TESTE NETLIFY OF built from verified ZIP baseline');

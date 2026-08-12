import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const SOURCE_REPO = 'vitoohugo333/VETTA';
const SOURCE_COMMIT = '2bae08973e8eea65465cc5d9ec8531e4e2113fa2';
const LOCAL_SOURCE = process.env.BASELINE_SOURCE_DIR || '';
const SITE = '_site';

const expected = new Map(Object.entries({
  'app-shell.html': '49661a97e8bce393c5a3d4aaf3800c5dbbaffaf4',
  'app.js': 'c9156a56d4edfc1b7b54d04f4a9de96c28d0deb6',
  'styles.css': '1a366734227d23935603e0b9ddcf62ad285ea29f',
  'index.html': 'd68e02f04e68a2340da243837855abf474bc4cce',
  'manifest.webmanifest': '0e50b8a7f3c2717ffabc2436be9b3dc3cbe6a804',
  'sw.js': '69fb7547982509270ddc381ef2f7f4761ba8c57d',
  'icon.svg': 'd8f65d83e7b77566c3d26da9b021ab04370e81dc',
  'icon-192.png': 'eaf56e00009f91c82b6715e21242df3b55068add',
  'icon-512.png': 'a46c35e1b42ab99a00314743f09a430450000873',
  'netlify/edge-functions/access-gate.js': '06ca0af7090f73ddfd509ee295ec7b8e29f4da9d'
}));

function gitBlobSha(buffer) {
  return createHash('sha1')
    .update(Buffer.from(`blob ${buffer.length}\0`))
    .update(buffer)
    .digest('hex');
}

async function loadSource(path) {
  if (LOCAL_SOURCE) return readFile(join(LOCAL_SOURCE, path));
  const url = `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_COMMIT}/${path}`;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Falha ao obter ${path}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function verifiedSource(path) {
  const buffer = await loadSource(path);
  const actual = gitBlobSha(buffer);
  const wanted = expected.get(path);
  if (actual !== wanted) throw new Error(`BASELINE DIVERGIU: ${path} esperado=${wanted} recebido=${actual}`);
  return buffer;
}

function brandText(value) {
  return value.replaceAll('CalculaAê', 'TESTE NETLIFY OF').replaceAll('VETTA', 'TESTE NETLIFY OF');
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
  value = value.replace(onboarding, `  prepareOnboarding() {\n    // Onboarding reservado para uma fase futura da reconstrução.\n    return;\n  },\n  fillOnboardingFuel`);
  value = brandText(value);
  value = value.replaceAll('vetta-backup-', 'teste-netlify-of-backup-');
  return value;
}

await rm(SITE, { recursive: true, force: true });
await mkdir(SITE, { recursive: true });
await rm('netlify/edge-functions', { recursive: true, force: true });
await mkdir('netlify/edge-functions', { recursive: true });

for (const path of expected.keys()) {
  const buffer = await verifiedSource(path);
  if (path.startsWith('netlify/edge-functions/')) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buffer);
    continue;
  }
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
    await writeFile(target, buffer.toString('utf8').replace("const CACHE = 'calculaae-install-flow-5';", "const CACHE = 'teste-netlify-of-zip-baseline-1';"));
  } else {
    await writeFile(target, buffer);
  }
}

const wrapper = `import gate from './access-gate.js';\n\nexport default async (request, context) => {\n  const response = await gate(request, context);\n  const type = response.headers.get('content-type') || '';\n  if (!type.includes('text/html')) return response;\n  const body = (await response.text()).replaceAll('CalculaAê', 'TESTE NETLIFY OF').replaceAll('VETTA', 'TESTE NETLIFY OF');\n  const headers = new Headers(response.headers);\n  headers.delete('content-length');\n  return new Response(body, { status: response.status, statusText: response.statusText, headers });\n};\n`;
await writeFile('netlify/edge-functions/teste-netlify-of-access-gate.js', wrapper);

await mkdir(join(SITE, '.well-known'), { recursive: true });
await writeFile(join(SITE, '.well-known', 'teste-netlify-of-baseline.json'), `${JSON.stringify({
  name: 'TESTE NETLIFY OF',
  sourceRepo: SOURCE_REPO,
  sourceCommit: SOURCE_COMMIT,
  zipSha256: '22f83f11d25f4d452ae570e0153e9289d02060c423ad4bd5d7a7bcb96235f5c4',
  branch: process.env.BRANCH || 'teste-netlify-of',
  commit: process.env.COMMIT_REF || null
}, null, 2)}\n`);

console.log('TESTE NETLIFY OF baseline verified and built');

// Governança do Faro 2.0: o repositório não tem app antigo, a CI não publica, e a documentação carrega as regras.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const ler = (p) => readFileSync(p, 'utf8');

test('nenhum arquivo do app antigo na raiz', () => {
  const raiz = readdirSync('.');
  const legado = raiz.filter((f) => /^(app\.js|app-shell\.html|legacy-shell\.html|styles\.css|index\.html|sw\.js|netlify\.toml)$|^faro-.*\.js$/.test(f));
  assert.deepEqual(legado, []);
  for (const f of ['scripts/build-static-site.mjs', 'ci/baseline-integrity.json', 'docs/archive', 'docs/superpowers', 'specs/active/FARO-WU-001']) {
    assert.ok(!existsSync(f), `${f} deveria ter sido apagado`);
  }
});

test('package.json: nome humano e comandos novos', () => {
  const pkg = JSON.parse(ler('package.json'));
  assert.equal(pkg.name, 'faro');
  assert.equal(pkg.scripts.build, 'node scripts/build-app.mjs');
  assert.match(pkg.scripts.check, /node --test/);
  assert.doesNotMatch(pkg.scripts.check, /node --check|build-static-site/);
});

test('hospedagem: Cloudflare Workers Static Assets, preview igual a produção', () => {
  const w = ler('wrangler.jsonc');
  assert.match(w, /"directory": "\.\/_site"/);
  assert.match(w, /node scripts\/build-app\.mjs/);
  assert.match(ler('governance/hosting-policy.md'), /Cloudflare/);
});

test('CI: só pull_request, cancela execução antiga, nunca publica', () => {
  const nomes = readdirSync('.github/workflows').filter((n) => /\.ya?ml$/.test(n));
  assert.ok(nomes.length > 0);
  for (const n of nomes) {
    const s = ler(`.github/workflows/${n}`);
    assert.match(s, /^on:\s*\n\s+pull_request:/m, `${n}: só pull_request`);
    assert.doesNotMatch(s, /^\s+(push|schedule|workflow_dispatch):/m, `${n}: sem outros gatilhos`);
    assert.match(s, /cancel-in-progress:\s*true/, `${n}: cancela execução antiga`);
    assert.doesNotMatch(s, /wrangler\s+(deploy|publish)|vercel\s+deploy|netlify\s+deploy|CLOUDFLARE_API_TOKEN/i, `${n}: sem deploy`);
    assert.match(s, /npm run check/);
    assert.match(s, /npm run build/);
  }
});

test('documentação carrega as regras do Faro 2.0', () => {
  const docs = ['README.md', 'PROJECT.md', 'STATUS.md', 'AGENTS.md', ...readdirSync('governance').map((f) => `governance/${f}`)];
  const tudo = docs.map(ler).join('\n');
  for (const termo of [/R\$ 22,99/, /RATAO/, /7 dias/, /04:00/, /idempot/i, /sem deploy autom/i, /npm run check/, /npm run build/, /strix-scan\.sh/, /stripe-cupom-e-preco\.md/, /#21/]) {
    assert.match(tudo, termo);
  }
  for (const f of docs) assert.doesNotMatch(ler(f), /HOSTING_TARGET=VERCEL|AUTOMATIC_VERCEL_GIT_DEPLOYS|REMOTE_FIRST = ALWAYS/, `${f} tem texto do app antigo`);
});

test('decisões registradas: 5 ADRs', () => {
  const adrs = readdirSync('docs/decisions').filter((f) => /^000[1-5]-.*\.md$/.test(f)).sort();
  assert.deepEqual(adrs, [
    '0001-estado-v2-sem-migracao.md',
    '0002-interface-compilada-sem-eval.md',
    '0003-dia-de-trabalho-vira-as-4h.md',
    '0004-hospedagem-cloudflare-preview-igual-producao.md',
    '0005-so-funciona-instalado.md',
  ]);
});

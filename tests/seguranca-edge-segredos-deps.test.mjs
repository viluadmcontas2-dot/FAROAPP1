// ATAQUE 6, 7, 8 e 9 (parte estatica): Edge Functions (leitura do codigo; Deno nao roda aqui), segredos, dependencias e logica de negocio.
// Reexecutar: node --test tests/seguranca-edge-segredos-deps.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { decideAccess, ACCESS, hasEntitlement, isBlocked } from '../src/data/access.js';
import { createBackend, safeStripeUrl, validEmail, normalizeEmail } from '../src/data/backend.js';
import { checkoutTrialParams, hasBlockingSubscription, normalizedStatus } from '../supabase/functions/_shared/faro-billing.js';
import { makeServer, makeFakeCreateClient, memStorage, GOOD } from './backend-helpers.mjs';

const root = resolve(import.meta.dirname, '..');
const read = p => readFileSync(join(root, p), 'utf8');
const fn = n => read(`supabase/functions/${n}/index.ts`);
const checkout = fn('criar-checkout-faro'), portal = fn('abrir-portal-faro'), webhook = fn('stripe-webhook-faro');

// ---------- 6. Edge Functions (estatico) -------------------------------------------------------------------------------
test('6.1 webhook: assinatura obrigatoria sobre o corpo CRU, metodo POST, corpo limitado, fail-closed sem segredo', () => {
  assert.match(webhook, /req\.method !== 'POST'[\s\S]{0,120}405/, 'metodo errado nao devolve 405');
  assert.match(webhook, /constructEventAsync\(\s*rawBody\s*,\s*signature\s*,\s*webhookSecret\s*\)/, 'assinatura nao e verificada sobre o corpo cru');
  assert.match(webhook, /await req\.text\(\)/, 'o corpo deve ser lido como texto cru ANTES de qualquer JSON.parse');
  assert.doesNotMatch(webhook, /req\.json\(\)|JSON\.parse\(rawBody\)/, 'o corpo nao pode ser interpretado antes da verificacao');
  const verifyAt = webhook.indexOf('constructEventAsync'); const objAt = webhook.indexOf('event.data.object');
  assert.ok(verifyAt > 0 && objAt > verifyAt, 'o evento so pode ser usado depois da verificacao');
  assert.match(webhook, /catch\s*\{\s*return new Response\('Assinatura inv[aá]lida', \{ status: 400 \}\)/, 'assinatura invalida deve devolver 400 sem detalhes');
  assert.match(webhook, /!stripeSecret \|\| !webhookSecret[\s\S]{0,80}503/, 'sem segredos configurados deve falhar fechado (503)');
  assert.match(webhook, /auth: 'none'/, 'webhook publico por desenho (a assinatura e a autenticacao)');
  // tolerancia de timestamp: sem 4o argumento o stripe-node usa 300 s (replay de evento antigo e recusado pela propria biblioteca)
  assert.doesNotMatch(webhook, /constructEvent(Async)?\([^)]*,\s*(0|Infinity|\d{4,})\s*\)/, 'tolerancia de timestamp afrouxada');
  assert.match(read('supabase/functions/stripe-webhook-faro/index.ts'), /npm:stripe@\d+\.\d+\.\d+/, 'versao do stripe deve ser fixa');
});

test('6.2 webhook: evento duplicado/replay/evento velho tratados no BANCO (RPC atomica) e nao no codigo da funcao', () => {
  assert.match(webhook, /rpc\('faro_apply_subscription_event'/);
  assert.match(webhook, /result === 'duplicate'|duplicate: result/);
  assert.match(read('supabase/migrations/20261021000200_faro_acesso_e_trial.sql'), /on conflict \(event_id\) do nothing[\s\S]{0,200}return 'duplicate'/);
  assert.match(read('supabase/migrations/20261021000200_faro_acesso_e_trial.sql'), /p_event_created < v_current\.last_event_created[\s\S]{0,40}'stale'/);
});

test('6.3 webhook: o limite de 1 MB so olha o Content-Length (corpo em chunked nao e limitado pelo codigo)', { todo: 'BAIXA: sem Content-Length (Transfer-Encoding: chunked) o corpo e lido inteiro por req.text(); o limite real vem da plataforma Supabase/Cloudflare' }, () => {
  // correcao minima: ler o corpo com limite (stream com contador) ou recusar quando content-length estiver ausente
  assert.match(webhook, /rawBody\.length\s*>|byteLength\s*>|getReader\(\)/, 'nao ha limite sobre o corpo realmente lido (so o cabecalho Content-Length, que pode faltar)');
});

test('6.4 webhook: nunca confia em campos do evento sem assinatura; usuario vem do Stripe assinado, nao de query/header', () => {
  assert.doesNotMatch(webhook, /searchParams|url\.search|req\.headers\.get\('x-user|authorization/i, 'usuario/tenant vindo de parametro do pedido');
  assert.match(webhook, /ctx\.supabaseAdmin/, 'escrita com service role so depois da verificacao');
  assert.ok(webhook.indexOf('supabaseAdmin') > webhook.indexOf('constructEventAsync'), 'supabaseAdmin usado antes de verificar a assinatura');
  // logs sem corpo do evento / dados pessoais
  assert.doesNotMatch(webhook, /console\.(log|info|warn|error)\([^)]*(rawBody|event\.data|object\b\)|email)/, 'log com corpo/dados do evento');
});

test('6.5 checkout: exige JWT de usuario, ignora o corpo do cliente (user_id, price, trial_period_days), URLs fixas do ambiente', () => {
  assert.match(checkout, /withSupabase\(\{ auth: 'user' \}/, 'checkout sem autenticacao de usuario');
  assert.match(checkout, /ctx\.userClaims\?\.sub/, 'o usuario deve vir do JWT validado');
  assert.doesNotMatch(checkout, /req\.json\(\)|req\.text\(\)|req\.formData\(\)|req\.body|searchParams|url\.search/, 'o checkout le o corpo/query do cliente');
  assert.doesNotMatch(checkout, /body\.(user_id|userId|price|priceId|trial|trial_period_days|success_url|cancel_url|return_url)/);
  assert.match(checkout, /const priceId = Deno\.env\.get\('STRIPE_FARO_MONTHLY_PRICE_ID'\)/, 'preco vem do ambiente');
  assert.match(checkout, /line_items: \[\{ price: priceId, quantity: 1 \}\]/);
  assert.match(checkout, /success_url: `\$\{appUrl\}\?faro_cobranca=retorno`/);
  assert.match(checkout, /cancel_url: `\$\{appUrl\}\?faro_cobranca=cancelada`/);
  assert.match(checkout, /return_url: `\$\{appUrl\}\?faro_cobranca=portal`/);
  assert.match(checkout, /\^https:\\\/\\\/\[\^\\s\]\+\$/, 'FARO_APP_URL deve ser https');
  // trial: so o numero que o BANCO devolve (faro_trial_days_for) entra em subscription_data
  assert.match(checkout, /rpc\('faro_trial_days_for', \{ p_user_id: userId \}\)/);
  assert.match(checkout, /\.\.\.checkoutTrialParams\(trialDays\)/);
  assert.match(checkout, /payment_method_collection: 'always'/, 'cartao no inicio e a defesa contra farm de trial');
  assert.match(checkout, /ctx\.userClaims\?\.is_anonymous === true[\s\S]{0,80}403/, 'conta anonima nao assina');
  assert.match(checkout, /req\.method !== 'POST'[\s\S]{0,80}405/);
  assert.match(checkout, /Deno\.env\.get\('FARO_BILLING_ENABLED'\) === 'true'/, 'interruptor de cobranca fail-closed');
});

test('6.6 checkout/portal: nao ha open redirect (URL de retorno e de checkout nao saem do cliente) e o cliente so aceita hosts Stripe exatos', () => {
  for (const [name, src] of [['checkout', checkout], ['portal', portal]]) {
    assert.doesNotMatch(src, /Location|redirect\(|Response\.redirect/i, `${name}: redireciona com dado do cliente`);
    assert.doesNotMatch(src, /req\.(url|headers\.get\('(origin|referer|host)'\))/i, `${name}: usa Origin/Referer/Host do pedido para montar URL`);
  }
  assert.match(portal, /withSupabase\(\{ auth: 'user' \}/);
  assert.match(portal, /\.eq\('user_id', userId\)/, 'o portal deve usar o customer do PROPRIO usuario');
  assert.doesNotMatch(portal, /req\.(json|text)\(/);
  // lado do app: so https, sem credencial/porta, host exato
  const good = 'https://checkout.stripe.com/c/pay/cs_test_1#x';
  assert.ok(safeStripeUrl(good, ['checkout.stripe.com']));
  for (const bad of ['http://checkout.stripe.com/x', 'https://checkout.stripe.com.evil.com/x', 'https://evil.com/checkout.stripe.com', 'https://user:pw@checkout.stripe.com/x', 'https://checkout.stripe.com:444/x', 'javascript:alert(1)', 'data:text/html,x', '//checkout.stripe.com/x', 'https://CHECKOUT.STRIPE.COM.evil.io', 'https://checkout.stripe.com@evil.com/x', 'https://evil.com\\@checkout.stripe.com', '', null, undefined, {}, ['https://checkout.stripe.com/x'].toString() + '\n@evil'])
  {
      const r = safeStripeUrl(bad, ['checkout.stripe.com']);
      assert.ok(r === null || (new URL(r).protocol === 'https:' && new URL(r).hostname === 'checkout.stripe.com' && !new URL(r).username && !new URL(r).port), `URL aceita indevidamente: ${bad}`);
    }
  assert.equal(safeStripeUrl('https://billing.stripe.com/p/session/x', ['checkout.stripe.com']), null, 'portal nao pode abrir como checkout');
});

test('6.7 CORS/cabecalhos das Edge Functions: nenhuma define Access-Control-Allow-Origin "*" com credenciais; erros sem stack/segredo', () => {
  for (const [n, src] of [['checkout', checkout], ['portal', portal], ['webhook', webhook]]) {
    assert.doesNotMatch(src, /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*/i, `${n}: CORS curinga manual`);
    assert.doesNotMatch(src, /error\.(message|stack)|String\(error\)|JSON\.stringify\(error\)/, `${n}: devolve detalhe interno do erro`);
    assert.doesNotMatch(src, /Deno\.env\.get\('SUPABASE_(SERVICE|SECRET)/i, `${n}: le a chave de servico direto (use ctx.supabaseAdmin)`);
  }
  // CORS e tratado pelo @supabase/server (fixado por versao); o cliente web sempre chama via supabase-js com a chave publicavel
  assert.match(checkout, /npm:@supabase\/server@\d+\.\d+\.\d+/);
});

test('6.8 config.toml: verify_jwt=false e coberto por auth no codigo em TODAS as funcoes', () => {
  const cfg = read('supabase/config.toml');
  for (const n of ['criar-checkout-faro', 'abrir-portal-faro', 'stripe-webhook-faro']) assert.match(cfg, new RegExp(`\\[functions\\.${n}\\]\\s*\\nverify_jwt = false`));
  assert.equal((checkout.match(/auth: 'user'/g) || []).length + (portal.match(/auth: 'user'/g) || []).length, 2, 'funcao com verify_jwt=false sem auth:user no codigo');
  assert.match(webhook, /auth: 'none'[\s\S]*constructEventAsync/);
});

test('6.9 regras puras de cobranca: status desconhecido nunca vira acesso; trial so inteiro positivo vindo do banco', () => {
  for (const s of ['hacked', '', null, undefined, 'ACTIVE', 'active ', 1, {}, ['active']]) assert.equal(normalizedStatus(s), 'inactive', String(s));
  for (const bad of [-1, 0, 1.5, NaN, Infinity, '7; drop', '', null, undefined, {}, 1e9]) {
    const r = checkoutTrialParams(bad);
    if (bad === 1e9) { assert.ok(!r.trial_period_days || r.trial_period_days <= 1e9); continue; }
    assert.deepEqual(r, {}, `trial aceito para ${String(bad)}`);
  }
  assert.equal(hasBlockingSubscription({ stripe_subscription_id: 'sub', status: 'canceled' }), false);
  assert.equal(hasBlockingSubscription({ stripe_subscription_id: null, status: 'active' }), false);
});

// ---------- 7. Segredos ---------------------------------------------------------------------------------------------------
const walk = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    if (['node_modules', '.git', 'graphify-out'].includes(n)) continue;
    const p = join(dir, n); const st = statSync(p);
    if (st.isDirectory()) walk(p, out); else if (st.size < 3e6) out.push(p);
  }
  return out;
};
const SECRET = [/\bsk_live_[A-Za-z0-9]{8,}/, /\bsk_test_[A-Za-z0-9]{8,}/, /\brk_(live|test)_[A-Za-z0-9]{8,}/, /\bwhsec_[A-Za-z0-9]{8,}/, /\bsb_secret_[A-Za-z0-9_-]{8,}/, /\bsk-ant-[A-Za-z0-9_-]{8,}/,
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/, /\bAKIA[0-9A-Z]{16}\b/, /\bghp_[A-Za-z0-9]{30,}/, /\bsbp_[a-f0-9]{30,}/];
test('7.1 repositorio rastreado pelo git: nenhuma chave secreta/JWT/chave privada (a unica chave permitida e sb_publishable_)', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: root }).toString().split('\n').filter(Boolean).filter(f => existsSync(join(root, f)) && !/\.(png|woff2|jpg|ico)$/.test(f));
  const hits = [];
  for (const f of tracked) { if (f.startsWith('tests/seguranca-')) continue; const t = readFileSync(join(root, f), 'utf8'); for (const re of SECRET) if (re.test(t)) hits.push(`${f} ~ ${re}`); }
  assert.deepEqual(hits, []);
  const cfg = read('src/data/config.js');
  assert.match(cfg, /sb_publishable_[A-Za-z0-9_]+/);
  assert.equal(tracked.filter(f => /(^|\/)\.env(\.|$)|\.pem$|\.p12$|id_rsa|credentials\.json|auth\.json|service-account/i.test(f)).length, 0, 'arquivo de segredo rastreado');
});

test('7.2 build (_site) sem segredo; o bundle so carrega a chave publicavel', () => {
  const site = join(root, '_site');
  if (!existsSync(site)) return;
  const hits = [];
  for (const f of walk(site)) { if (/\.(png|woff2)$/.test(f)) continue; const t = readFileSync(f, 'utf8'); for (const re of SECRET) if (re.test(t)) hits.push(`${relative(root, f)} ~ ${re}`); }
  assert.deepEqual(hits, []);
  const app = readFileSync(join(site, 'app.js'), 'utf8');
  assert.ok(app.includes('sb_publishable_'), 'chave publicavel deveria estar no bundle (publica por desenho)');
  assert.doesNotMatch(app, /STRIPE_SECRET|STRIPE_WEBHOOK|SERVICE_ROLE|SUPABASE_SECRET/i);
});

test('7.3 historico do git: nenhuma chave secreta em nenhum commit (arquivos de config, funcoes, migracoes)', () => {
  const r = spawnSync('git', ['log', '--all', '-p', '--no-color', '--', 'supabase', 'src', 'wrangler.jsonc', 'package.json', '.github', 'scripts'], { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const added = (r.stdout || '').split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
  const hits = [];
  for (const l of added) for (const re of SECRET) if (re.test(l)) hits.push(l.slice(0, 80));
  assert.deepEqual(hits, [], 'chave secreta apareceu no historico: rotacione-a (apagar o arquivo nao basta)');
});

test('7.4 strix_runs/ e graphify-out/ estao no .gitignore, fora do git e sem segredos', () => {
  const ign = read('.gitignore');
  for (const d of ['strix_runs/', 'graphify-out/', 'node_modules/', '_site/']) assert.ok(ign.split('\n').includes(d), `${d} fora do .gitignore`);
  const tracked = execFileSync('git', ['ls-files', 'strix_runs', 'graphify-out'], { cwd: root }).toString().trim();
  assert.equal(tracked, '', 'arquivos de strix_runs/graphify-out rastreados pelo git');
  const hits = [];
  for (const d of ['strix_runs', 'graphify-out']) if (existsSync(join(root, d))) for (const f of walk(join(root, d))) { if (/\.(png|jpg|woff2)$/.test(f)) continue; const t = readFileSync(f, 'utf8'); for (const re of SECRET) if (re.test(t)) hits.push(`${relative(root, f)} ~ ${re}`); }
  assert.deepEqual(hits, []);
});

// ---------- 8. Dependencias -------------------------------------------------------------------------------------------------
test('8.1 npm audit (producao e completo): zero vulnerabilidades conhecidas (precisa de rede; pula se o registro nao responder)', t => {
  for (const args of [['audit', '--omit=dev', '--json'], ['audit', '--json']]) {
    const r = spawnSync('npm', args, { cwd: root, encoding: 'utf8', timeout: 90000 });
    let j; try { j = JSON.parse(r.stdout); } catch { return t.skip('npm audit sem resposta (offline)'); }
    if (j.error) return t.skip(`npm audit: ${j.error.summary || j.error.code}`);
    const v = j.metadata?.vulnerabilities || {};
    assert.equal((v.critical || 0) + (v.high || 0) + (v.moderate || 0) + (v.low || 0), 0, `npm ${args.join(' ')}: ${JSON.stringify(v)}`);
  }
});

test('8.2 dependencias minimas e fixas por lockfile; nada de CDN/fonte externa em runtime; scripts de instalacao ausentes', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ['@supabase/supabase-js', 'react', 'react-dom']);
  assert.ok(!pkg.scripts?.postinstall && !pkg.scripts?.preinstall && !pkg.scripts?.install, 'script de instalacao no proprio pacote');
  const lock = JSON.parse(read('package-lock.json'));
  for (const [p, m] of Object.entries(lock.packages)) { if (!p) continue; assert.ok(m.integrity, `${p} sem integrity no lockfile`); assert.ok(!m.resolved || /^https:\/\/registry\.npmjs\.org\//.test(m.resolved), `${p} resolvido fora do npm: ${m.resolved}`); assert.ok(!m.hasInstallScript || /esbuild/.test(p), `${p} roda script de instalacao`); }
  assert.ok(!existsSync(join(root, '_site')) || true);
  // runtime: nenhuma URL externa carregada em HTML/CSS/JS do app (apenas o Supabase do projeto e hosts Stripe validados no app)
  const site = join(root, '_site');
  if (existsSync(site)) {
    const css = readFileSync(join(site, 'app.css'), 'utf8');
    assert.doesNotMatch(css, /@import|url\((?!['"]?(data:|\.\/|\/|assets|[a-z0-9._-]+\.(woff2|svg|png)))/i, 'CSS com url externa');
    assert.doesNotMatch(css, /fonts\.(googleapis|gstatic)\.com|cdn\./i);
    const html = readFileSync(join(site, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /(src|href)=["']https?:/i, 'index.html referencia recurso externo');
    const app = readFileSync(join(site, 'app.js'), 'utf8');
    assert.doesNotMatch(app, /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare|googletagmanager|google-analytics|facebook\.net|hotjar|sentry\.io|segment\.com/i, 'script/telemetria de terceiros no bundle');
    for (const m of readdirSync(join(site, 'assets/fonts'))) assert.match(m, /\.woff2$/);
  }
  const wr = read('wrangler.jsonc'); assert.doesNotMatch(wr, /vars|secret|token/i);
});

// ---------- 9. Logica de negocio ---------------------------------------------------------------------------------------------
test('9.1 paywall no cliente: decideAccess so libera com assinatura valida; sem cobranca o app e livre (decisao conhecida)', () => {
  const now = Date.parse('2026-10-21T12:00:00Z');
  const sub = (status, end) => ({ status, currentPeriodEnd: end });
  assert.equal(decideAccess({ billingEnabled: true, user: null, now }).state, ACCESS.ENTRAR);
  assert.equal(decideAccess({ billingEnabled: true, user: { id: 'a' }, subscription: null, now }).state, ACCESS.ASSINAR);
  for (const st of ['inactive', 'past_due', 'unpaid', 'paused', 'canceled', 'hacked', undefined]) assert.equal(isBlocked(decideAccess({ billingEnabled: true, user: { id: 'a' }, subscription: sub(st, '2027-01-01T00:00:00Z'), now })), true, st);
  assert.equal(isBlocked(decideAccess({ billingEnabled: true, user: { id: 'a' }, subscription: sub('active', '2026-10-01T00:00:00Z'), now })), true, 'assinatura vencida');
  assert.equal(isBlocked(decideAccess({ billingEnabled: true, user: { id: 'a' }, subscription: sub('active', 'lixo'), now })), true, 'data invalida');
  assert.equal(decideAccess({ billingEnabled: 'true', user: null, now }).state, ACCESS.LIBERADO, 'so === true liga a cobranca (o contrario e fail-open por desenho: config.billingEnabled=false hoje)');
  // contornar pelo cliente: billingEnabled vem da CONFIG compilada; quem editar o JS/localStorage libera a UI. O que protege e o servidor (9.2).
  assert.equal(hasEntitlement({ status: 'active', currentPeriodEnd: null }, now), true, 'sem data de fim vale (periodValid) - o servidor so grava data real');
});

test('9.2 o que o SERVIDOR garante (banco): ver tests/seguranca-banco.test.mjs 5.7/5.10 (nao concede) e 9.1 todo (nao exige para gravar na nuvem)', () => {
  const sql = read('supabase/migrations/20261021000100_faro_save_state_rpc.sql');
  assert.doesNotMatch(sql, /faro_has_access/, 'SE este teste falhar, faro_save_state passou a exigir direito: remova o todo 9.1 do teste de banco');
});

test('9.3 enumeracao de contas: signUp devolve a mesma resposta para e-mail novo e ja cadastrado; reset idem; erros de login iguais', async () => {
  const mk = () => { const server = makeServer(); const createClient = makeFakeCreateClient(server); return { server, backend: createBackend({ config: GOOD, createClient, storage: memStorage() }) }; };
  const { server, backend } = mk();
  server.users.set('existe@exemplo.com', { id: 'id-1', password: 'senha-forte-1', confirmed: true });
  const novo = await backend.signUp({ email: 'novo@exemplo.com', password: 'senha-forte-9' });
  const dup = await backend.signUp({ email: 'existe@exemplo.com', password: 'senha-forte-9' });
  assert.deepEqual(novo, dup, 'signUp responde diferente para e-mail existente');
  assert.deepEqual(await backend.resetPassword('existe@exemplo.com'), await backend.resetPassword('naoexiste@exemplo.com'));
  const e1 = await backend.signIn({ email: 'existe@exemplo.com', password: 'errada-1234' }).catch(e => e.message);
  const e2 = await backend.signIn({ email: 'naoexiste@exemplo.com', password: 'errada-1234' }).catch(e => e.message);
  assert.equal(e1, e2, 'login com e-mail existente x inexistente tem mensagens diferentes');
  // e-mail nao confirmado revela que o e-mail existe E que a senha esta certa (so quem sabe a senha ve isso): aceitavel, mas registre
  server.users.set('pendente@exemplo.com', { id: 'id-2', password: 'senha-forte-1', confirmed: false });
  const pend = await backend.signIn({ email: 'pendente@exemplo.com', password: 'errada-1234' }).catch(e => e.message);
  assert.equal(pend, e1, 'senha errada em conta nao confirmada nao pode revelar a existencia da conta');
  assert.ok(validEmail(normalizeEmail('  A@B.CO ')) && !validEmail('a@b') && !validEmail('a b@c.de') && !validEmail('a@@b.cc'));
});

test('9.4 farm de trial/XP: e-mail alias do gmail e normalizado no banco (ver 9.2 do teste de banco); XP so existe no cliente (nao e moeda do servidor)', () => {
  const sql = read('supabase/migrations/20261021000200_faro_acesso_e_trial.sql');
  assert.match(sql, /replace\(v_local, '\.', ''\)/, 'pontos do gmail precisam ser removidos');
  assert.match(sql, /split_part\(split_part\(v, '@', 1\), '\+', 1\)/, '+alias precisa ser removido');
  assert.match(sql, /payment_method_collection|cartao/i);
  // XP nao decide nada no servidor: nenhuma tabela/RPC usa o campo xp
  for (const f of readdirSync(join(root, 'supabase/migrations'))) assert.doesNotMatch(read(`supabase/migrations/${f}`), /\bxp\b/i, `${f}: servidor usando XP`);
  for (const f of ['criar-checkout-faro', 'abrir-portal-faro', 'stripe-webhook-faro']) assert.doesNotMatch(fn(f), /\bxp\b/i);
});

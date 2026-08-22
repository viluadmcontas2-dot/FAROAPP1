import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const account = await readFile('faro-account.js', 'utf8');
const config = await readFile('faro-config.js', 'utf8');

// N5: backend dedicado ativo sem confundir configuração publicável com privilégio server-side.
assert.match(config, /supabaseUrl: 'https:\/\/mjbyqhreptllilkggiri\.supabase\.co'/);
assert.match(config, /supabasePublishableKey: 'sb_publishable_[A-Za-z0-9_-]+'/);
assert.doesNotMatch(config, /gwssfwtbepaedxgzmjpe/,
  'FARO Financeiro não pode reutilizar o backend do FARO Corridas');
assert.doesNotMatch(config, /sb_secret_|service_role|SUPABASE_SECRET_KEYS/,
  'Configuração do navegador deve continuar estritamente publicável');

// 9.49 — offline primeiro: toda alteração salva localmente; sync só agenda quando há conta + internet.
assert.match(account, /const result = baseSave\.apply\(this, args\)/, 'Save remoto nunca pode substituir o save local');
assert.match(account, /meta\.localRevision \+= 1/);
assert.match(account, /meta\.dirty = true/);
assert.match(account, /if \(!configured \|\| !session \|\| !navigator\.onLine\) return;/, 'Sync agendado precisa respeitar offline');
assert.match(account, /window\.addEventListener\('online'[\s\S]*syncNow\(\)/, 'Retorno da internet precisa retomar sync');
assert.match(account, /upsert\(payload, \{ onConflict:'user_id' \}\)/, 'Snapshot remoto precisa ser único por usuário, evitando append duplicado');
assert.match(account, /if \(!configured \|\| !session\?\.user \|\| !navigator\.onLine \|\| syncing\) return;/, 'Sync concorrente precisa ser bloqueado');

// Conflito nunca pode sobrescrever silenciosamente quando local e remoto divergem.
assert.match(account, /O FARO não vai sobrescrever nada sozinho/);
assert.match(account, /if \(meta\.dirty\)[\s\S]*remote\.revision[\s\S]*meta\.remoteRevision[\s\S]*openConflict\(remote\)/);
assert.match(account, /USAR DADOS DESTE APARELHO/);
assert.match(account, /USAR DADOS SALVOS NA CONTA/);

// 9.50 — assinatura falha/cancelada não pode destruir os dados financeiros.
for (const status of ['past_due','unpaid','paused','canceled']) {
  assert.match(account, new RegExp(`${status}: \\[.*dados.*(?:preservad|salv)`, 'i'), `${status} precisa comunicar preservação de dados`);
}
assert.match(account, /catch \(error\) \{[\s\S]*Não foi possível abrir a assinatura agora\.[\s\S]*faroSubscriptionAction'\)\.disabled = false/,
  'Falha de cobrança precisa apenas devolver controle da ação');

// 9.51 — novo aparelho/estado local vazio deve restaurar o snapshot remoto após login.
assert.match(account, /if \(!stateHasMeaningfulData\(app\.state\)\) \{[\s\S]*applyRemote\(remote\);[\s\S]*return;/);
assert.match(account, /app\.state = app\.normalizeState\(remote\.state \|\| \{\}\)/, 'Restauração precisa passar pela normalização canônica');

// 9.52 — usuário A → logout → usuário B não pode manter o estado financeiro de A na superfície ativa.
assert.match(account, /if \(meta\.userId && meta\.userId !== userId\) \{[\s\S]*applyRemote\(remote\);[\s\S]*return;/,
  'Mudança de usuário detectada precisa carregar explicitamente o remoto do novo usuário');
assert.match(account, /await client\.auth\.signOut\(\);[\s\S]*localStorage\.removeItem\(SYNC_META_KEY\);[\s\S]*app\.state = app\.cloneDefaults\(\);[\s\S]*app\.state\.onboardingComplete = false/,
  'Logout seguro precisa limpar metadado da conta e retirar dados do usuário anterior da superfície ativa');
assert.match(account, /if \(!navigator\.onLine\) return app\.toast\('Conecte-se à internet para sair sem arriscar dados não sincronizados\.'/,
  'Logout offline deve ser bloqueado quando poderia perder alterações ainda locais');

console.log('FARO B9: continuidade offline, conflito explícito, assinatura sem perda e isolamento entre usuários 9.49–9.52 protegidos — backend dedicado ativo');

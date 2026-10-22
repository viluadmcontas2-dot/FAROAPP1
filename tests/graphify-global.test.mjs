import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync, openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = new URL('../scripts/graphify-global/instalar-global.sh', import.meta.url);
const gancho = new URL('../.claude/hooks/graphify-gate.sh', import.meta.url);
const pre = 'bash "$HOME/.claude/hooks/graphify-gate.sh"';
function ambiente(t) {
  const home = mkdtempSync(join(tmpdir(), 'global com espaços-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(join(home, '.claude'));
  return { home, settings: join(home, '.claude/settings.json') };
}
function instalar(home, viaEntrada = false) {
  const fd = openSync(viaEntrada ? script : '/dev/null', 'r');
  let r;
  try { r = spawnSync('bash', viaEntrada ? [] : [script.pathname], {
    stdio: [fd, 'pipe', 'pipe'],
    cwd: tmpdir(), env: { ...process.env, GRAPHIFY_GATE_HOME: home }, encoding: 'utf8', timeout: 5000,
  }); } finally { closeSync(fd); }
  assert.equal(r.status, 0, r.stderr);
  return r.stdout + r.stderr;
}
function conferir(home, settings) {
  const destino = join(home, '.claude/hooks/graphify-gate.sh');
  assert.deepEqual(readFileSync(destino), readFileSync(gancho));
  assert.ok(statSync(destino).mode & 0o111);
  const s = JSON.parse(readFileSync(settings, 'utf8'));
  for (const [evento, matcher, comando] of [
    ['PreToolUse', 'Grep|Glob', pre], ['PostToolUse', 'Bash', pre + ' mark'],
  ]) {
    const entradas = s.hooks[evento].filter(h => h.hooks.some(x => x.command === comando));
    assert.equal(entradas.length, 1);
    assert.equal(entradas[0].matcher, matcher);
    assert.equal(entradas[0].hooks.filter(x => x.command === comando).length, 1);
  }
  return s;
}
test('instala duas vezes, cria configurações e funciona via entrada padrão fora do repo', t => {
  const { home, settings } = ambiente(t);
  instalar(home, true);
  const antes = readFileSync(settings);
  assert.match(instalar(home, true), /já instalado/i);
  assert.deepEqual(readFileSync(settings), antes);
  conferir(home, settings);
});
test('preserva chaves e ganchos existentes e mantém backup único', t => {
  const { home, settings } = ambiente(t);
  const original = { permissions: { allow: ['Read'] }, outro: 7, hooks: {
    SessionStart: [{ hooks: [{ type: 'command', command: 'inicio' }] }],
    Stop: [{ hooks: [{ type: 'command', command: 'fim' }] }],
    PreToolUse: [{ matcher: 'Read', hooks: [{ type: 'command', command: 'outro' }] }],
  } };
  const bytes = JSON.stringify(original);
  writeFileSync(settings, bytes);
  instalar(home);
  instalar(home);
  const s = conferir(home, settings);
  assert.deepEqual(s.permissions, original.permissions);
  assert.equal(s.outro, 7);
  for (const chave of ['SessionStart', 'Stop']) assert.deepEqual(s.hooks[chave], original.hooks[chave]);
  assert.deepEqual(s.hooks.PreToolUse[0], original.hooks.PreToolUse[0]);
  assert.equal(readFileSync(settings + '.bak-graphify', 'utf8'), bytes);
});
test('JSON inválido mantém original e backup e informa erro com saída zero', t => {
  const { home, settings } = ambiente(t);
  writeFileSync(settings, '{inválido');
  for (let i = 0; i < 2; i++) assert.match(instalar(home), /erro.*JSON/i);
  assert.equal(readFileSync(settings, 'utf8'), '{inválido');
  assert.equal(readFileSync(settings + '.bak-graphify', 'utf8'), '{inválido');
});
test('as duas cópias do gancho são idênticas byte a byte', () => {
  assert.deepEqual(readFileSync(new URL('../scripts/graphify-global/graphify-gate.sh', import.meta.url)), readFileSync(gancho));
});

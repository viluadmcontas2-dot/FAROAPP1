// Gancho que garante a consulta ao mapa do código (Graphify) antes de buscas amplas.
// Regra (modo estrito): busca (Grep/Glob) sem consulta recente ao mapa é SEMPRE barrada, com a instrução.
// A consulta é um comando de terminal (Bash), que nunca é bloqueado: não há como ficar preso.
// Consultar o mapa (graphify query/path/explain) libera por 20 minutos. Sem mapa, nunca barra.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, utimesSync, symlinkSync, rmSync, openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = new URL('../.claude/hooks/graphify-gate.sh', import.meta.url).pathname;

const bin = mkdtempSync(join(tmpdir(), 'gate-path-'));
const falso = join(bin, 'com-graphify');
mkdirSync(falso);
for (const cmd of ['bash', 'python3', 'date', 'stat', 'cat', 'grep', 'touch']) {
  symlinkSync(spawnSync('/bin/bash', ['-c', 'command -v ' + cmd], { encoding: 'utf8', timeout: 1000 }).stdout.trim(), join(bin, cmd));
}
writeFileSync(join(falso, 'graphify'), '#!/bin/bash\nexit 0\n', { mode: 0o755 });
after(() => rmSync(bin, { recursive: true, force: true }));
const projeto = ({ comMapa = true } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'gate-'));
  mkdirSync(join(dir, 'graphify-out'), { recursive: true });
  if (comMapa) writeFileSync(join(dir, 'graphify-out', 'graph.json'), '{"nodes":[],"links":[]}');
  return dir;
};
const rodar = (dir, entrada, arg = '', comGraphify = true) => {
  const arquivo = join(dir, 'entrada.json');
  writeFileSync(arquivo, typeof entrada === 'string' ? entrada : JSON.stringify(entrada));
  const fd = openSync(arquivo, 'r');
  try {
    return spawnSync('bash', [SCRIPT, arg].filter(Boolean), {
      stdio: [fd, 'pipe', 'pipe'],
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir, PATH: comGraphify ? falso + ':' + bin : bin },
      encoding: 'utf8', timeout: 5000,
    });
  } finally { closeSync(fd); }
};
const grep = { hook_event_name: 'PreToolUse', tool_name: 'Grep', tool_input: { pattern: 'closeDay' } };
const glob = { hook_event_name: 'PreToolUse', tool_name: 'Glob', tool_input: { pattern: 'src/**/*.js' } };
const bash = cmd => ({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: cmd } });
const decisao = r => (r.stdout.trim() ? JSON.parse(r.stdout).hookSpecificOutput : null);

test('busca ampla sem consulta recente é barrada, dizendo o comando a rodar', () => {
  const d = projeto();
  const o = decisao(rodar(d, grep));
  assert.equal(o.permissionDecision, 'deny');
  assert.match(o.permissionDecisionReason, /graphify query/);
});

test('continua barrando até consultar o mapa (modo estrito)', () => {
  const d = projeto();
  rodar(d, grep);
  assert.equal(decisao(rodar(d, glob)).permissionDecision, 'deny');
  assert.equal(decisao(rodar(d, grep)).permissionDecision, 'deny');
});

test('o arquivo graphify-out/.sem-trava desliga a trava (saída de emergência)', () => {
  const d = projeto();
  writeFileSync(join(d, 'graphify-out', '.sem-trava'), '');
  assert.equal(rodar(d, grep).stdout.trim(), '');
});

test('consultar o mapa (query, path ou explain) libera e fica registrado', () => {
  for (const cmd of ['graphify query "como fecha o dia"', 'graphify path "A" "B"', 'graphify explain "calc"']) {
    const d = projeto();
    rodar(d, bash(cmd), 'mark');
    assert.equal(rodar(d, grep).stdout.trim(), '', cmd);
    assert.match(readFileSync(join(d, 'graphify-out', 'uso.log'), 'utf8'), /consulta/);
  }
});

test('comando que não é consulta ao mapa não libera', () => {
  const d = projeto();
  rodar(d, bash('npm run check'), 'mark');
  assert.equal(decisao(rodar(d, grep)).permissionDecision, 'deny');
});

test('sem mapa construído nunca barra', () => {
  const d = projeto({ comMapa: false });
  assert.equal(rodar(d, grep).stdout.trim(), '');
});

test('depois de 20 minutos sem consultar, barra de novo', () => {
  const d = projeto();
  rodar(d, bash('graphify query "x"'), 'mark');
  assert.equal(rodar(d, grep).stdout.trim(), '');
  const velho = new Date(Date.now() - 21 * 60 * 1000);
  utimesSync(join(d, 'graphify-out', '.consultado'), velho, velho);
  assert.equal(decisao(rodar(d, grep)).permissionDecision, 'deny');
});

test('entrada inválida ou vazia nunca derruba o trabalho', () => {
  const d = projeto();
  const r = rodar(d, 'isto não é json');
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('o lembrete também fica no registro de uso, para medir quanto o mapa é usado', () => {
  const d = projeto();
  rodar(d, grep);
  assert.ok(existsSync(join(d, 'graphify-out', 'uso.log')));
  assert.match(readFileSync(join(d, 'graphify-out', 'uso.log'), 'utf8'), /lembrete/);
});

test('o projeto liga o gancho no .claude/settings.json (Grep|Glob antes, Bash depois)', () => {
  const s = JSON.parse(readFileSync(new URL('../.claude/settings.json', import.meta.url), 'utf8'));
  const pre = s.hooks.PreToolUse.find(h => /Grep/.test(h.matcher) && /Glob/.test(h.matcher));
  assert.ok(pre, 'falta PreToolUse Grep|Glob');
  assert.match(pre.hooks[0].command, /graphify-gate\.sh/);
  const pos = s.hooks.PostToolUse.find(h => h.matcher === 'Bash');
  assert.ok(pos, 'falta PostToolUse Bash');
  assert.match(pos.hooks[0].command, /graphify-gate\.sh.* mark/);
});

test('sem graphify no PATH nunca barra mesmo com mapa e sem consulta', () => {
  const d = projeto();
  for (const entrada of [grep, glob]) {
    const r = rodar(d, entrada, '', false);
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  }
});
test('com graphify no PATH continua barrando sem consulta', () => {
  assert.equal(decisao(rodar(projeto(), grep)).permissionDecision, 'deny');
});

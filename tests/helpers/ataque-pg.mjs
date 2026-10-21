// Apoio dos testes de ataque ao banco: sobe um Postgres TEMPORARIO (nunca o Supabase real), aplica o stub do auth
// e todas as migracoes, e deixa o atacante rodar SQL como `anon`, `authenticated` (com uid forjado) ou `service_role`.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const PG_DIRS = existsSync('/usr/lib/postgresql') ? readdirSync('/usr/lib/postgresql').sort() : [];
const BIN = PG_DIRS.length ? `/usr/lib/postgresql/${PG_DIRS[PG_DIRS.length - 1]}/bin` : null;
export const pgAvailable = () => Boolean(BIN && existsSync(`${BIN}/initdb`) && existsSync('/usr/bin/psql'));

export const UA = '00000000-0000-0000-0000-00000000000a';
export const UB = '00000000-0000-0000-0000-00000000000b';
export const UC = '00000000-0000-0000-0000-00000000000c';

const asPg = cmd => (process.getuid?.() === 0 ? ['su', ['postgres', '-c', cmd]] : ['bash', ['-c', cmd]]);
const sh = cmd => { const [bin, args] = asPg(cmd); return execFileSync(bin, args, { stdio: 'pipe' }).toString(); };

export function startPg() {
  const dir = mkdtempSync(join(tmpdir(), 'faro-atk-pg-'));
  chmodSync(dir, 0o777);
  const port = 55000 + Math.floor(Math.random() * 900);
  sh(`${BIN}/initdb -D ${dir}/data -A trust >/dev/null`);
  sh(`${BIN}/pg_ctl -D ${dir}/data -o '-p ${port} -k ${dir}' -l ${dir}/log -w start >/dev/null`);
  const base = ['-X', '-q', '-h', dir, '-p', String(port), '-U', 'postgres', '-d', 'postgres'];
  const raw = (sql, { stopOnError = false } = {}) => {
    const r = spawnSync('/usr/bin/psql', [...base, '-A', '-t', '-v', `ON_ERROR_STOP=${stopOnError ? 1 : 0}`, '-c', sql], { encoding: 'utf8' });
    return { ok: r.status === 0 && !/ERROR:/.test(r.stderr || ''), out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
  };
  const file = f => { const r = spawnSync('/usr/bin/psql', [...base, '-v', 'ON_ERROR_STOP=1', '-f', f], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`${f}: ${r.stderr}`); };
  file(join(root, 'tests/sql/stub-auth.sql'));
  for (const f of readdirSync(join(root, 'supabase/migrations')).sort()) file(join(root, 'supabase/migrations', f));
  raw(`insert into auth.users(id,email) values ('${UA}','a@exemplo.com'),('${UB}','b@exemplo.com'),('${UC}','c@exemplo.com')`, { stopOnError: true });

  // roda `sql` como o papel pedido; `uid` forja o claim sub (como o PostgREST faria com um JWT valido)
  const as = (role, uid, sql, claims = {}) => {
    const pre = [`set role ${role}`];
    if (uid) pre.push(`select set_config('request.jwt.claim.sub','${uid}',false)`);
    for (const [k, v] of Object.entries(claims)) pre.push(`select set_config('request.jwt.claim.${k}','${v}',false)`);
    // os `select set_config` imprimem linhas: separa a saida util com um marcador
    return raw(`${pre.join(';')};select '@@';${sql}`);
  };
  const clean = r => ({ ...r, out: r.out.split('@@').pop().trim() });
  const run = (role, uid, sql, claims) => clean(as(role, uid, sql, claims));
  const stop = () => { try { sh(`${BIN}/pg_ctl -D ${dir}/data -m immediate stop >/dev/null`); } catch { /* ja parado */ } rmSync(dir, { recursive: true, force: true }); };
  return {
    raw, stop,
    anon: sql => run('anon', null, sql),
    user: (uid, sql, claims) => run('authenticated', uid, sql, claims),
    service: sql => run('service_role', null, sql, { role: 'service_role' }),
  };
}

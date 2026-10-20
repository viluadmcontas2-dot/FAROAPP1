// Executa as migrations reais num Postgres local e roda o cenário do paywall.
// Requer FARO_TEST_PGHOST (diretório do socket ou host) e FARO_TEST_PGPORT; sem isso, pula.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const host = process.env.FARO_TEST_PGHOST;
const port = process.env.FARO_TEST_PGPORT || '5432';
if (!host) {
  console.log('SKIP billing-sql-behavior: defina FARO_TEST_PGHOST/FARO_TEST_PGPORT para rodar contra Postgres local');
  process.exit(0);
}
const db = `faro_test_${process.pid}`;
const base = ['-h', host, '-p', port, '-U', process.env.FARO_TEST_PGUSER || 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'];
const psql = (args, database = 'postgres') => execFileSync('psql', [...base, '-d', database, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

psql(['-c', `create database ${db}`]);
try {
  psql(['-f', 'tests/sql/supabase-stub.sql'], db);
  for (const file of readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort()) {
    psql(['-f', `supabase/migrations/${file}`], db);
  }
  let output = '';
  try {
    output = psql(['-f', 'tests/sql/billing-paywall.scenario.sql'], db);
  } catch (error) {
    assert.fail(`Cenário SQL falhou:\n${error.stderr || error.message}`);
  }
  assert.match(output, /CENARIO_OK/);
} finally {
  psql(['-c', `drop database if exists ${db}`]);
}
console.log('FARO cobrança SQL: migrations aplicadas e cenário do paywall aprovado em Postgres real — ok');

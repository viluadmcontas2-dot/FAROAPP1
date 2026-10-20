// Executa as migrations reais num Postgres local e roda o cenário do paywall.
// Requer FARO_TEST_PGHOST (diretório do socket ou host) e FARO_TEST_PGPORT; sem isso, pula
// localmente com aviso, mas FALHA quando CI=true (CI nunca pode ficar verde sem rodar o SQL).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const host = process.env.FARO_TEST_PGHOST;
const port = process.env.FARO_TEST_PGPORT || '5432';
if (!host) {
  if (process.env.CI === 'true') {
    console.error('FALHA billing-sql-behavior: CI=true exige Postgres local (defina FARO_TEST_PGHOST/FARO_TEST_PGPORT).');
    process.exit(1);
  }
  console.log('SKIP billing-sql-behavior: defina FARO_TEST_PGHOST/FARO_TEST_PGPORT para rodar contra Postgres local');
  process.exit(0);
}
const base = ['-h', host, '-p', port, '-U', process.env.FARO_TEST_PGUSER || 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'];
const psql = (args, database = 'postgres') => execFileSync('psql', [...base, '-d', database, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const scenarios = readdirSync('tests/sql').filter(name => name.endsWith('.scenario.sql')).sort();
assert.ok(scenarios.length >= 2, 'cenários SQL ausentes');

// Cada cenário roda num banco novo, com o stub e TODAS as migrations reais.
for (const [index, scenario] of scenarios.entries()) {
  const db = `faro_test_${process.pid}_${index}`;
  psql(['-c', `create database ${db}`]);
  try {
    psql(['-f', 'tests/sql/supabase-stub.sql'], db);
    for (const file of readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort()) {
      psql(['-f', `supabase/migrations/${file}`], db);
    }
    let output = '';
    try {
      output = psql(['-f', `tests/sql/${scenario}`], db);
    } catch (error) {
      assert.fail(`Cenário SQL ${scenario} falhou:\n${error.stderr || error.message}`);
    }
    assert.match(output, /CENARIO_OK/, scenario);
  } finally {
    psql(['-c', `drop database if exists ${db}`]);
  }
}
console.log(`FARO cobrança SQL: migrations aplicadas e ${scenarios.length} cenários aprovados em Postgres real — ok`);

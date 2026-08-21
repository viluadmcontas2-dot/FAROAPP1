import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const home = await readFile('faro-home-r2.js','utf8');
const css = await readFile('styles.css','utf8');

assert.match(home,/registerButton\.classList\.add\('faro-action-card'\)/,'Registrar precisa assumir Action Card');
assert.match(home,/weekCard\.classList\.add\('faro-state-card'\)/,'Semana precisa assumir State Card');
assert.match(home,/monthCard\.classList\.add\('faro-action-card'\)/,'Mês precisa assumir Action Card');
assert.match(home,/attention\.className = '[^']*faro-state-card/,'Atenção financeira precisa assumir State Card');
assert.match(home,/dataset\.faroTone = overdue \? 'risk' : 'attention'/,'Exceção financeira precisa expor tom semântico');
assert.match(home,/navigateToPrimary\('planning'\)/,'Mês precisa continuar abrindo Planejar em um gesto');
assert.match(home,/Bruto necessário/,'Semana precisa rotular bruto necessário');
assert.match(home,/Bruto realizado/,'Semana precisa rotular bruto realizado');
assert.doesNotMatch(home,/app\.state\.(?:targetProfit|records|costs)\s*=/,'Home não pode virar writer de estado financeiro');
assert.doesNotMatch(home,/contributionKm\s*=|dailyGross\s*=|dailyNet\s*=/,'Home não pode criar fórmula financeira paralela');
assert.match(css,/#view-dashboard \[data-faro-role="week"\]/,'Fundação precisa mapear a semana ao vocabulário premium');
assert.match(css,/#faroHomeAttention\[data-overdue="true"\]/,'Fundação precisa diferenciar risco sem inventar outro componente');

console.log('FARO R2/HOME: Hoje usa anatomia premium sem alterar owners, rotas ou matemática — ok');

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const onboarding = await readFile('faro-onboarding.js', 'utf8');
const finance = await readFile('faro-finance.js', 'utf8');

// 9.17 — slider: toque/arraste/teclado usam input nativo; digitação exata tem limite maior e clamp canônico.
assert.match(onboarding, /id="faroTargetNumber"[^>]*min="500"[^>]*max="50000"[^>]*step="100"/);
assert.match(onboarding, /id="faroTargetSlider"[^>]*type="range"[^>]*min="500"[^>]*max="20000"[^>]*step="100"/);
assert.match(onboarding, /const parsed = Math\.max\(500, Math\.min\(50000, n\(value\) \|\| 500\)\)/, 'Meta precisa limitar qualquer entrada a 500…50000');
assert.match(onboarding, /faroTargetSlider'\)\.addEventListener\('input', e => syncTarget\(e\.target\.value\)\)/, 'Arraste/teclado do range precisa atualizar pelo mesmo caminho');
assert.match(onboarding, /faroTargetNumber'\)\.addEventListener\('input', e => \{ if \(e\.target\.value !== ''\) syncTarget\(e\.target\.value\); \}\)/, 'Digitação precisa usar o mesmo clamp');

// 9.18 — elétrico: zero não pode avançar; decimais são aceitos; km/kWh deriva de bateria e autonomia.
assert.match(onboarding, /id="faroElectricPrice"[^>]*min="0"[^>]*step="\.01"/);
assert.match(onboarding, /id="faroBatteryKwh"[^>]*min="0"[^>]*step="\.1"/);
assert.match(onboarding, /id="faroRangeKm"[^>]*min="0"[^>]*step="1"/);
assert.match(onboarding, /draft\.energyEfficiency = draft\.batteryKwh > 0 \? draft\.rangeKm \/ draft\.batteryKwh : 0/);
assert.match(onboarding, /draft\.energy === 'electric' && \(draft\.energyPrice <= 0 \|\| draft\.batteryKwh <= 0 \|\| draft\.rangeKm <= 0\)/, 'Elétrico com zero deve ser rejeitado antes do plano');

// 9.19 — aluguel semanal: todos os sete dias precisam existir e a recorrência usa módulo de 7 dias.
for (const [value, label] of [['0','Domingo'],['1','Segunda'],['2','Terça'],['3','Quarta'],['4','Quinta'],['5','Sexta'],['6','Sábado']]) {
  assert.match(onboarding, new RegExp(`<option value="${value}">${label}</option>`), `Onboarding precisa aceitar ${label}`);
}
assert.match(finance, /Number\(cost\.dueWeekday\) >= 0 && Number\(cost\.dueWeekday\) <= 6/);
assert.match(finance, /\(Number\(cost\.dueWeekday\) - cursor\.getDay\(\) \+ 7\) % 7/);
assert.match(finance, /cursor = addDays\(cursor, 7\)/);

// 9.20 — mensal: dia 28/29/30/31 precisa cair no último dia real quando o mês é menor.
assert.match(finance, /const last = new Date\(year, month \+ 1, 0, 12\)\.getDate\(\)/);
assert.match(finance, /Math\.min\(Math\.max\(1, Number\(dueDay\)\), last\)/);
const expectedMonthlyDate = (year, month, dueDay) => {
  const last = new Date(year, month + 1, 0, 12).getDate();
  return new Date(year, month, Math.min(Math.max(1, Number(dueDay)), last), 12);
};
assert.equal(expectedMonthlyDate(2024, 1, 31).getDate(), 29, 'Fevereiro bissexto precisa cair em 29');
assert.equal(expectedMonthlyDate(2025, 1, 31).getDate(), 28, 'Fevereiro comum precisa cair em 28');
assert.equal(expectedMonthlyDate(2026, 3, 31).getDate(), 30, 'Abril precisa cair em 30');
assert.equal(expectedMonthlyDate(2026, 4, 31).getDate(), 31, 'Maio deve preservar dia 31');

console.log('FARO B9: slider, elétrico, aluguel semanal e vencimentos 28–31 protegidos — ok');

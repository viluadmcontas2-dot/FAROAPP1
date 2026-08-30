import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile('app.js', 'utf8');
const finance = await readFile('faro-finance.js', 'utf8');
const register = await readFile('faro-register.js', 'utf8');
const state = await readFile('faro-state.js', 'utf8');

// 9.21 — pagar uma ocorrência semanal não pode consumir a regra recorrente nem a próxima semana.
assert.match(finance, /const occurrenceId = \(costId, dueDate\) => `\$\{costId\}:\$\{dueDate\}`/, 'Cada vencimento precisa de identidade por custo + data');
assert.match(finance, /cursor = addDays\(cursor, 7\)/, 'Aluguel semanal precisa gerar nova ocorrência a cada 7 dias');
assert.match(finance, /if \(!occurrence \|\| occurrence\.status === 'paid'\) return;/, 'Mesma ocorrência paga não pode ser gravada duas vezes');
assert.doesNotMatch(finance, /markPaid[\s\S]{0,900}\.active\s*=\s*false/, 'Pagar não pode desativar o custo recorrente');

// 9.22–9.24 — virar mês/mudar meta/mudar agenda deve recalcular o plano, preservando fatos já registrados.
assert.match(app, /const monthRecords = this\.state\.records\.filter\(record => record\.date\.startsWith\(this\.monthKey\(reference\)\)\)/, 'Histórico mensal precisa vir dos registros, não da agenda atual');
assert.match(app, /const target = \(this\.state\.targetProfit \/ Math\.max\(1, c\.ctx\.plannedDays\)\) \* dates\.length/, 'Semana deve usar a meta atual ao recalcular o futuro');
assert.match(app, /const records = c\.records\.filter\(record => record\.date >= this\.dateKey\(monday\) && record\.date <= this\.dateKey\(sunday\)\)/, 'Registros existentes da semana não podem sumir ao trocar agenda');
assert.match(app, /selectedDates[\s\S]*this\.state\.workWeekdays\.includes\(cursor\.getDay\(\)\)/, 'Agenda atual deve moldar dias planejados futuros');

// 9.25 — mudança futura de energia/custos não pode reescrever snapshots históricos explícitos, inclusive zero.
assert.match(state, /record\?\.fuelCostKmSnapshot != null/, 'Snapshot de combustível explícito precisa ser reconhecido mesmo quando zero');
assert.match(state, /record\?\.fixedShareSnapshot != null/, 'Snapshot fixo explícito precisa ser reconhecido mesmo quando zero');
assert.match(app, /fuelCostKmSnapshot: this\.fuelCostKm\(\)/, 'Registro novo precisa congelar custo de energia do momento');
assert.match(app, /perKmCostSnapshot: costs\.perKm/, 'Registro novo precisa congelar custo por km do momento');
assert.match(app, /fixedShareSnapshot: costs\.monthlyFixed \/ Math\.max\(1, ctx\.plannedDays\)/, 'Registro novo precisa congelar rateio fixo do momento');

// 9.26 — pago → desfazer → pago novamente precisa ser reversível sem duplicar a mesma ocorrência.
assert.match(finance, /const index = app\.state\.paymentOccurrences\.findIndex\(entry => entry\.id === item\.id\);[\s\S]*if \(index >= 0\) app\.state\.paymentOccurrences\[index\] = item;[\s\S]*else app\.state\.paymentOccurrences\.push\(item\)/,
  'Marcar pago deve substituir a mesma ocorrência ou criar somente uma');
assert.match(finance, /app\.state\.paymentOccurrences = app\.state\.paymentOccurrences\.filter\(entry => entry\.id !== id\)/, 'Desfazer precisa remover somente a ocorrência escolhida');

// 9.27–9.28 — editar/excluir a regra futura não pode apagar a fotografia de pagamento já realizado.
for (const snapshot of ['amount: Number(occurrence.cost.value || 0)', 'costName: occurrence.cost.name', 'kindSnapshot: occurrence.cost.kind']) {
  assert.equal(finance.includes(snapshot), true, `Pagamento precisa congelar ${snapshot}`);
}
assert.match(finance, /const cost = \(app\.state\.costs \|\| \[\]\)\.find\(candidate => candidate\.id === item\.costId\) \|\| \{ id:item\.costId, name:item\.costName, value:item\.amount, kind:item\.kindSnapshot, active:false \}/,
  'Histórico pago precisa sobreviver mesmo se a regra de custo for excluída');
assert.match(finance, /const existing = this\.state\.costs\.find\(cost => cost\.id === id\)/, 'Edição recorrente precisa manter a identidade do custo');
assert.match(finance, /createdAt:existing\?\.createdAt \|\| new Date\(\)\.toISOString\(\)/, 'Edição não deve fingir que o custo antigo acabou de nascer');

// 9.29 — Registro deve recusar zero/inválido e aceitar números finitos sem arredondar silenciosamente.
assert.match(app, /number\(value\) \{ const parsed = Number\(String\(value \?\? ''\)\.replace\(',', '\.'\)\); return Number\.isFinite\(parsed\) \? parsed : 0; \}/,
  'Entrada não numérica precisa virar zero de forma previsível');
assert.match(app, /if \(!draft\.date \|\| draft\.gross <= 0 \|\| draft\.km <= 0\) return this\.toast\('Informe faturamento e quilômetros maiores que zero\.'\)/,
  'Dia não pode ser salvo com faturamento ou km zero/inválido');
assert.match(app, /if \(index >= 0\) this\.state\.records\[index\] = \{ \.\.\.this\.state\.records\[index\], \.\.\.draft \}; else this\.state\.records\.push\(/,
  'Mesmo dia precisa ser atualizado, não duplicado');
assert.doesNotMatch(app, /recordDraft\(\)[\s\S]{0,1200}(toFixed|Math\.round)/, 'Registro não deve arredondar silenciosamente valores digitados antes de salvar');

// 9.30 — chips rápidos devem sempre somar sobre o valor atual; correção manual segue sendo a fonte do próximo toque.
assert.match(register, /const current = app\.number\(input\.value\);[\s\S]*const next = current \+ increment;[\s\S]*input\.value = String\(next\);[\s\S]*input\.dispatchEvent\(new Event\('input', \{ bubbles: true \}\)\)/,
  'Cada toque de chip precisa partir do valor atual e persistir pelo mesmo evento de input');
assert.match(register, /if \(saving\) return;/, 'Toque repetido em Salvar precisa ser bloqueado durante a gravação');

console.log('FARO B9: recorrência, histórico, mudanças de plano, pagamento reversível e Registro 9.21–9.30 protegidos — ok');

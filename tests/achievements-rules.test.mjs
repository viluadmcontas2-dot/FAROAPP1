// Regras puras das Conquistas (faro-achievements.js): só dinheiro real, derivadas do estado. Sem navegador.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../faro-achievements.js', import.meta.url), 'utf8');
const sandbox = { window: {}, Intl, Date, Math, Number, String, Object, Array, Set, Map };
vm.runInNewContext(source, sandbox);
const R = sandbox.window.FaroAchievementRules;
assert.ok(R, 'faro-achievements.js precisa expor FaroAchievementRules');
const plain = text => String(text).replace(/\s+/g, ' ');
const byId = (list, id) => list.find(item => item.id === id);

const base = { todayKey: '2026-10-20', months: [], reserves: [], streakDays: 0, recordCount: 0, firstRecordDate: null, kmDays: [] };

// 1. Vazio: nada conquistado e o convite diz o que fazer.
let list = R.evaluate(base);
assert.equal(list.filter(item => item.achieved).length, 0);
assert.equal(R.homeLine(list, base), 'Registre 1 dia para destravar sua primeira conquista');
assert.equal(byId(list, 'km-cost'), undefined, 'custo do km só aparece com dados');

// 2. Primeiro dia + mês no azul (setembro fechado com lucro > 0); outubro ainda aberto não conta.
const blue = { ...base, recordCount: 12, firstRecordDate: '2026-09-03', months: [
  { key: '2026-08', net: -150, target: 4000 },
  { key: '2026-09', net: 1240, target: 4000 },
  { key: '2026-10', net: 3000, target: 4000 }] };
list = R.evaluate(blue);
assert.equal(byId(list, 'first-day').achieved, true);
assert.equal(byId(list, 'first-day').date, '2026-09-03');
const azul = byId(list, 'month-blue');
assert.equal(azul.achieved, true); assert.equal(azul.title, 'Mês no azul'); assert.equal(azul.date, '2026-09-30');
assert.match(plain(azul.why), /setembro, R\$ 1\.240 de lucro/);
const meta = byId(list, 'goal-hit');
assert.equal(meta.achieved, false, 'setembro não bateu a meta');
assert.equal(meta.progress, 0.75); assert.match(plain(meta.why), /R\$ 3\.000 de R\$ 4\.000/);
// Só mês aberto com lucro: ainda não é "no azul".
assert.equal(byId(R.evaluate({ ...base, recordCount: 2, firstRecordDate: '2026-10-01', months: [{ key: '2026-10', net: 500, target: 4000 }] }), 'month-blue').achieved, false);

// 3. Meta batida conta meses.
list = R.evaluate({ ...base, recordCount: 40, firstRecordDate: '2026-07-01', months: [{ key: '2026-07', net: 4100, target: 4000 }, { key: '2026-08', net: 4000, target: 4000 }, { key: '2026-10', net: 10, target: 4000 }] });
assert.equal(byId(list, 'goal-hit').achieved, true);
assert.match(plain(byId(list, 'goal-hit').why), /2 meses/);

// 4. Reserva 100% (data = aporte que completou) e reserva a 78% vira a próxima conquista.
const reserves = { ...base, recordCount: 5, firstRecordDate: '2026-10-01', reserves: [
  { id: 'r1', name: 'IPVA', goal: 1240, contributions: [{ date: '2026-09-01', amount: 600 }, { date: '2026-10-05', amount: 640 }] },
  { id: 'r2', name: 'Pneus', goal: 1000, contributions: [{ date: '2026-10-02', amount: 780 }] },
  { id: 'r3', name: 'Sem meta', goal: 0, contributions: [{ date: '2026-10-02', amount: 50 }] }] };
list = R.evaluate(reserves);
const ipva = byId(list, 'reserve-r1');
assert.equal(ipva.achieved, true); assert.equal(ipva.title, 'Reserva IPVA 100%'); assert.equal(ipva.date, '2026-10-05');
assert.equal(plain(ipva.why), 'Você guardou R$ 1.240 de R$ 1.240.');
const pneus = byId(list, 'reserve-r2');
assert.equal(pneus.achieved, false); assert.equal(pneus.progress, 0.78);
assert.equal(byId(list, 'reserve-r3'), undefined, 'reserva sem objetivo não vira conquista');
assert.equal(R.homeLine(list, reserves), 'Próxima conquista: Reserva Pneus 78%');

// 5. Sequência de 7 dias (o número vem de FaroHome.streak, não é recalculado aqui).
assert.equal(byId(R.evaluate({ ...base, recordCount: 6, firstRecordDate: '2026-10-14', streakDays: 6 }), 'week-7').achieved, false);
const week = byId(R.evaluate({ ...base, recordCount: 7, firstRecordDate: '2026-10-14', streakDays: 7 }), 'week-7');
assert.equal(week.achieved, true); assert.equal(week.title, 'Semana de 7 dias');
assert.ok(!/days\s*=|registered/.test(source.match(/streakDays[^\n]*/)?.[0] || ''), 'sem cálculo próprio de sequência');
assert.ok(!/const streak\s*=/.test(source), 'reutiliza FaroHome.streak');

// 6. Custo do km: 7 dias recentes vs 30 dias anteriores.
const kmDays = [];
for (let d = 8; d <= 20; d += 1) kmDays.push({ date: `2026-10-${String(d).padStart(2, '0')}`, km: 100, cost: d >= 14 ? 55 : 62 });
list = R.evaluate({ ...base, recordCount: 13, firstRecordDate: '2026-10-08', kmDays });
const km = byId(list, 'km-cost');
assert.equal(km.achieved, true); assert.equal(km.title, 'Custo do km sob controle');
assert.match(plain(km.why), /R\$ 0,62 para R\$ 0,55/);

// 7. Celebração: só o que é novo; a primeira vez num aparelho com histórico entra em silêncio.
assert.deepEqual([...R.fresh(list, { 'first-day': '2026-10-08' })], ['km-cost']);
assert.deepEqual([...R.fresh(list, null)], []);

// 8. Nenhum valor sai sem formatação; tudo é texto (o escape fica na interface).
for (const item of R.evaluate(reserves)) { assert.equal(typeof item.title, 'string'); assert.ok(!/NaN|undefined/.test(item.why), item.id); }
console.log('ok conquistas: regras puras');

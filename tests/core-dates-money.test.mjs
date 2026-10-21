import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../src/core/dates.js';
import { parseMoney, fmt, R, splitMoney, round2 } from '../src/core/money.js';

test('isISO valida data real', () => {
  assert.ok(D.isISO('2026-10-21'));
  assert.ok(D.isISO('2028-02-29'));
  for (const bad of ['2026-02-29', '2026-13-01', '2026-00-10', '2026-10-32', '26-10-21', '2026-1-1', '', null, undefined, 20261021, '2026-10-21T00:00', '1999-01-01'])
    assert.equal(D.isISO(bad), false, String(bad));
});

test('dias do mes e ano bissexto', () => {
  assert.equal(D.daysInMonth(2026, 2), 28);
  assert.equal(D.daysInMonth(2028, 2), 29);
  assert.equal(D.daysInMonth(2100, 2), 28);
  assert.equal(D.daysInMonth(2026, 10), 31);
  assert.equal(D.monthDates('2028-02-10').length, 29);
  assert.equal(D.monthDates('2026-10-21')[0], '2026-10-01');
  assert.equal(D.monthDates('2026-10-21').at(-1), '2026-10-31');
});

test('dia da semana: 21/10/2026 e quarta; semana seg-dom', () => {
  assert.equal(D.weekday('2026-10-21'), 3);
  assert.equal(D.weekday('2026-10-01'), 4);
  assert.equal(D.mondayIndex('2026-10-19'), 0);
  assert.equal(D.mondayIndex('2026-10-25'), 6);
  assert.deepEqual(D.weekDates('2026-10-21'), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
  assert.deepEqual(D.weekDates('2026-10-25')[0], '2026-10-19');
  assert.deepEqual(D.weekDates('2026-10-19')[6], '2026-10-25');
  // semana que cruza mes e ano
  assert.deepEqual(D.weekDates('2026-12-31'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
});

test('addDays e diffDays viram mes/ano', () => {
  assert.equal(D.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(D.addDays('2027-01-01', -1), '2026-12-31');
  assert.equal(D.addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(D.addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(D.diffDays('2026-10-21', '2026-10-25'), 4);
  assert.equal(D.diffDays('2026-10-21', '2026-09-30'), -21);
});

test('calendario: casas em branco antes do dia 1 e nomes pt-BR', () => {
  assert.equal(D.leadingBlanks('2026-10-21'), 3); // 1 de outubro e quinta
  assert.equal(D.monthName('2026-10-21'), 'outubro');
  assert.deepEqual(D.WD_SHORT, ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
  assert.equal(D.dayOfMonth('2026-10-05'), 5);
  assert.equal(D.monthKey('2026-10-05'), '2026-10');
});

test('todayISO usa o dia local', () => {
  assert.equal(D.todayISO(new Date(2026, 9, 21, 23, 59)), '2026-10-21');
  assert.equal(D.todayISO(new Date(2026, 0, 1, 0, 0)), '2026-01-01');
  assert.equal(D.hhmm(new Date(2026, 9, 21, 7, 5)), '07:05');
});

test('parseMoney', () => {
  assert.equal(parseMoney('241,80'), 241.8);
  assert.equal(parseMoney('R$ 1.234,56'), 1234.56);
  assert.equal(parseMoney('1.234'), 1234);
  assert.equal(parseMoney('12.5'), 12.5);
  assert.equal(parseMoney(''), 0);
  assert.equal(parseMoney(null), 0);
  assert.equal(parseMoney('abc'), 0);
  assert.equal(parseMoney('-50'), 50); // sinal descartado: valores sao sempre positivos
  assert.equal(parseMoney('9'.repeat(40)), 1e9); // teto
  assert.equal(parseMoney(Infinity), 0);
  assert.equal(parseMoney(NaN), 0);
  assert.equal(parseMoney(12.345), 12.35);
});

test('fmt e R no padrao pt-BR', () => {
  assert.equal(fmt(1234.5), '1.234,50');
  assert.equal(fmt(0), '0,00');
  assert.equal(fmt(-5.5), '−5,50');
  assert.equal(fmt(-0.001), '0,00');
  assert.equal(fmt(1234567.891, 0), '1.234.568');
  assert.equal(R(650), 'R$ 650');
  assert.equal(R(99.9, 2), 'R$ 99,90');
  assert.equal(R(NaN), 'R$ 0');
  assert.deepEqual(splitMoney(1234.5), ['1.234', ',50']);
  assert.equal(round2(1.005 + 1e-9), 1.01);
  // confere com o Intl do node (ICU completo)
  for (const n of [0.5, 12.34, 999.99, 1000, 123456.789])
    assert.equal(fmt(n), n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
});

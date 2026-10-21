// Apoio dos testes E2E do motorista: achar botões pelo nome, semear o estado e ler o que o app gravou.
import { reduce } from '../../src/core/actions.js';
import { defaultState, SCHEMA_VERSION } from '../../src/core/state.js';
import { addDays, todayISO } from '../../src/core/dates.js';
import { R } from '../../src/core/money.js';
import { STORAGE_KEY } from '../../src/data/persist.js';

// o nome acessível de um botão inclui o glifo do ícone (área privada Unicode): casa o texto ignorando glifos e espaços
const GLYPHS = '[\\s\\uE000-\\uF8FF]*';
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const button = (page, name) => page.getByRole('button', { name: name instanceof RegExp ? name : new RegExp(`^${GLYPHS}${esc(name)}${GLYPHS}$`) });
export const click = (page, name) => button(page, name).first().click();
export const hasText = (page, text) => page.waitForFunction(t => document.body.innerText.includes(t), text);
export const savedState = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)).state, STORAGE_KEY);
export const flushed = page => page.waitForTimeout(700); // o app grava com atraso de 400 ms
export const bodyText = page => page.evaluate(() => document.body.innerText);

export const today = () => todayISO();
export const daysAgo = n => addDays(todayISO(), -n);

// Estado de um motorista que já passou pelo onboarding (7 dias de pista, para ontem sempre ser dia de trabalho).
// `closedAgo`: dias atrás em que houve um dia fechado (ex.: [2] = anteontem).
export function seedState({ closedAgo = [], close = { p: { uber: 150, n99: 80 }, km: 100, h: 9 } } = {}) {
  const ctx = { today: todayISO() };
  let s = reduce(defaultState(), { type: 'onboarding/complete', payload: { daysWeek: 7 } }, ctx);
  for (const n of closedAgo) s = reduce(s, { type: 'day/close', payload: { ...close, date: daysAgo(n) } }, ctx);
  return s;
}
export const seedPage = async (context, state) => {
  const blob = JSON.stringify({ v: SCHEMA_VERSION, rev: 1, dirty: false, savedAt: Date.now(), state });
  await context.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [STORAGE_KEY, blob]);
};

// "R$ 1.234,56" -> 1234.56 (aceita o sinal − na frente)
export const parseR = text => {
  const m = /(−|-)?\s*R\$\s*([\d.]+),(\d{2})/.exec(text.replace(/ /g, ' '));
  return m ? (m[1] ? -1 : 1) * Number(m[2].replace(/\./g, '') + '.' + m[3]) : NaN;
};
export { R };

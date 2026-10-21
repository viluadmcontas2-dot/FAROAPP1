// Dinheiro: sempre numero em reais (2 casas). Formatacao pt-BR deterministica (sem depender de Intl).
export const MAX_MONEY = 1e9;

export const round2 = n => Math.round((Number.isFinite(n) ? n : 0) * 100 + 1e-7 * Math.sign(n)) / 100;

// Aceita "1.234,56", "R$ 12,5", "12.5", numero. Sempre >= 0 e <= MAX_MONEY (o sinal e descartado).
export function parseMoney(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.min(MAX_MONEY, round2(Math.abs(v))) : 0;
  if (typeof v !== 'string' || !v) return 0;
  let x = v.slice(0, 40).replace(/[^\d,.]/g, '');
  if (x.includes(',')) x = x.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(x)) x = x.replace(/\./g, ''); // "1.234" = mil duzentos e trinta e quatro
  const n = parseFloat(x);
  return Number.isFinite(n) ? Math.min(MAX_MONEY, round2(n)) : 0;
}

export function fmt(n, d = 2) {
  const v = Number.isFinite(n) ? Math.max(-1e15, Math.min(1e15, n)) : 0;
  const s = Math.abs(v).toFixed(d);
  const [int, dec] = s.split('.');
  const g = int.replace(/\B(?=(\d{3})+$)/g, '.');
  return (v < 0 && Number(s) !== 0 ? '−' : '') + g + (dec ? ',' + dec : '');
}

export const R = (n, d = 0) => 'R$ ' + fmt(n, d);

export function splitMoney(n) {
  const s = fmt(n);
  const i = s.lastIndexOf(',');
  return [s.slice(0, i), s.slice(i)];
}

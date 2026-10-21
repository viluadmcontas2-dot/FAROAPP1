// Dinheiro: sempre numero em reais (2 casas). Formatacao pt-BR deterministica (sem depender de Intl).
export const MAX_MONEY = 1e9;

export const round2 = n => Math.round((Number.isFinite(n) ? n : 0) * 100 + 1e-7 * Math.sign(n)) / 100;

// Parser unico de dinheiro digitado (pt-BR). Aceita "1.234,56", "R$ 12,5", "12.5", "1,234.56", numero.
// Sempre >= 0 e <= MAX_MONEY (sinal descartado), nunca NaN. Regras:
//  1. Tem virgula E ponto: o ULTIMO separador e o decimal; o outro e milhar ("1.200,50" e "1,234.56" = 1200,5 e 1234,56).
//  2. So virgula: uma virgula = decimal ("12,5"); varias = milhar ("1,234,567").
//  3. So ponto: varios pontos = milhar se todos os grupos tem 3 digitos; um ponto = milhar se o grupo depois tem
//     EXATAMENTE 3 digitos e a parte antes nao e "0" ("1.200" = 1200, "0.500" = 0,5); senao decimal ("12.5" = 12,5).
const toNumber = x => {
  const n = parseFloat(x);
  return Number.isFinite(n) ? Math.min(MAX_MONEY, round2(n)) : 0;
};
export function parseMoney(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.min(MAX_MONEY, round2(Math.abs(v))) : 0;
  if (typeof v !== 'string' || !v) return 0;
  const x = v.slice(0, 40).replace(/[^\d,.]/g, '');
  const lastC = x.lastIndexOf(','), lastD = x.lastIndexOf('.');
  const dec = (s, at) => s.slice(0, at).replace(/[.,]/g, '') + '.' + s.slice(at + 1).replace(/[.,]/g, '');
  if (lastC >= 0 && lastD >= 0) return toNumber(dec(x, Math.max(lastC, lastD)));
  if (lastC >= 0) return toNumber(x.indexOf(',') === lastC ? dec(x, lastC) : x.replace(/,/g, ''));
  if (lastD < 0) return toNumber(x);
  const groups = x.split('.');
  const thousands = groups[0] !== '0' && groups[0] !== '' && groups.slice(1).every(g => g.length === 3);
  return toNumber(thousands ? x.replace(/\./g, '') : dec(x, lastD));
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

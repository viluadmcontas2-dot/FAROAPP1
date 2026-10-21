// Datas ISO "YYYY-MM-DD" (sem fuso: tudo calculado em UTC so para aritmetica de calendario).
export const WD_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WD_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const p2 = n => String(n).padStart(2, '0');

export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function parseISO(s) {
  if (typeof s !== 'string') return null;
  const m = RE.exec(s);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return { y, m: mo, d };
}
export const isISO = s => parseISO(s) !== null;
export const toISO = (y, m, d) => `${String(y).padStart(4, '0')}-${p2(m)}-${p2(d)}`;

const ms = iso => { const p = parseISO(iso); return Date.UTC(p.y, p.m - 1, p.d); };
const fromMs = t => { const d = new Date(t); return toISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); };

export const weekday = iso => new Date(ms(iso)).getUTCDay(); // 0 = domingo
export const mondayIndex = iso => (weekday(iso) + 6) % 7; // 0 = segunda ... 6 = domingo
export const addDays = (iso, n) => fromMs(ms(iso) + n * 86400000);
export const diffDays = (a, b) => Math.round((ms(b) - ms(a)) / 86400000);
export const dayOfMonth = iso => parseISO(iso).d;
export const monthKey = iso => iso.slice(0, 7);
export const monthName = iso => MONTHS[parseISO(iso).m - 1];

export function monthDates(iso) {
  const { y, m } = parseISO(iso);
  return Array.from({ length: daysInMonth(y, m) }, (_, i) => toISO(y, m, i + 1));
}
export const leadingBlanks = iso => mondayIndex(monthKey(iso) + '-01');
export const weekDates = iso => { const s = addDays(iso, -mondayIndex(iso)); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); };

// Data/hora LOCAIS do aparelho (o motorista pensa no dia dele, nao em UTC).
// Dia de trabalho: so vira as 04:00 locais. Sabado 00:40 ainda e "sabado" (quem roda a noite fecha o dia depois da meia-noite).
export const DAY_ROLLOVER_HOUR = 4;
export const todayISO = (dt = new Date()) => {
  // So componentes locais: sem UTC e sem somar milissegundos (nao quebra na troca de horario de verao).
  const d = dt.getHours() < DAY_ROLLOVER_HOUR ? new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - 1, 12) : dt;
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
};
export const hhmm = (dt = new Date()) => `${p2(dt.getHours())}:${p2(dt.getMinutes())}`;

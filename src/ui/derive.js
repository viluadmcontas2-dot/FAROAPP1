// Conteudo derivado do estado real (sem numeros inventados): indice, calendario, recordes, selos, lembretes, dicas.
// Funcoes puras: recebem o estado `app`, o `calc` (C), as ocorrencias de contas (occ) e a data de hoje.
import { addDays, diffDays, mondayIndex, leadingBlanks } from '../core/dates.js';
import { R } from '../core/money.js';
import { plural } from './kit.js';

const LUCRO_KM_REFERENCIA = 1.2; // lucro liquido por km que vale nota 100 no pilar de eficiencia
const pct = v => Math.round(Math.max(0, Math.min(100, v)));

export const isWorkDay = (app, date) => mondayIndex(date) < app.daysWeek;

// Maior sequencia de dias de pista fechados (folgas nao quebram), contando ate hoje.
export function bestStreak(app, today) {
  const days = Object.keys(app.recs).filter(d => app.recs[d].closed).sort();
  let best = 0, run = 0;
  for (let d = days[0]; d && d <= today; d = addDays(d, 1)) {
    if (!isWorkDay(app, d)) continue;
    if (app.recs[d] && app.recs[d].closed) best = Math.max(best, ++run);
    else if (d !== today) run = 0;
  }
  return best;
}

// Dias de pista do mes ja encerrados (hoje so conta se fechado) e quantos deles foram fechados.
export function monthCompliance(app, C) {
  const past = C.dates.filter(d => (d < C.today || (d === C.today && C.todayClosed)) && isWorkDay(app, d));
  return { workSoFar: past.length, closedSoFar: past.filter(d => app.recs[d] && app.recs[d].closed).length };
}

export function indexFaro(app, C, occ) {
  const { workSoFar, closedSoFar } = monthCompliance(app, C);
  const due = occ.filter(o => o.date < C.today), paidOn = due.filter(o => o.paid).length;
  const lkm = C.month.km ? C.month.lucro / C.month.km : 0;
  const pillars = [
    { key: 'const', label: 'Dias fechados', score: pct(closedSoFar / Math.max(1, workSoFar) * 100), hint: `${closedSoFar} de ${workSoFar} dias fechados no mês` },
    { key: 'km', label: 'Lucro por km', score: pct(lkm / LUCRO_KM_REFERENCIA * 100), hint: C.month.km ? `${R(lkm, 2)}/km · referência ${R(LUCRO_KM_REFERENCIA, 2)}` : 'feche um dia para medir' },
    { key: 'bills', label: 'Contas em dia', score: due.length ? pct(paidOn / due.length * 100) : 100, hint: due.length - paidOn ? `${plural(due.length - paidOn, 'conta atrasada', 'contas atrasadas')}` : 'nenhuma atrasada' },
    { key: 'pace', label: 'No ritmo da meta', score: C.target > 0 ? pct(C.proj / C.target * 100) : 0, hint: C.target > 0 ? `no ritmo, você chega a ${R(C.proj)} de ${R(C.target)}` : '' },
  ];
  const hasData = C.closedDays.length > 0;
  const score = hasData ? Math.round(pillars.reduce((a, p) => a + p.score, 0) / pillars.length) : 0;
  const label = !hasData ? 'Sem dados' : score >= 85 ? 'Excelente' : score >= 70 ? 'Bom' : score >= 50 ? 'Regular' : 'Atenção';
  const next = !hasData ? 'Feche seu primeiro dia para ver a sua nota.'
    : score >= 85 ? 'Você está no topo. Mantenha a constância.'
    : `Faltam ${85 - score} pontos para Excelente. ${due.length - paidOn ? 'Pague as contas atrasadas.' : 'Feche todos os dias de pista.'}`;
  return { score, label, next, pillars, hasData };
}

// Uma celula por dia do mes (com vazios no inicio para alinhar a segunda-feira).
export function calendarCells(app, C) {
  const cells = Array.from({ length: leadingBlanks(C.today) }, () => ({ kind: 'blank', n: '' }));
  for (const date of C.dates) {
    const r = app.recs[date], n = Number(date.slice(8));
    let kind;
    if (r && r.closed) kind = C.num(date).lucro >= C.targetFor(date) ? 'hit' : 'miss';
    else if (date === C.today) kind = 'today';
    else if (!isWorkDay(app, date)) kind = 'off';
    else kind = date < C.today ? 'late' : 'future';
    cells.push({ kind, n });
  }
  return cells;
}

// Rateio do carro fixo por km: dos km já rodados no mês; sem km ainda, dos km por dia que a meta pede.
export const carFixedPerKm = C => (C.month.km ? C.month.car / C.month.km : C.carShare / Math.max(1, C.planDailyGross / C.revKm));

export function records(C) {
  const list = C.closedDays.map(C.num).filter(r => r.km > 0);
  const best = [...list].sort((a, b) => b.lucro - a.lucro)[0];
  const bestKm = [...list].sort((a, b) => b.lucro / b.km - a.lucro / a.km)[0];
  return { best, bestKm };
}

export function badges(app, C, occ, streakNow) {
  const { bestKm } = records(C);
  const { workSoFar, closedSoFar } = monthCompliance(app, C);
  const late = occ.some(o => o.date < C.today && !o.paid);
  return [
    { icon: 'ph-fill ph-flag-checkered', name: 'Primeiro fechamento', sub: 'fechou um dia', got: C.closedDays.length > 0 },
    { icon: 'ph-fill ph-fire', name: 'Semana cheia', sub: '6 dias seguidos', got: streakNow >= 6 },
    { icon: 'ph-fill ph-path', name: 'Km de ouro', sub: 'lucro acima de R$ 1,20/km num dia', got: !!bestKm && bestKm.lucro / bestKm.km >= LUCRO_KM_REFERENCIA },
    { icon: 'ph-fill ph-wallet', name: 'Mês no azul', sub: 'sobra positiva no mês', got: C.month.sobra > 0 },
    { icon: 'ph-fill ph-receipt', name: 'Mês sem atraso', sub: 'todas as contas em dia', got: C.closedDays.length > 0 && !late },
    { icon: 'ph-fill ph-calendar-check', name: 'Dias fechados de ouro', sub: '90% dos dias fechados', got: workSoFar > 0 && closedSoFar / workSoFar >= 0.9 },
  ];
}

// Avisos dos proximos 7 dias, conforme as preferencias (app.rem). `tone` e uma chave do tema ou uma cor hex.
export function reminders(app, C, occ) {
  const { today } = C, rp = app.rem, items = [];
  if (rp.close && !C.todayClosed && isWorkDay(app, today)) items.push({ date: today, time: '22:00', icon: 'ph-fill ph-flag-checkered', tone: 'gold', title: 'Fechar o dia', sub: '30 segundos: apps, km e horas' });
  for (const o of occ.filter(x => !x.paid)) {
    const dd = diffDays(today, o.date);
    if (o.id === 'aluguel-carro' || o.id === 'parcela-carro') {
      if (rp.rent && dd >= 0 && dd <= 8) items.push({ date: addDays(o.date, dd > 0 ? -1 : 0), time: '20:00', icon: 'ph-fill ph-car-profile', tone: 'accent', title: o.id === 'aluguel-carro' ? 'Deixar o aluguel separado' : 'Parcela do carro amanhã', sub: `${R(o.v)} · vence dia ${o.d}` });
    } else if (rp.bills) {
      if (dd < 0) items.push({ date: today, time: '09:00', icon: 'ph-fill ph-warning-circle', tone: 'neg', title: `${o.name} atrasada`, sub: `${R(o.v, 2)} · venceu dia ${o.d}` });
      else if (dd <= 9) items.push({ date: addDays(o.date, dd >= 2 ? -2 : -dd), time: '09:00', icon: 'ph-fill ' + o.icon, tone: o.color, title: `${o.name} vence dia ${o.d}`, sub: R(o.v, 2) });
    }
  }
  if (rp.week) items.push({ date: addDays(today, 6 - mondayIndex(today)), time: '19:00', icon: 'ph-fill ph-chart-bar', tone: 'cW', title: 'Resumo da semana', sub: 'lucro, lucro/km e o que vem pela frente' });
  const limit = addDays(today, 7);
  return items.filter(x => x.date <= limit).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99'));
}

// Dica do periodo, so quando ha dado real para sustentar; senao nenhuma.
export function tip(period, { rentLeft, hasOverdue, closedCount, bestKmRec, avgLucroKm }) {
  if (period === 'mes') {
    return closedCount >= 3 && bestKmRec ? { show: true, title: 'Seu melhor km', text: `Seu melhor dia rendeu ${R(bestKmRec.lucro / bestKmRec.km, 2)} de lucro por km; a média do mês é ${R(avgLucroKm, 2)}. Repetir o que funcionou nesse dia aumenta o lucro.` } : { show: false };
  }
  if (period === 'semana') {
    return rentLeft === null ? { show: false } : rentLeft > 0
      ? { show: true, title: 'Aluguel antes do lucro', text: `Faltam ${R(rentLeft)} pro aluguel de segunda.` }
      : { show: true, title: 'Semana livre', text: 'O aluguel desta semana já saiu do lucro. A partir daqui, cada corrida vai para o seu bolso.' };
  }
  if (hasOverdue || rentLeft === null || rentLeft <= 0) return { show: false };
  return { show: true, title: 'Aluguel de segunda', text: `Faltam ${R(rentLeft)} do aluguel desta semana.` };
}

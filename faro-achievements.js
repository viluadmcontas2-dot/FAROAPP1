// Conquistas na medida: só dinheiro real, sem ranking, sem confete. Tudo é DERIVADO do estado
// existente (registros, meta, reservas, sequência do Início). No aparelho fica só "já vista em".
(() => {
  'use strict';
  // ---------- Regras puras (testadas em tests/achievements-rules.test.mjs) ----------
  const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const brl = (value, digits = 0) => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:digits, maximumFractionDigits:digits }).format(Number(value) || 0);
  const clamp01 = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const round2 = value => Math.round(value * 100) / 100;
  const monthName = key => MONTHS[Number(key.slice(5,7)) - 1] || key;
  const lastDay = key => { const [y,m] = key.split('-').map(Number); return `${key}-${String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0')}`; };
  const shiftKey = (key, days) => { const d = new Date(`${key}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10); };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const KM_DROP = 0.05;

  const evaluate = input => {
    const today = input.todayKey, current = today.slice(0,7);
    const months = (input.months || []).slice().sort((a,b) => a.key.localeCompare(b.key));
    const closed = months.filter(m => m.key < current);
    const open = months.find(m => m.key === current);
    const list = [];

    const count = Number(input.recordCount) || 0;
    list.push(count > 0
      ? { id:'first-day', title:'Primeiro dia registrado', achieved:true, date:input.firstRecordDate, progress:1, why:'Seu primeiro dia de trabalho ficou registrado.' }
      : { id:'first-day', title:'Primeiro dia registrado', achieved:false, date:null, progress:0, why:'Registre um dia de trabalho para começar.' });

    const blue = closed.filter(m => m.net > 0);
    if (blue.length) {
      const last = blue[blue.length - 1];
      list.push({ id:'month-blue', title:'Mês no azul', achieved:true, date:lastDay(last.key), progress:1, why:`${plural(blue.length,'mês fechado','meses fechados')} com lucro. Último: ${monthName(last.key)}, ${brl(last.net)} de lucro.` });
    } else {
      const days = Number(lastDay(current).slice(8)), elapsed = Number(today.slice(8));
      list.push({ id:'month-blue', title:'Mês no azul', achieved:false, date:null,
        progress: open && open.net > 0 ? round2(clamp01(elapsed / days)) : 0,
        why: !open ? 'Feche um mês com lucro para conquistar.' : open.net > 0 ? `Este mês está ${brl(open.net)} no azul até agora. Feche assim.` : `Este mês está ${brl(Math.abs(open.net))} no vermelho até agora.` });
    }

    const hits = closed.filter(m => m.target > 0 && m.net >= m.target);
    if (hits.length) {
      const last = hits[hits.length - 1];
      list.push({ id:'goal-hit', title:'Meta batida', achieved:true, date:lastDay(last.key), progress:1, why:`Meta batida em ${plural(hits.length,'mês','meses')}. Último: ${monthName(last.key)}, ${brl(last.net)} de ${brl(last.target)}.` });
    } else {
      const target = open?.target || (months[months.length - 1]?.target) || 0;
      const net = Math.max(0, open?.net || 0);
      list.push({ id:'goal-hit', title:'Meta batida', achieved:false, date:null, progress: target > 0 ? round2(clamp01(net / target)) : 0,
        why: target > 0 ? `${brl(net)} de ${brl(target)} neste mês.` : 'Defina a meta do mês para conquistar.' });
    }

    for (const reserve of input.reserves || []) {
      const goal = Number(reserve.goal) || 0;
      if (goal <= 0) continue;
      const items = (reserve.contributions || []).slice().sort((a,b) => String(a.date).localeCompare(String(b.date)));
      let sum = 0, reachedAt = null;
      for (const item of items) { sum += Number(item.amount) || 0; if (!reachedAt && sum >= goal) reachedAt = item.date; }
      const achieved = sum >= goal;
      const name = String(reserve.name || 'Reserva').trim();
      const base = /^reserva\b/i.test(name) ? name : `Reserva ${name}`;
      list.push({ id:`reserve-${reserve.id}`, title: achieved ? `${base} 100%` : base, achieved, date: achieved ? reachedAt : null,
        progress: achieved ? 1 : round2(clamp01(sum / goal)), why:`Você guardou ${brl(Math.max(0,sum))} de ${brl(goal)}.` });
    }

    const streakDays = Number(input.streakDays) || 0;
    list.push({ id:'week-7', title:'Semana de 7 dias', achieved: streakDays >= 7, date:null, progress: round2(clamp01(streakDays / 7)),
      why: streakDays >= 7 ? `Você registrou ${streakDays} dias seguidos. Quem anota sabe quanto lucra.` : `${streakDays} de 7 dias seguidos registrados. 1 folga por semana não quebra.` });

    const recentFrom = shiftKey(today,-6), priorFrom = shiftKey(today,-36);
    const window_ = (from, to) => (input.kmDays || []).filter(d => d.date >= from && d.date <= to && Number(d.km) > 0);
    const recent = window_(recentFrom, today), prior = window_(priorFrom, shiftKey(today,-7));
    const rate = days => days.reduce((s,d) => s + Number(d.cost || 0), 0) / days.reduce((s,d) => s + Number(d.km), 0);
    if (recent.length >= 2 && prior.length >= 3 && rate(prior) > 0) {
      const now = rate(recent), before = rate(prior), drop = 1 - now / before;
      const achieved = drop >= KM_DROP;
      list.push({ id:'km-cost', title:'Custo do km sob controle', achieved, date:null, progress: achieved ? 1 : round2(clamp01(drop / KM_DROP)),
        why: achieved ? `Seu custo por km caiu de ${brl(before,2)} para ${brl(now,2)} (${Math.round(drop*100)}% menor) vs. os 30 dias anteriores.`
          : `Custo por km: ${brl(now,2)} nos últimos 7 dias, ${brl(before,2)} antes. Baixe 5% para conquistar.` });
    }
    return list;
  };

  const next = list => {
    const pending = list.filter(item => !item.achieved);
    return pending.filter(item => item.progress > 0).sort((a,b) => b.progress - a.progress)[0] || pending[0] || null;
  };
  const homeLine = (list, input) => {
    if (!(Number(input?.recordCount) > 0)) return 'Registre 1 dia para destravar sua primeira conquista';
    const item = next(list);
    if (!item) return `Conquistas: ${list.length} de ${list.length}`;
    return `Próxima conquista: ${item.title} ${Math.round(item.progress * 100)}%`;
  };
  // Primeira vez no aparelho (seen nulo): entra em silêncio, sem festa por histórico antigo.
  const fresh = (list, seen) => seen ? list.filter(item => item.achieved && !seen[item.id]).map(item => item.id) : [];

  window.FaroAchievementRules = Object.freeze({ evaluate, next, homeLine, fresh });

  // ---------- Interface: 1 linha no Início + folha inferior ----------
  const app = window.__vettaApp;
  const dashboard = typeof document !== 'undefined' && document.getElementById('view-dashboard');
  if (!app || !dashboard || window.FaroAchievements) return;
  const SEEN_KEY = 'faro-achievements-seen-v1';
  const readSeen = () => { try { const raw = localStorage.getItem(SEEN_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
  const writeSeen = seen => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch {} };
  const shortDate = key => key ? `${key.slice(8,10)}/${key.slice(5,7)}/${key.slice(0,4)}` : '';

  const gather = () => {
    const records = (app.state.records || []).filter(r => r && r.date).slice().sort((a,b) => a.date.localeCompare(b.date));
    const todayKey = app.todayKey(), current = todayKey.slice(0,7), target = app.number(app.state.targetProfit);
    const byMonth = new Map();
    const kmFrom = (() => { const d = app.parseDate(todayKey); d.setDate(d.getDate() - 36); return app.dateKey(d); })();
    const kmDays = [];
    for (const record of records) {
      const n = app.recordNumbers(record);
      const key = record.date.slice(0,7);
      if (key !== current) byMonth.set(key, (byMonth.get(key) || 0) + n.net);
      if (record.date >= kmFrom && record.date <= todayKey) kmDays.push({ date:record.date, km:n.km, cost:n.fuel + n.variable + n.percentCost });
    }
    const months = [...byMonth].map(([key, net]) => ({ key, net, target }));
    if (records.some(r => r.date.startsWith(current))) months.push({ key:current, net:app.calculations().actualNet, target });
    const profiles = app.state.reserveProfiles || {};
    const reserves = (app.state.costs || []).filter(c => c?.active !== false && c?.category === 'reserve').map(c => ({
      id:c.id, name:c.name, goal:app.number(profiles[c.id]?.goalAmount),
      contributions:(app.state.reserveContributions || []).filter(item => item.reserveId === c.id) }));
    const streakDays = window.FaroHome?.streak?.(records.map(r => r.date))?.days || 0;
    return { todayKey, months, reserves, streakDays, recordCount:records.length, firstRecordDate:records[0]?.date || null, kmDays };
  };

  const line = document.createElement('button');
  line.type = 'button';
  line.id = 'faroAchievementsLine';
  line.innerHTML = '<span class="faro-ach-seal" aria-hidden="true"><i class="fas fa-award"></i></span><span id="faroAchievementsText" class="faro-ach-line-text"></span><span class="faro-ach-chev" aria-hidden="true">›</span>';
  const anchor = document.getElementById('faroHomeAttention') || dashboard.querySelector('[data-faro-primary="true"]');
  if (anchor && anchor.parentElement === dashboard) dashboard.insertBefore(line, anchor); else dashboard.appendChild(line);

  const sheet = document.createElement('dialog');
  sheet.id = 'faroAchievementsSheet';
  sheet.className = 'faro-dialog faro-dialog--sheet';
  sheet.setAttribute('aria-labelledby', 'faroAchievementsTitle');
  sheet.innerHTML = '<div class="faro-dialog-shell"><div class="faro-dialog-handle" aria-hidden="true"></div><div class="faro-dialog-head"><div><span class="faro-dialog-kicker">Dinheiro de verdade</span><h2 id="faroAchievementsTitle" class="faro-dialog-title">Conquistas</h2></div><button id="faroAchievementsClose" type="button" class="faro-ach-close" aria-label="Fechar conquistas">×</button></div><div class="faro-dialog-body"><p id="faroAchievementsEmpty" class="faro-ach-empty" hidden></p><ul id="faroAchievementsList" class="faro-ach-list"></ul></div></div>';
  document.body.appendChild(sheet);
  window.FaroInteractions?.register?.(sheet);
  const closeSheet = () => window.FaroInteractions?.close ? window.FaroInteractions.close(sheet) : sheet.close();
  sheet.querySelector('#faroAchievementsClose').addEventListener('click', closeSheet);

  const toast = document.createElement('div');
  toast.id = 'faroAchievementToast';
  toast.className = 'faro-ach-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.hidden = true;
  toast.innerHTML = '<span class="faro-ach-seal" aria-hidden="true"><i class="fas fa-award"></i></span><span id="faroAchievementToastText"></span>';
  document.body.appendChild(toast);
  let toastTimer = 0;
  const celebrate = title => {
    toast.querySelector('#faroAchievementToastText').textContent = `Conquista nova: ${title}`;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 6000);
  };

  let latest = { list:[], input:null };
  const renderList = () => {
    const { list, input } = latest;
    const seen = readSeen() || {};
    const empty = sheet.querySelector('#faroAchievementsEmpty');
    empty.hidden = Number(input?.recordCount) > 0;
    empty.textContent = 'Registre 1 dia para destravar sua primeira conquista.';
    const ordered = list.slice().sort((a,b) => Number(b.achieved) - Number(a.achieved) || b.progress - a.progress);
    const items = ordered.map(item => {
      const date = item.achieved ? `Conquistada em ${shortDate(item.date || seen[item.id] || input.todayKey)}` : `${Math.round(item.progress * 100)}% do caminho`;
      return window.FaroSafe.html`<li class="faro-ach-item" data-achieved="${item.achieved ? 'true' : 'false'}" data-id="${item.id}"><span class="faro-ach-seal" aria-hidden="true"><i class="fas fa-award"></i></span><span class="faro-ach-body"><strong>${item.title}</strong><span class="faro-ach-why">${item.why}</span><span class="faro-ach-bar" aria-hidden="true"><span class="faro-ach-fill" data-pct="${Math.round(item.progress * 100)}"></span></span><small>${date}</small></span></li>`;
    });
    const host = sheet.querySelector('#faroAchievementsList');
    host.innerHTML = items.join('');
    host.querySelectorAll('.faro-ach-fill').forEach(fill => { fill.style.width = `${Number(fill.dataset.pct) || 0}%`; });
  };
  const open = () => { renderList(); if (window.FaroInteractions?.open) window.FaroInteractions.open(sheet, line); else sheet.showModal(); };
  line.addEventListener('click', open);

  const update = () => {
    const input = gather();
    const list = evaluate(input);
    latest = { list, input };
    const text = homeLine(list, input);
    line.querySelector('#faroAchievementsText').textContent = text;
    line.setAttribute('aria-label', `${text}. Ver conquistas`);
    const seen = readSeen();
    const newIds = fresh(list, seen);
    const nextSeen = { ...(seen || {}) };
    list.filter(item => item.achieved && !nextSeen[item.id]).forEach(item => { nextSeen[item.id] = input.todayKey; });
    if (!seen || newIds.length) writeSeen(nextSeen);
    if (newIds.length) celebrate(list.find(item => item.id === newIds[newIds.length - 1]).title);
    if (sheet.open) renderList();
  };

  const style = document.createElement('style');
  style.id = 'faroAchievementsStyles';
  style.textContent = `
    #faroAchievementsLine{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:8px 14px;border-radius:18px;border:1px solid var(--faro-line);background:var(--faro-surface);color:var(--faro-ink);text-align:left;font-size:14px;font-weight:700;touch-action:manipulation}
    #faroAchievementsLine:focus-visible,.faro-ach-close:focus-visible{outline:3px solid var(--faro-focus);outline-offset:2px}
    .faro-ach-line-text{flex:1;min-width:0}
    .faro-ach-chev{font-size:24px;color:var(--faro-muted)}
    .faro-ach-seal{flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--faro-amber-soft);color:var(--faro-amber-text);font-size:18px}
    .faro-ach-close{width:48px;height:48px;border-radius:16px;border:1px solid var(--faro-line);background:var(--faro-surface-2);color:var(--faro-ink);font-size:24px;flex:none}
    .faro-ach-empty{margin:4px 0 12px;font-size:14px;color:var(--faro-muted)}
    .faro-ach-list{display:grid;gap:10px;margin:0;padding:0;list-style:none}
    .faro-ach-item{display:flex;gap:12px;padding:12px;border-radius:16px;background:var(--faro-surface-2);color:var(--faro-ink)}
    .faro-ach-item[data-achieved="true"] .faro-ach-seal{background:var(--faro-amber);color:var(--faro-on-amber)}
    .faro-ach-item[data-achieved="false"] .faro-ach-seal{filter:grayscale(1);opacity:.7}
    .faro-ach-body{flex:1;min-width:0;display:grid;gap:4px}
    .faro-ach-body strong{font-size:15px}
    .faro-ach-why{font-size:13px;line-height:1.4;color:var(--faro-muted)}
    .faro-ach-body small{font-size:12px;color:var(--faro-muted)}
    .faro-ach-bar{display:block;height:6px;border-radius:999px;background:var(--faro-line);overflow:hidden}
    .faro-ach-item[data-achieved="true"] .faro-ach-bar{display:none}
    .faro-ach-fill{display:block;height:100%;background:var(--faro-amber)}
    .faro-ach-toast{position:fixed;left:0;right:0;bottom:max(96px,calc(env(safe-area-inset-bottom) + 84px));margin:0 auto;width:min(92vw,480px);display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:18px;background:var(--faro-black);color:#F8F5EC;font-size:14px;font-weight:800;z-index:60;transition:opacity .2s ease}
    .faro-ach-toast[hidden]{display:none}
    @media(prefers-reduced-motion:reduce){.faro-ach-toast{transition:none}}
  `;
  document.head.appendChild(style);

  const baseRender = app.render;
  app.render = function(...args) { const result = baseRender.apply(this, args); update(); return result; };
  update();
  window.FaroAchievements = Object.freeze({ refresh:update, open, gather });
})();

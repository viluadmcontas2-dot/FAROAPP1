(() => {
  const app = window.__vettaApp;
  if (!app || window.FaroState) return;

  const ensureExtensions = value => {
    const state = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

    if (!Array.isArray(state.paymentOccurrences)) state.paymentOccurrences = [];
    if (!state.paymentTrackingStartedAt) state.paymentTrackingStartedAt = app.todayKey();
    if (!Array.isArray(state.reserveContributions)) state.reserveContributions = [];
    if (!state.reserveProfiles || typeof state.reserveProfiles !== 'object' || Array.isArray(state.reserveProfiles)) state.reserveProfiles = {};

    return state;
  };


  // ---- Saneamento na entrada (backup importado e estado vindo da nuvem) ----
  // app.js (imutável) interpola ids em HTML; por isso todo id vira [A-Za-z0-9_-]{1,64} aqui.
  const MAX_BACKUP_BYTES = 512 * 1024;
  const MAX_TEXT = 200;
  const MAX_DEPTH = 8;
  const LIMITS = { records: 5000, costs: 200, events: 2000, paymentOccurrences: 5000, reserveContributions: 5000 };
  const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

  const deepClean = (value, depth = 0) => {
    if (typeof value === 'string') return value.length > MAX_TEXT ? value.slice(0, MAX_TEXT) : value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'boolean' || value === null) return value;
    if (depth >= MAX_DEPTH) return undefined;
    if (Array.isArray(value)) return value.slice(0, 10000).map(item => deepClean(item, depth + 1)).filter(item => item !== undefined);
    if (isObj(value)) {
      const out = {};
      for (const key of Object.keys(value)) {
        if (BAD_KEYS.has(key)) continue;
        const clean = deepClean(value[key], depth + 1);
        if (clean !== undefined) out[key] = clean;
      }
      return out;
    }
    return undefined;
  };

  const hash = text => {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36);
  };

  const makeIds = prefix => {
    const map = new Map();
    const used = new Set();
    return {
      map,
      used,
      resolve(raw) {
        const key = String(raw ?? '');
        if (map.has(key)) return map.get(key);
        let id = ID_RE.test(key) ? key : `${prefix}-${hash(key)}`;
        if (!ID_RE.test(key)) { let n = 2; while (used.has(id)) id = `${prefix}-${hash(key)}-${n++}`; }
        map.set(key, id);
        used.add(id);
        return id;
      }
    };
  };

  const num = (value, fallback) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') { const n = Number(value); if (Number.isFinite(n)) return n; }
    return fallback;
  };
  const token = (value, fallback = '') => (typeof value === 'string' && ID_RE.test(value) ? value : fallback);
  const text = value => (typeof value === 'string' ? value : value == null ? '' : String(value));
  const objectsOf = (list, limit) => (Array.isArray(list) ? list : []).filter(isObj).slice(0, limit);

  const sanitizeState = input => {
    const state = deepClean(input);
    if (!isObj(state)) return state;
    const defaults = isObj(app.cloneDefaults?.()) ? app.cloneDefaults() : {};

    // números do topo, combustível e comparação
    for (const key of Object.keys(defaults)) if (typeof defaults[key] === 'number') state[key] = num(state[key], defaults[key]);
    for (const group of ['fuel', 'compare']) {
      if (!isObj(state[group])) { if (state[group] !== undefined) delete state[group]; continue; }
      for (const key of Object.keys(state[group])) {
        const base = defaults[group]?.[key];
        if (typeof base === 'number') state[group][key] = num(state[group][key], base);
      }
      if ('type' in state[group]) state[group].type = token(state[group].type, defaults[group]?.type || 'custom');
    }
    if (Array.isArray(state.workWeekdays)) {
      const days = state.workWeekdays.filter(d => Number.isInteger(d) && d >= 0 && d <= 6);
      state.workWeekdays = days.length ? days : defaults.workWeekdays;
    }

    // custos: ids e referências
    const costIds = makeIds('cost');
    if (Array.isArray(state.costs)) {
      state.costs = objectsOf(state.costs, LIMITS.costs).map(cost => {
        const out = { ...cost, id: costIds.resolve(cost.id), name: text(cost.name), value: num(cost.value, 0) };
        if ('kind' in out) out.kind = token(out.kind, 'monthly');
        if ('category' in out) out.category = token(out.category, 'obligation');
        if ('month' in out && !/^\d{4}-\d{2}$/.test(String(out.month))) delete out.month;
        return out;
      });
    }
    const costId = raw => costIds.resolve(raw);

    // eventos
    const eventIds = makeIds('event');
    if (Array.isArray(state.events)) {
      state.events = objectsOf(state.events, LIMITS.events)
        .filter(ev => DATE_RE.test(text(ev.date)))
        .map(ev => {
          const out = { ...ev, id: eventIds.resolve(ev.id), title: text(ev.title) };
          if ('category' in out) out.category = token(out.category, '');
          if ('notes' in out) out.notes = text(out.notes);
          return out;
        });
    }

    // registros diários
    const recordIds = makeIds('rec');
    const recordSnapshots = ['fuelPriceSnapshot', 'fuelCostKmSnapshot', 'perKmCostSnapshot', 'percentCostSnapshot', 'fixedShareSnapshot'];
    if (Array.isArray(state.records)) {
      state.records = objectsOf(state.records, LIMITS.records)
        .filter(rec => DATE_RE.test(text(rec.date)))
        .map(rec => {
          const out = { ...rec, id: recordIds.resolve(rec.id ?? `day-${rec.date}`) };
          for (const key of ['gross', 'km', 'hours', 'fuelSpend']) if (key in out) out[key] = num(out[key], 0);
          for (const key of recordSnapshots) if (key in out) { const n = num(out[key], null); if (n === null) delete out[key]; else out[key] = n; }
          if ('fuelTypeSnapshot' in out) out.fuelTypeSnapshot = token(out.fuelTypeSnapshot, '');
          return out;
        });
    }

    // pagamentos e reservas (referenciam ids de custos)
    if (Array.isArray(state.paymentOccurrences)) {
      state.paymentOccurrences = objectsOf(state.paymentOccurrences, LIMITS.paymentOccurrences)
        .filter(item => DATE_RE.test(text(item.dueDate)))
        .map(item => {
          const cid = costId(item.costId);
          const out = { ...item, costId: cid, amount: num(item.amount, 0) };
          const derived = `${cid}:${item.dueDate}`;
          const keepsOld = typeof item.id === 'string' && item.id === `${item.costId}:${item.dueDate}` && cid === item.costId;
          out.id = keepsOld || (typeof item.id === 'string' && ID_RE.test(item.id)) ? item.id : derived;
          if ('status' in out) out.status = token(out.status, 'paid');
          if ('kindSnapshot' in out) out.kindSnapshot = token(out.kindSnapshot, '');
          if ('costName' in out) out.costName = text(out.costName);
          return out;
        });
    }
    const entryIds = makeIds('entry');
    if (Array.isArray(state.reserveContributions)) {
      state.reserveContributions = objectsOf(state.reserveContributions, LIMITS.reserveContributions).map(item => ({
        ...item,
        id: entryIds.resolve(item.id),
        reserveId: costId(item.reserveId),
        amount: num(item.amount, 0),
        date: DATE_RE.test(text(item.date)) ? item.date : '',
        createdAt: text(item.createdAt)
      }));
    }
    if (isObj(state.reserveProfiles)) {
      const profiles = {};
      for (const key of Object.keys(state.reserveProfiles)) {
        const profile = state.reserveProfiles[key];
        if (!isObj(profile)) continue;
        const out = { ...profile };
        if ('goalAmount' in out) out.goalAmount = out.goalAmount === null ? null : num(out.goalAmount, null);
        profiles[costId(key)] = out;
      }
      state.reserveProfiles = profiles;
    }
    return state;
  };

  const baseCloneDefaults = app.cloneDefaults;
  app.cloneDefaults = function() {
    return ensureExtensions(baseCloneDefaults.call(this));
  };

  const baseNormalizeState = app.normalizeState;
  app.normalizeState = function(value) {
    return ensureExtensions(sanitizeState(baseNormalizeState.call(this, value)));
  };

  const baseRecordNumbers = app.recordNumbers;
  app.recordNumbers = function(record, context) {
    const result = baseRecordNumbers.call(this, record, context);
    const km = this.number(record?.km);

    if (record?.fuelCostKmSnapshot != null && this.number(record?.fuelSpend) <= 0) {
      const expectedFuel = km * this.number(record.fuelCostKmSnapshot);
      const fuelDelta = result.fuel - expectedFuel;
      result.fuel = expectedFuel;
      result.contribution += fuelDelta;
      result.net += fuelDelta;
      result.costPerKm = km > 0 ? (result.fuel + result.variable + result.percentCost) / km : 0;
    }

    if (record?.fixedShareSnapshot != null) {
      const expectedFixedShare = this.number(record.fixedShareSnapshot);
      const fixedDelta = result.fixedShare - expectedFixedShare;
      result.fixedShare = expectedFixedShare;
      result.net += fixedDelta;
    }

    return result;
  };


  const NOT_BACKUP = 'Esse arquivo não parece um backup do FARO.';
  const TOO_BIG = 'Esse arquivo é grande demais para ser um backup do FARO.';
  const LIMIT_LABELS = { records: 'dias registrados', costs: 'custos', events: 'eventos', paymentOccurrences: 'pagamentos', reserveContributions: 'movimentos de reserva' };
  // Rejeita o arquivo inteiro: cortar em silêncio deixaria pagamentos/reservas sem o custo correspondente.
  const overLimit = data => {
    for (const key of Object.keys(LIMITS)) {
      const size = Array.isArray(data[key]) ? data[key].length : 0;
      if (size > LIMITS[key]) return `Esse backup tem ${LIMIT_LABELS[key]} demais (${size}). O limite é ${LIMITS[key]}. Seus dados atuais não foram alterados.`;
    }
    return null;
  };
  app.importData = async function(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) { this.toast(TOO_BIG); return; }
      const raw = await file.text();
      if (raw.length > MAX_BACKUP_BYTES) { this.toast(TOO_BIG); return; }
      let parsed;
      try { parsed = JSON.parse(raw); } catch (error) { this.toast(NOT_BACKUP); return; }
      if (!isObj(parsed) || (parsed.app !== undefined && parsed.app !== 'FARO')) { this.toast(NOT_BACKUP); return; }
      const rawData = isObj(parsed.data) ? parsed.data : parsed;
      const limitMessage = isObj(rawData) ? overLimit(rawData) : null;
      if (limitMessage) { this.toast(limitMessage); return; }
      const data = deepClean(rawData);
      if (!isObj(data) || !Array.isArray(data.records)) { this.toast(NOT_BACKUP); return; }
      const next = data.version >= 3 ? this.normalizeState(data) : this.migrateLegacy(data);
      if (JSON.stringify(next).length > MAX_BACKUP_BYTES) { this.toast(TOO_BIG); return; }
      this.state = next;
      this.state.onboardingComplete = true;
      this.save();
      this.syncInputs();
      this.render();
      this.toast('Backup importado.');
    } catch (error) {
      console.error(error);
      this.toast(NOT_BACKUP);
    } finally {
      if (event?.target) event.target.value = '';
    }
  };

  app.exportData = function() {
    const payload = {
      app: 'FARO',
      version: Number(this.state?.version || 1),
      exportedAt: new Date().toISOString(),
      data: this.state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `faro-backup-${this.todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.toast('Backup FARO exportado.');
  };

  app.state = ensureExtensions(app.state);
  app.save();

  window.FaroState = Object.freeze({ ensure: ensureExtensions, sanitize: sanitizeState, maxBackupBytes: MAX_BACKUP_BYTES, backupFormat: 'FARO' });
})();

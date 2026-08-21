(() => {
  const app = window.__vettaApp;
  const dayView = document.getElementById('view-day');
  if (!app || !dayView || document.getElementById('faroRegisterFoundation')) return;

  const earningsApi = window.FaroRegisterEarnings;
  if (!earningsApi) {
    console.error('FARO: helper de ganhos por origem não carregou.');
    return;
  }

  const DRAFT_KEY = 'faro-record-draft-v1';
  const ids = ['recordDate', 'recordGross', 'recordKm', 'recordHours', 'recordFuel'];
  const $ = id => document.getElementById(id);
  const earningsSources = [
    { key:'uber', label:'Uber', asset:'./assets/platforms/faro-platform-uber.svg' },
    { key:'ninetyNine', label:'99', asset:'./assets/platforms/faro-platform-99.svg' },
    { key:'indrive', label:'inDrive', asset:'./assets/platforms/faro-platform-indrive.svg' },
    { key:'extras', label:'Extras/Outros', icon:'fa-plus' }
  ];
  const emptyEarnings = () => Object.fromEntries(earningsApi.SOURCES.map(key => [key, 0]));

  const marker = document.createElement('span');
  marker.id = 'faroRegisterFoundation';
  marker.hidden = true;
  dayView.prepend(marker);

  ['recordGross', 'recordKm', 'recordHours', 'recordFuel'].forEach(id => {
    const input = $(id);
    if (input) input.setAttribute('inputmode', 'decimal');
  });

  const grossInput = $('recordGross');
  const grossWrapper = grossInput?.closest('.input-wrapper');
  const grossField = grossWrapper?.parentElement || grossInput?.parentElement || null;
  const grossGrid = grossInput?.closest('.grid') || null;
  let earningsMode = 'detailed';
  const activeSources = new Set();

  const earningsSection = document.createElement('section');
  earningsSection.id = 'faroEarningsBySource';
  earningsSection.className = 'faro-earnings-section';
  earningsSection.innerHTML = `
    <div class="faro-earnings-head">
      <div><span class="label-micro !text-blue-600">De onde veio seu faturamento?</span><p>Toque nos aplicativos que você usou hoje. O FARO soma tudo para você.</p></div>
    </div>
    <div id="faroEarningsGrid" class="faro-earnings-grid">
      ${earningsSources.map(source => `
        <article class="faro-earning-card faro-action-card" data-faro-tone="action" data-faro-earning-card="${source.key}">
          <button type="button" class="faro-earning-toggle" data-faro-earning-toggle="${source.key}" aria-expanded="false">
            <span class="faro-earning-brand">${source.asset ? `<img src="${source.asset}" alt="${source.label}">` : '<span class="faro-extra-icon" aria-hidden="true"><i class="fas fa-plus"></i></span>'}</span>
            <span class="faro-earning-copy">
              <span class="faro-earning-name">${source.label}</span>
              <span class="faro-earning-state" data-faro-platform-state="${source.key}">Não usado</span>
            </span>
            <span class="faro-earning-add" aria-hidden="true"><i class="fas fa-plus"></i></span>
          </button>
          <div class="faro-earning-field hidden" data-faro-earning-field="${source.key}">
            <label for="faroEarning-${source.key}">Quanto entrou?</label>
            <div class="input-wrapper"><span>R$</span><input id="faroEarning-${source.key}" data-faro-earning-source="${source.key}" type="number" min="0" step=".01" inputmode="decimal" class="input-vetta" placeholder="0,00"></div>
          </div>
        </article>`).join('')}
    </div>
    <div id="faroEarningsTotalWrap" class="faro-earnings-total faro-state-card" data-faro-tone="action" aria-live="polite"><span>Total do dia</span><strong id="faroEarningsTotal">${app.money(0)}</strong></div>
    <div id="faroLegacyEarnings" class="faro-earnings-legacy faro-state-card hidden" data-faro-tone="attention">
      <div><strong>Faturamento sem origem detalhada</strong><p>Este registro é antigo. Você pode manter o total como está ou distribuir por aplicativo.</p></div>
      <button id="faroEnableEarningsBreakdown" type="button">Detalhar por aplicativo</button>
    </div>`;
  grossGrid?.insertAdjacentElement('afterend', earningsSection);

  if (!document.getElementById('faroRegisterStyles')) {
    const style = document.createElement('style');
    style.id = 'faroRegisterStyles';
    style.textContent = `
      #view-day .faro-register-chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:8px}
      #view-day .faro-register-chip{min-height:42px;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:800;border:1px solid #dbeafe;transition:transform .1s ease,background-color .12s ease}
      #view-day .faro-register-chip:active{transform:scale(.97);background:#dbeafe}
      #view-day .faro-register-gross-grid--detailed{grid-template-columns:1fr}
      #view-day .faro-register-gross-grid--detailed .faro-register-gross-field{display:none}
      #view-day .faro-earnings-section{display:grid;gap:12px;padding:16px;border-radius:22px;background:#f8fafc;border:1px solid #e2e8f0}
      #view-day .faro-earnings-head p{margin-top:5px;color:#64748b;font-size:11px;line-height:1.5;font-weight:600}
      #view-day .faro-earnings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      #view-day .faro-earning-card{min-width:0;border:1px solid #e2e8f0;border-radius:var(--faro-radius-card,22px);background:#fff;overflow:hidden;box-shadow:var(--faro-shadow-card,none);transition:border-color .12s ease,box-shadow .12s ease}
      #view-day .faro-earning-card[data-active="true"]{border-color:#93c5fd;box-shadow:0 12px 26px -22px rgba(37,99,235,.55)}
      #view-day .faro-earning-card[data-used="true"]{background:linear-gradient(150deg,#fff,#f7faff)}
      #view-day .faro-earning-toggle{width:100%;min-height:82px;padding:11px;display:grid;grid-template-columns:42px 1fr 22px;gap:9px;align-items:center;text-align:left}
      #view-day .faro-earning-brand{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;overflow:hidden;background:#fff}
      #view-day .faro-earning-brand img{width:100%;height:100%;object-fit:contain;display:block}
      #view-day .faro-extra-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:#eff6ff;color:#2563eb;font-size:16px}
      #view-day .faro-earning-copy{min-width:0;display:grid;gap:3px}
      #view-day .faro-earning-name{min-width:0;font-size:12px;line-height:1.2;font-weight:800;color:#0f172a;overflow-wrap:anywhere}
      #view-day .faro-earning-state{font-size:9.5px;line-height:1.25;font-weight:700;color:#94a3b8;font-variant-numeric:tabular-nums}
      #view-day .faro-earning-card[data-used="true"] .faro-earning-state{color:#1d4ed8}
      #view-day .faro-earning-add{color:#94a3b8;font-size:11px;text-align:right;transition:transform .12s ease,color .12s ease}
      #view-day .faro-earning-card[data-active="true"] .faro-earning-add{color:#2563eb;transform:rotate(45deg)}
      #view-day .faro-earning-field{padding:0 11px 11px}
      #view-day .faro-earning-field label{display:block;margin-bottom:6px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
      #view-day .faro-earnings-total{display:flex;align-items:end;justify-content:space-between;gap:12px;padding:14px 15px;border-radius:var(--faro-radius-card,22px);background:#0b1121;color:#fff}
      #view-day .faro-earnings-total span{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#bfdbfe}
      #view-day .faro-earnings-total strong{font-size:24px;line-height:1;font-weight:800;letter-spacing:-.04em}
      #view-day .faro-earnings-legacy{display:grid;gap:12px;padding:14px;border-radius:var(--faro-radius-row,17px);background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}
      #view-day .faro-earnings-legacy strong{font-size:12px}.faro-earnings-legacy p{margin-top:4px;font-size:10px;line-height:1.45}
      #view-day .faro-earnings-legacy button{min-height:42px;border-radius:13px;background:#fff;color:#c2410c;font-size:10px;font-weight:800;border:1px solid #fdba74}
      #saveDayButton[data-saving="true"]{opacity:.68;pointer-events:none}
      #view-day .faro-draft-note{display:flex;align-items:center;gap:7px;margin-top:10px;color:#64748b;font-size:11px;font-weight:700}
      @media(max-width:350px){#view-day .faro-earning-toggle{grid-template-columns:38px 1fr 18px;padding:9px}#view-day .faro-earning-brand,#view-day .faro-extra-icon{width:38px;height:38px}}
      @media(prefers-reduced-motion:reduce){#view-day .faro-register-chip,#view-day .faro-earning-card,#view-day .faro-earning-add{transition:none}#view-day .faro-register-chip:active{transform:none}}
    `;
    document.head.appendChild(style);
  }

  if (grossField) grossField.classList.add('faro-register-gross-field');

  const readEarningsInputs = () => Object.fromEntries(earningsApi.SOURCES.map(key => [
    key,
    document.querySelector(`[data-faro-earning-source="${key}"]`)?.value ?? ''
  ]));

  const earningsSnapshot = () => {
    try {
      const normalized = earningsApi.normalize(readEarningsInputs());
      return { valid:true, normalized, total:earningsApi.total(normalized), error:null };
    } catch (error) {
      return { valid:false, normalized:emptyEarnings(), total:0, error };
    }
  };

  const renderSourceStates = () => {
    for (const source of earningsSources) {
      const card = document.querySelector(`[data-faro-earning-card="${source.key}"]`);
      const field = document.querySelector(`[data-faro-earning-field="${source.key}"]`);
      const toggle = document.querySelector(`[data-faro-earning-toggle="${source.key}"]`);
      const input = document.querySelector(`[data-faro-earning-source="${source.key}"]`);
      const status = document.querySelector(`[data-faro-platform-state="${source.key}"]`);
      const active = activeSources.has(source.key);
      const amount = Math.max(0, app.number(input?.value));
      if (card) {
        card.dataset.active = active ? 'true' : 'false';
        card.dataset.used = amount > 0 ? 'true' : 'false';
      }
      if (status) status.textContent = amount > 0 ? app.money(amount) : 'Não usado';
      field?.classList.toggle('hidden', !active);
      toggle?.setAttribute('aria-expanded', active ? 'true' : 'false');
      toggle?.setAttribute('aria-label', `${source.label}: ${amount > 0 ? app.money(amount) : 'não usado'}. ${active ? 'Recolher campo' : 'Informar ganho'}`);
    }
  };

  const setEarningsValues = values => {
    const normalized = earningsApi.normalize(values || {});
    activeSources.clear();
    for (const source of earningsSources) {
      const input = document.querySelector(`[data-faro-earning-source="${source.key}"]`);
      const value = normalized[source.key] || 0;
      if (input) input.value = value > 0 ? String(value) : '';
      if (value > 0) activeSources.add(source.key);
    }
    renderSourceStates();
    return normalized;
  };

  const syncEarningsTotal = ({ render=true, persist=true } = {}) => {
    const snapshot = earningsSnapshot();
    if (grossInput) grossInput.value = snapshot.valid && snapshot.total > 0 ? String(snapshot.total) : '';
    const totalNode = $('faroEarningsTotal');
    if (totalNode) totalNode.textContent = app.money(snapshot.valid ? snapshot.total : 0);
    renderSourceStates();
    document.querySelectorAll('[data-faro-earning-source]').forEach(input => {
      input.setCustomValidity(snapshot.valid ? '' : 'Use somente valores iguais ou maiores que zero.');
    });
    if (render) app.renderRecordPreview();
    if (persist) saveDraft();
    return snapshot;
  };

  const setEarningsMode = (mode, { values=null, render=true, persist=false } = {}) => {
    earningsMode = mode === 'legacy' ? 'legacy' : 'detailed';
    const grid = $('faroEarningsGrid');
    const total = $('faroEarningsTotalWrap');
    const legacy = $('faroLegacyEarnings');
    const grossChips = document.querySelector('[data-chip-row="recordGross"]');
    const detailed = earningsMode === 'detailed';

    grossGrid?.classList.toggle('faro-register-gross-grid--detailed', detailed);
    if (grossInput) grossInput.readOnly = detailed;
    grossChips?.classList.toggle('hidden', detailed);
    grid?.classList.toggle('hidden', !detailed);
    total?.classList.toggle('hidden', !detailed);
    legacy?.classList.toggle('hidden', detailed);

    if (detailed) {
      if (values) setEarningsValues(values);
      else { activeSources.clear(); setEarningsValues(emptyEarnings()); }
      syncEarningsTotal({ render, persist });
    } else {
      activeSources.clear();
      renderSourceStates();
      if (render) app.renderRecordPreview();
      if (persist) saveDraft();
    }
  };

  const readForm = () => {
    const base = {
      date: $('recordDate')?.value || app.todayKey(),
      gross: $('recordGross')?.value || '',
      km: $('recordKm')?.value || '',
      hours: $('recordHours')?.value || '',
      fuel: $('recordFuel')?.value || '',
      updatedAt: new Date().toISOString()
    };
    if (earningsMode !== 'detailed') return base;
    const snapshot = earningsSnapshot();
    return {
      ...base,
      gross: snapshot.valid && snapshot.total > 0 ? String(snapshot.total) : '',
      earningsMode: 'detailed',
      earningsBySource: snapshot.normalized
    };
  };

  const hasMeaningfulDraft = draft => Boolean(
    draft && (
      String(draft.gross || '').trim() || String(draft.km || '').trim() || String(draft.hours || '').trim() || String(draft.fuel || '').trim() ||
      Object.values(draft.earningsBySource || {}).some(value => Number(value) > 0)
    )
  );

  const saveDraft = () => {
    try {
      const draft = readForm();
      if (hasMeaningfulDraft(draft)) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {}
  };

  const loadDraft = () => {
    try {
      const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch { return null; }
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  };

  const applyDraft = draft => {
    if (!hasMeaningfulDraft(draft)) return false;
    $('recordDate').value = draft.date || app.todayKey();
    $('recordGross').value = draft.gross ?? '';
    $('recordKm').value = draft.km ?? '';
    $('recordHours').value = draft.hours ?? '';
    $('recordFuel').value = draft.fuel ?? '';
    if (draft.earningsMode === 'detailed' || draft.earningsBySource) {
      setEarningsMode('detailed', { values:draft.earningsBySource || emptyEarnings(), render:false, persist:false });
    } else {
      setEarningsMode('legacy', { render:false, persist:false });
    }
    app.renderRecordPreview();
    const optional = document.getElementById('faroOptionalDetails');
    if (optional) optional.open = Boolean(draft.hours || draft.fuel);
    return true;
  };

  const makeChip = (label, value, inputId, unit = '') => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'faro-register-chip';
    button.textContent = label;
    button.dataset.addValue = String(value);
    button.dataset.input = inputId;
    button.setAttribute('aria-label', `Adicionar ${label.replace('+', '').trim()}${unit ? ` ${unit}` : ''}`);
    return button;
  };

  const insertChips = (inputId, items, unit = '') => {
    const input = $(inputId);
    if (!input || document.querySelector(`[data-chip-row="${inputId}"]`)) return;
    const row = document.createElement('div');
    row.className = 'faro-register-chips';
    row.dataset.chipRow = inputId;
    items.forEach(([label, value]) => row.appendChild(makeChip(label, value, inputId, unit)));
    const anchor = input.closest('.input-wrapper') || input;
    anchor.insertAdjacentElement('afterend', row);
  };

  insertChips('recordGross', [['+ R$50', 50], ['+ R$100', 100], ['+ R$200', 200]]);
  insertChips('recordKm', [['+ 5 km', 5], ['+ 10 km', 10], ['+ 50 km', 50]], 'km');
  setEarningsMode('detailed', { render:false, persist:false });

  const baseRecordDraft = app.recordDraft;
  app.recordDraft = function() {
    if (earningsMode === 'detailed') syncEarningsTotal({ render:false, persist:false });
    const draft = baseRecordDraft.call(this);
    if (earningsMode !== 'detailed') return draft;
    const snapshot = earningsSnapshot();
    return {
      ...draft,
      gross: snapshot.valid ? snapshot.total : 0,
      earningsBySource: snapshot.normalized
    };
  };

  const note = document.createElement('div');
  note.id = 'faroRegisterDraftNote';
  note.className = 'faro-draft-note hidden';
  note.innerHTML = '<i class="fas fa-cloud-arrow-down" aria-hidden="true"></i><span>Rascunho recuperado. Continue de onde parou.</span>';
  const firstCard = $('recordDate')?.closest('.card-vetta');
  if (firstCard) firstCard.insertBefore(note, firstCard.firstChild);

  $('clearDayButton')?.addEventListener('click', () => {
    setEarningsMode('detailed', { render:false, persist:false });
    if (grossInput) grossInput.value = '';
    clearDraft();
    note.classList.add('hidden');
  });

  earningsSection.addEventListener('click', event => {
    const detail = event.target.closest('#faroEnableEarningsBreakdown');
    if (detail) {
      event.preventDefault();
      setEarningsMode('detailed', { render:true, persist:true });
      return;
    }

    const toggle = event.target.closest('[data-faro-earning-toggle]');
    if (!toggle) return;
    event.preventDefault();
    const key = toggle.dataset.faroEarningToggle;
    activeSources.has(key) ? activeSources.delete(key) : activeSources.add(key);
    renderSourceStates();
    if (activeSources.has(key)) document.querySelector(`[data-faro-earning-source="${key}"]`)?.focus({ preventScroll:true });
  });

  earningsSection.addEventListener('input', event => {
    if (!event.target.matches('[data-faro-earning-source]')) return;
    activeSources.add(event.target.dataset.faroEarningSource);
    renderSourceStates();
    syncEarningsTotal({ render:true, persist:true });
  });

  dayView.addEventListener('click', event => {
    const chip = event.target.closest('.faro-register-chip');
    if (!chip) return;
    const input = $(chip.dataset.input);
    if (!input) return;
    const current = app.number(input.value);
    const increment = Number(chip.dataset.addValue || 0);
    const next = current + increment;
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    chip.animate?.([{ transform:'scale(.97)' }, { transform:'scale(1)' }], { duration:120, easing:'ease-out' });
  });

  ids.forEach(id => $(id)?.addEventListener('input', saveDraft));
  window.addEventListener('pagehide', saveDraft);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && app.currentView === 'day') saveDraft(); });

  const baseShowView = app.showView;
  app.showView = function(view, primaryView = view) {
    const editingExisting = view === 'day' && Boolean(
      $('recordDate')?.value &&
      (String($('recordGross')?.value || '').trim() || String($('recordKm')?.value || '').trim()) &&
      this.state.records.some(record => record.date === $('recordDate').value)
    );
    const editingDate = editingExisting ? $('recordDate')?.value : null;
    const result = baseShowView.call(this, view, primaryView);
    if (view === 'day') {
      note.classList.add('hidden');
      if (editingExisting) {
        const record = this.state.records.find(item => item.date === editingDate);
        if (record?.earningsBySource) setEarningsMode('detailed', { values:record.earningsBySource, render:false, persist:false });
        else setEarningsMode('legacy', { render:false, persist:false });
        app.renderRecordPreview();
      } else {
        const restored = applyDraft(loadDraft());
        if (restored) note.classList.remove('hidden');
        else setEarningsMode('detailed', { render:false, persist:false });
      }
    }
    return result;
  };

  let saving = false;
  const baseSaveDay = app.saveDay;
  app.saveDay = function(...args) {
    if (saving) return;

    if (earningsMode === 'detailed') {
      const snapshot = earningsSnapshot();
      if (!snapshot.valid) return this.toast('Use somente valores iguais ou maiores que zero nos ganhos.');
      if (!earningsApi.hasAny(snapshot.normalized)) return this.toast('Informe pelo menos um ganho do dia.');
      syncEarningsTotal({ render:false, persist:false });
    }

    const before = this.recordDraft();
    if (!before.date || before.gross <= 0 || before.km <= 0) return baseSaveDay.apply(this, args);
    saving = true;
    const button = $('saveDayButton');
    if (button) {
      button.dataset.saving = 'true';
      button.setAttribute('aria-busy', 'true');
    }
    try {
      const result = baseSaveDay.apply(this, args);
      const saved = this.state.records.find(record => record.date === before.date && Number(record.gross) === before.gross && Number(record.km) === before.km);
      if (saved) {
        clearDraft();
        setEarningsMode('detailed', { render:false, persist:false });
        if (grossInput) grossInput.value = '';
      }
      return result;
    } finally {
      setTimeout(() => {
        saving = false;
        if (button) {
          delete button.dataset.saving;
          button.removeAttribute('aria-busy');
        }
      }, 350);
    }
  };

  const resultModal = document.getElementById('faroDailyResult');
  const resultMessage = document.getElementById('faroResultMessage');
  const resultDelta = document.getElementById('faroResultDelta');
  if (resultModal && resultMessage && resultDelta) {
    const observer = new MutationObserver(() => {
      if (resultModal.classList.contains('hidden')) return;
      const c = app.calculations();
      const week = app.weekContext(c);
      const remainingWeek = Math.max(0, week.target - week.actual);
      resultMessage.textContent = week.target > 0
        ? remainingWeek > 0
          ? `Na semana, faltam ${app.money(remainingWeek, 0)} brutos para o ritmo planejado.`
          : `A semana já alcançou o ritmo planejado. O mês continua como seu norte.`
        : resultMessage.textContent;
      const remainingMonth = Math.max(0, app.state.targetProfit - c.actualNet);
      resultDelta.textContent = remainingMonth > 0
        ? `No mês, faltam ${app.money(remainingMonth, 0)} líquidos. O FARO redistribui o restante pelos próximos dias planejados.`
        : `Objetivo líquido do mês alcançado. Seus próximos registros continuam alimentando o histórico real.`;
    });
    observer.observe(resultModal, { attributes:true, attributeFilter:['class'] });
  }

  window.FaroRegister = {
    loadDraft,
    clearDraft,
    saveDraft,
    readEarningsInputs,
    syncEarningsTotal,
    setEarningsMode,
    mode:() => earningsMode
  };
})();
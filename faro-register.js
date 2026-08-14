(() => {
  const app = window.__vettaApp;
  const dayView = document.getElementById('view-day');
  if (!app || !dayView || document.getElementById('faroRegisterFoundation')) return;

  const DRAFT_KEY = 'faro-record-draft-v1';
  const ids = ['recordDate', 'recordGross', 'recordKm', 'recordHours', 'recordFuel'];
  const $ = id => document.getElementById(id);
  const marker = document.createElement('span');
  marker.id = 'faroRegisterFoundation';
  marker.hidden = true;
  dayView.prepend(marker);

  ['recordGross', 'recordKm', 'recordHours', 'recordFuel'].forEach(id => {
    const input = $(id);
    if (input) input.setAttribute('inputmode', 'decimal');
  });

  const readForm = () => ({
    date: $('recordDate')?.value || app.todayKey(),
    gross: $('recordGross')?.value || '',
    km: $('recordKm')?.value || '',
    hours: $('recordHours')?.value || '',
    fuel: $('recordFuel')?.value || '',
    updatedAt: new Date().toISOString()
  });

  const hasMeaningfulDraft = draft => Boolean(
    draft && (String(draft.gross || '').trim() || String(draft.km || '').trim() || String(draft.hours || '').trim() || String(draft.fuel || '').trim())
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

  if (!document.getElementById('faroRegisterStyles')) {
    const style = document.createElement('style');
    style.id = 'faroRegisterStyles';
    style.textContent = `
      #view-day .faro-register-chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:8px}
      #view-day .faro-register-chip{min-height:42px;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:900;border:1px solid #dbeafe;transition:transform .1s ease,background-color .12s ease}
      #view-day .faro-register-chip:active{transform:scale(.97);background:#dbeafe}
      #saveDayButton[data-saving="true"]{opacity:.68;pointer-events:none}
      #view-day .faro-draft-note{display:flex;align-items:center;gap:7px;margin-top:10px;color:#64748b;font-size:11px;font-weight:700}
      @media(prefers-reduced-motion:reduce){#view-day .faro-register-chip{transition:none}#view-day .faro-register-chip:active{transform:none}}
    `;
    document.head.appendChild(style);
  }

  const note = document.createElement('div');
  note.id = 'faroRegisterDraftNote';
  note.className = 'faro-draft-note hidden';
  note.innerHTML = '<i class="fas fa-cloud-arrow-down" aria-hidden="true"></i><span>Rascunho recuperado. Continue de onde parou.</span>';
  const firstCard = $('recordDate')?.closest('.card-vetta');
  if (firstCard) firstCard.insertBefore(note, firstCard.firstChild);

  $('clearDayButton')?.addEventListener('click', () => {
    clearDraft();
    note.classList.add('hidden');
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
    const result = baseShowView.call(this, view, primaryView);
    if (view === 'day') {
      note.classList.add('hidden');
      if (!editingExisting) {
        const restored = applyDraft(loadDraft());
        if (restored) note.classList.remove('hidden');
      }
    }
    return result;
  };

  let saving = false;
  const baseSaveDay = app.saveDay;
  app.saveDay = function(...args) {
    if (saving) return;
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
      const saved = this.state.records.some(record => record.date === before.date && Number(record.gross) === before.gross && Number(record.km) === before.km);
      if (saved) clearDraft();
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
          ? `Na semana, faltam ${app.money(remainingWeek, 0)} líquidos para o ritmo planejado.`
          : `A semana já alcançou o ritmo planejado. O mês continua como seu norte.`
        : resultMessage.textContent;
      const remainingMonth = Math.max(0, app.state.targetProfit - c.actualNet);
      resultDelta.textContent = remainingMonth > 0
        ? `No mês, faltam ${app.money(remainingMonth, 0)} líquidos. O FARO redistribui o restante pelos próximos dias planejados.`
        : `Objetivo líquido do mês alcançado. Seus próximos registros continuam alimentando o histórico real.`;
    });
    observer.observe(resultModal, { attributes:true, attributeFilter:['class'] });
  }

  window.FaroRegister = { loadDraft, clearDraft, saveDraft };
})();

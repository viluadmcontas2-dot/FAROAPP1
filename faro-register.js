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
    { key:'extras', label:'Extras/Outros', chip:'Extras', icon:'fa-plus' }
  ];
  const sourceInfo = key => earningsSources.find(source => source.key === key) || earningsSources[0];
  const chipLabel = source => source.chip || source.label;
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
  let loadedDate = null;
  // km sugerido pelo app (valor do último dia). Enquanto o motorista não mexe, não conta como "digitado".
  let kmSuggested = null;
  // F3: o teclado do Registro é o único lugar onde se digita dinheiro. `digits` guarda centavos digitados;
  // "Adicionar" soma no app escolhido. Os campos por app (ocultos) continuam sendo a fonte do único bruto.
  let selectedSource = earningsSources[0].key;
  let digits = '';
  const MAX_DIGITS = 7;
  const typedValue = () => Number(digits || '0') / 100;
  const ADD_ERROR = 'Digite um valor no teclado antes de adicionar.';
  const SAVE_ERROR = 'Sem ganho não há o que salvar. Adicione pelo menos um app.';
  const NEGATIVE_ERROR = 'Use somente valores iguais ou maiores que zero nos ganhos.';
  const KM_ERROR = 'Informe os km rodados nesse dia.';

  const brandMark = source => source.asset
    ? `<img src="${window.FaroSafe.esc(source.asset)}" alt="" aria-hidden="true">`
    : '<span class="faro-extra-icon" aria-hidden="true"><i class="fas fa-plus"></i></span>';
  const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'];

  const chipsMarkup = earningsSources.map(source => `
          <button type="button" role="radio" aria-checked="false" class="faro-source-chip" data-faro-source-chip="${window.FaroSafe.esc(source.key)}"><span class="faro-source-mark">${window.FaroSafe.raw(brandMark(source))}</span><span>${window.FaroSafe.esc(chipLabel(source))}</span></button>`).join('');
  const keypadMarkup = keypadKeys.map(key => key === 'del'
          ? '<button type="button" class="faro-key" data-faro-key="del" aria-label="Apagar"><i class="fas fa-delete-left" aria-hidden="true"></i><span class="faro-key-text">Apagar</span></button>'
          : `<button type="button" class="faro-key" data-faro-key="${window.FaroSafe.esc(key)}">${window.FaroSafe.esc(key)}</button>`).join('');
  const storeMarkup = earningsSources.map(source => `<input id="faroEarning-${window.FaroSafe.esc(source.key)}" data-faro-earning-source="${window.FaroSafe.esc(source.key)}" type="number" min="0" step=".01" tabindex="-1" aria-hidden="true">`).join('');

  const earningsSection = document.createElement('section');
  earningsSection.id = 'faroEarningsBySource';
  earningsSection.className = 'faro-earnings-section';
  earningsSection.innerHTML = `
    <div class="faro-earnings-head">
      <span class="label-micro faro-eyebrow">De onde veio seu faturamento?</span>
    </div>
    <div id="faroEarningsQuick" class="faro-quick">
      <div id="faroEarningChips" class="faro-source-chips" role="radiogroup" aria-label="App do ganho">
        ${window.FaroSafe.raw(chipsMarkup)}
      </div>
      <p id="faroEarningQuestion" class="faro-earning-question">Quanto entrou em Uber?</p>
      <output id="faroEarningDisplay" class="faro-earning-display" data-zero="true" aria-live="polite">${window.FaroSafe.esc(app.money(0))}</output>
      <div id="faroEarningMessage" class="faro-field-error hidden" role="alert"></div>
      <div id="faroEarningPad" class="faro-keypad">
        ${window.FaroSafe.raw(keypadMarkup)}
      </div>
      <button id="faroEarningAdd" type="button" class="faro-earning-add-button">Adicionar</button>
      <div id="faroEarningList" class="faro-earning-list" aria-live="polite"></div>
    </div>
    <div id="faroEarningsGrid" class="faro-earnings-store" hidden>
      ${window.FaroSafe.raw(storeMarkup)}
    </div>
    <div id="faroLegacyEarnings" class="faro-earnings-legacy faro-state-card hidden" data-faro-tone="attention">
      <div><strong>Faturamento sem origem detalhada</strong><p>Este registro é antigo. Você pode manter o total como está ou distribuir por aplicativo.</p></div>
      <button id="faroEnableEarningsBreakdown" type="button">Detalhar por aplicativo</button>
    </div>`;
  // Dinheiro primeiro (como no mockup 4), km logo depois.
  if (grossGrid) grossGrid.insertAdjacentElement('beforebegin', earningsSection);

  if (!document.getElementById('faroRegisterStyles')) {
    const style = document.createElement('style');
    style.id = 'faroRegisterStyles';
    style.textContent = `
      #view-day .faro-register-chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:8px}
      #view-day .faro-register-chip{min-height:48px;border-radius:12px;background:var(--faro-surface);color:var(--faro-ink);font-size:12px;font-weight:800;border:1px solid var(--faro-line);transition:transform .1s ease,background-color .12s ease}
      #view-day .faro-register-chip:active{transform:scale(.97);background:var(--faro-amber-soft)}
      #view-day .faro-register-gross-grid--detailed{grid-template-columns:1fr}
      #view-day .faro-register-gross-grid--detailed .faro-register-gross-field{display:none}
      #view-day .faro-earnings-section{display:grid;gap:12px;padding:16px;border-radius:22px;background:var(--faro-surface-soft);border:1px solid var(--faro-line)}
      #view-day .faro-quick{display:grid;gap:10px}
      #view-day .faro-source-chips{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
      #view-day .faro-source-chip{min-height:58px;padding:4px 2px;border-radius:14px;background:#fff;border:2px solid var(--faro-line);color:var(--faro-ink);font-size:13px;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1.1;transition:border-color .12s ease,background-color .12s ease}
      #view-day .faro-source-chip[aria-checked="true"]{background:var(--faro-black);border-color:var(--faro-amber);color:var(--faro-paper);box-shadow:inset 0 -4px 0 var(--faro-amber)}
      #view-day .faro-source-mark{width:24px;height:24px;border-radius:7px;overflow:hidden;display:grid;place-items:center;background:#fff}
      #view-day .faro-source-mark img{width:100%;height:100%;object-fit:contain;display:block}
      #view-day .faro-extra-icon{width:24px;height:24px;display:grid;place-items:center;color:var(--faro-amber-text);font-size:12px}
      #view-day .faro-earning-question{font-size:14px;font-weight:700;color:var(--faro-muted)}
      #view-day .faro-earning-display{display:block;font-size:44px;line-height:1.05;font-weight:800;letter-spacing:-.03em;color:var(--faro-ink);font-variant-numeric:tabular-nums;min-height:46px}
      #view-day .faro-earning-display[data-zero="true"]{color:var(--faro-faint)}
      #view-day .faro-field-error{display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:13px;font-weight:700;line-height:1.35}
      #view-day .faro-field-error.hidden{display:none}
      #view-day .faro-keypad{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      #view-day .faro-key{min-height:52px;border-radius:14px;background:#fff;border:2px solid var(--faro-line);color:var(--faro-ink);font-size:24px;font-weight:800;display:grid;place-items:center;font-variant-numeric:tabular-nums;touch-action:manipulation;transition:background-color .1s ease}
      #view-day .faro-key:active{background:var(--faro-amber-soft)}
      #view-day .faro-key[data-faro-key="del"]{font-size:20px;color:var(--faro-muted)}
      #view-day .faro-key-text{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
      #view-day .faro-earning-add-button{min-height:52px;border-radius:14px;background:var(--faro-surface);border:2px solid var(--faro-ink);color:var(--faro-ink);font-size:15px;font-weight:800}
      #view-day .faro-earning-list{display:grid;gap:0}
      #view-day .faro-earning-row{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:48px;border-bottom:1px solid var(--faro-line);font-size:15px;font-weight:700;color:var(--faro-ink)}
      #view-day .faro-earning-row strong{margin-left:auto;font-variant-numeric:tabular-nums}
      #view-day .faro-earning-row button{min-height:48px;padding:0 10px;border-radius:12px;font-size:12px;font-weight:800;color:var(--faro-muted);text-decoration:underline;text-underline-offset:3px}
      #view-day .faro-earnings-total{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:52px;padding:10px 0 0;background:none;box-shadow:none;border-radius:0;font-size:15px;font-weight:800;color:var(--faro-ink)}
      #view-day .faro-earnings-total strong{font-size:24px;line-height:1;font-weight:800;letter-spacing:-.03em;color:#047857;font-variant-numeric:tabular-nums}
      #view-day .faro-earning-empty{display:flex;gap:12px;align-items:center;padding:12px 14px;border:2px dashed var(--faro-line);border-radius:16px;color:var(--faro-muted)}
      #view-day .faro-earning-empty i{font-size:20px;color:var(--faro-amber-text)}
      #view-day .faro-earning-empty strong{display:block;font-size:15px;color:var(--faro-ink)}
      #view-day .faro-earning-empty span{display:block;font-size:13px;line-height:1.35}
      #view-day .faro-earnings-legacy{display:grid;gap:12px;padding:14px;border-radius:var(--faro-radius-row,17px);background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}
      #view-day .faro-earnings-legacy strong{font-size:13px}.faro-earnings-legacy p{margin-top:4px;font-size:12px;line-height:1.45}
      #view-day .faro-earnings-legacy button{min-height:48px;border-radius:13px;background:#fff;color:#c2410c;font-size:13px;font-weight:800;border:1px solid #fdba74}
      #view-day .faro-date-summary{display:flex;align-items:center;justify-content:space-between;gap:10px}
      #view-day .faro-date-summary strong{font-size:16px;font-weight:800;color:var(--faro-ink)}
      #view-day .faro-date-summary button,#view-day .faro-km-same{min-height:48px;padding:0 12px;border-radius:12px;font-size:13px;font-weight:800;color:var(--faro-amber-text);background:var(--faro-amber-soft);border:1px solid var(--faro-line)}
      #view-day .faro-km-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px}
      #view-day .faro-km-hint{font-size:12px;font-weight:600;color:var(--faro-muted);line-height:1.35}
      #view-day .faro-km-tools + .faro-field-error,#view-day #faroKmMessage{margin-top:8px}
      #saveDayButton[data-saving="true"]{opacity:.68;pointer-events:none}
      #view-day .faro-date-conflict{display:grid;gap:10px;margin-top:10px;padding:14px;border-radius:var(--faro-radius-row,17px);background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}
      #view-day .faro-date-conflict strong{font-size:13px;line-height:1.35}
      #view-day .faro-date-conflict p{font-size:12px;line-height:1.45;font-weight:600}
      #view-day .faro-date-conflict-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      #view-day .faro-date-conflict button{min-height:48px;border-radius:13px;font-size:13px;font-weight:800;border:1px solid #fdba74;background:#fff;color:#c2410c}
      #view-day .faro-date-conflict button[data-faro-conflict="open"]{background:#c2410c;border-color:#c2410c;color:#fff}
      .faro-day-saved{position:fixed;left:50%;bottom:calc(105px + env(safe-area-inset-bottom));z-index:100;transform:translateX(-50%);width:min(92vw,440px);display:grid;gap:10px;padding:14px 16px;border-radius:18px;background:var(--faro-black);color:var(--faro-paper);box-shadow:0 16px 35px rgba(var(--faro-black-rgb),.35)}
      .faro-day-saved.hidden{display:none}
      .faro-day-saved p{font-size:14px;line-height:1.4;font-weight:700}
      .faro-day-saved strong{font-variant-numeric:tabular-nums}
      .faro-day-saved-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
      .faro-day-saved button{min-height:48px;padding:0 14px;border-radius:12px;font-size:13px;font-weight:800;background:rgba(255,255,255,.12);color:#fff}
      .faro-day-saved button[data-faro-saved="undo"]{background:var(--faro-amber);color:var(--faro-on-amber);margin-right:auto}
      .faro-day-saved button:focus-visible,#view-day .faro-date-conflict button:focus-visible,#view-day .faro-quick button:focus-visible,#view-day .faro-date-summary button:focus-visible,#view-day .faro-km-same:focus-visible{outline:3px solid var(--faro-amber);outline-offset:2px}
      /* Classes .hidden dentro do Registro vencem as regras de layout acima (antes o aviso de data e o legado ficavam sempre visíveis). */
      #view-day .faro-date-conflict.hidden,#view-day .faro-earnings-legacy.hidden,#view-day .faro-quick.hidden,#view-day .faro-field-error.hidden,#view-day .faro-km-same.hidden,#view-day .faro-draft-note.hidden{display:none}
      #view-day .faro-draft-note{display:flex;align-items:center;gap:7px;margin-top:10px;color:var(--faro-muted);font-size:12px;font-weight:700}
      html[data-faro-car="on"] #view-day .faro-source-chip,html[data-faro-car="on"] #view-day .faro-key,html[data-faro-car="on"] #view-day .faro-earning-add-button{background:#1f1f1f;border-color:#475569;color:#f8fafc}
      html[data-faro-car="on"] #view-day .faro-source-chip[aria-checked="true"]{background:var(--faro-amber-night);border-color:var(--faro-amber-night);color:var(--faro-black);box-shadow:none}
      html[data-faro-car="on"] #view-day .faro-earning-display,html[data-faro-car="on"] #view-day .faro-earning-row,html[data-faro-car="on"] #view-day .faro-earnings-total,html[data-faro-car="on"] #view-day .faro-earning-empty strong,html[data-faro-car="on"] #view-day .faro-date-summary strong{color:#f8fafc}
      html[data-faro-car="on"] #view-day .faro-earning-question,html[data-faro-car="on"] #view-day .faro-earning-empty,html[data-faro-car="on"] #view-day .faro-km-hint{color:#cbd5e1}
      @media(max-width:350px){#view-day .faro-source-chip{font-size:12px}#view-day .faro-earning-display{font-size:38px}}
      @media(prefers-reduced-motion:reduce){#view-day .faro-register-chip,#view-day .faro-source-chip,#view-day .faro-key{transition:none}#view-day .faro-register-chip:active{transform:none}}
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

  const showFieldError = (node, message) => {
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('hidden', !message);
  };
  const earningMessage = () => $('faroEarningMessage');

  // Desenha chips, valor digitado, lista por app e total a partir dos campos por app (fonte única do bruto).
  const renderQuick = () => {
    const snapshot = earningsSnapshot();
    const selected = sourceInfo(selectedSource);
    document.querySelectorAll('[data-faro-source-chip]').forEach(chip => {
      chip.setAttribute('aria-checked', chip.dataset.faroSourceChip === selectedSource ? 'true' : 'false');
      chip.tabIndex = chip.dataset.faroSourceChip === selectedSource ? 0 : -1;
    });
    const question = $('faroEarningQuestion');
    if (question) question.textContent = selected.key === 'extras' ? 'Quanto entrou de extras?' : `Quanto entrou em ${selected.label}?`;
    const display = $('faroEarningDisplay');
    if (display) {
      display.textContent = app.money(typedValue());
      display.dataset.zero = digits ? 'false' : 'true';
    }
    const list = $('faroEarningList');
    if (!list) return snapshot;
    const used = earningsSources.filter(source => (snapshot.normalized[source.key] || 0) > 0);
    if (!used.length) {
      list.innerHTML = '<div class="faro-earning-empty"><i class="fas fa-pen-to-square" aria-hidden="true"></i><div><strong>Nenhum ganho ainda</strong><span>Escolha o app, digite o valor e toque em Adicionar.</span></div></div>';
      return snapshot;
    }
    const rows = used.map(source => `
      <div class="faro-earning-row" data-faro-earning-row="${window.FaroSafe.esc(source.key)}">
        <span>${window.FaroSafe.esc(source.label)}</span><strong>${window.FaroSafe.esc(app.money(snapshot.normalized[source.key]))}</strong>
        <button type="button" data-faro-earning-remove="${window.FaroSafe.esc(source.key)}" aria-label="Remover ganho de ${window.FaroSafe.esc(source.label)}">Remover</button>
      </div>`).join('');
    list.innerHTML = `${window.FaroSafe.raw(rows)}<div id="faroEarningsTotalWrap" class="faro-earnings-total"><span>Total do dia</span><strong id="faroEarningsTotal">${window.FaroSafe.esc(app.money(snapshot.total))}</strong></div>`;
    return snapshot;
  };

  const setEarningsValues = values => {
    const normalized = earningsApi.normalize(values || {});
    for (const source of earningsSources) {
      const input = document.querySelector(`[data-faro-earning-source="${source.key}"]`);
      const value = normalized[source.key] || 0;
      if (input) input.value = value > 0 ? String(value) : '';
    }
    renderQuick();
    return normalized;
  };

  const syncEarningsTotal = ({ render=true, persist=true } = {}) => {
    const snapshot = earningsSnapshot();
    if (grossInput) grossInput.value = snapshot.valid && snapshot.total > 0 ? String(snapshot.total) : '';
    renderQuick();
    document.querySelectorAll('[data-faro-earning-source]').forEach(input => {
      input.setCustomValidity(snapshot.valid ? '' : 'Use somente valores iguais ou maiores que zero.');
    });
    if (render) app.renderRecordPreview();
    if (persist) saveDraft();
    return snapshot;
  };

  const resetKeypad = () => {
    digits = '';
    selectedSource = earningsSources[0].key;
    showFieldError(earningMessage(), '');
  };

  const setEarningsMode = (mode, { values=null, render=true, persist=false } = {}) => {
    earningsMode = mode === 'legacy' ? 'legacy' : 'detailed';
    const quick = $('faroEarningsQuick');
    const legacy = $('faroLegacyEarnings');
    const grossChips = document.querySelector('[data-chip-row="recordGross"]');
    const detailed = earningsMode === 'detailed';

    grossGrid?.classList.toggle('faro-register-gross-grid--detailed', detailed);
    if (grossInput) grossInput.readOnly = detailed;
    grossChips?.classList.toggle('hidden', detailed);
    quick?.classList.toggle('hidden', !detailed);
    legacy?.classList.toggle('hidden', detailed);
    digits = '';
    showFieldError(earningMessage(), '');

    if (detailed) {
      setEarningsValues(values || emptyEarnings());
      syncEarningsTotal({ render, persist });
    } else {
      if (render) app.renderRecordPreview();
      if (persist) saveDraft();
    }
  };

  // "Adicionar": soma o valor digitado no app escolhido. Devolve false (com o erro junto do teclado) se não há valor.
  const addTyped = ({ render=true } = {}) => {
    const value = typedValue();
    if (value <= 0) {
      showFieldError(earningMessage(), ADD_ERROR);
      return false;
    }
    const input = document.querySelector(`[data-faro-earning-source="${selectedSource}"]`);
    if (!input) return false;
    const current = Math.max(0, app.number(input.value));
    input.value = String(Math.round((current + value) * 100) / 100);
    digits = '';
    showFieldError(earningMessage(), '');
    syncEarningsTotal({ render, persist:true });
    return true;
  };

  const pressKey = key => {
    if (key === 'del') digits = digits.slice(0, -1);
    else if (/^\d+$/.test(key) && digits.length < MAX_DIGITS) digits = (digits + key).replace(/^0+/, '').slice(0, MAX_DIGITS);
    showFieldError(earningMessage(), '');
    renderQuick();
  };

  const readForm = () => {
    const base = {
      date: $('recordDate')?.value || app.todayKey(),
      gross: $('recordGross')?.value || '',
      km: $('recordKm')?.value || '',
      hours: $('recordHours')?.value || '',
      fuel: $('recordFuel')?.value || '',
      editing: loadedDate,
      kmSuggested: Boolean(kmSuggested && ($('recordKm')?.value || '') === kmSuggested),
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
      String(draft.gross || '').trim() || (!draft.kmSuggested && String(draft.km || '').trim()) || String(draft.hours || '').trim() || String(draft.fuel || '').trim() ||
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
    kmSuggested = draft.kmSuggested ? String(draft.km ?? '') : null;
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
  note.innerHTML = '<i class="fas fa-cloud-arrow-down" aria-hidden="true"></i><span></span>';
  const showNote = (text, icon = 'fa-cloud-arrow-down') => {
    note.querySelector('span').textContent = text;
    note.querySelector('i').className = `fas ${icon}`;
    note.classList.remove('hidden');
  };
  const firstCard = $('recordDate')?.closest('.card-vetta');
  if (firstCard) firstCard.insertBefore(note, firstCard.firstChild);
  // "Salvar dia" logo depois de ganhos e km (a prévia fica abaixo): menos rolagem para fechar o dia.
  if (firstCard && $('saveDayButton')) firstCard.insertAdjacentElement('afterend', $('saveDayButton'));

  // ---- Edição sem perda (F1) ----
  // loadedDate = data do registro salvo que o formulário está mostrando. Só esse dia pode ser sobrescrito.
  const recordFor = date => app.state.records.find(record => record.date === date) || null;
  const shortDate = date => { const [, month, day] = String(date).split('-'); return `${day}/${month}`; };
  const fieldText = value => (Number(value) > 0 ? String(value) : '');
  const formHasValues = () => hasMeaningfulDraft(readForm());
  const hasConflict = () => {
    const date = $('recordDate')?.value;
    return Boolean(date && recordFor(date) && loadedDate !== date);
  };

  const conflict = document.createElement('div');
  conflict.id = 'faroDateConflict';
  conflict.className = 'faro-date-conflict hidden';
  conflict.setAttribute('role', 'alert');
  conflict.innerHTML = `
    <strong>Esse dia já tem registro. Abrir e editar?</strong>
    <p data-faro-conflict-detail>Nada é salvo por cima do registro sem você confirmar.</p>
    <div class="faro-date-conflict-actions">
      <button type="button" data-faro-conflict="keep">Escolher outra data</button>
      <button type="button" data-faro-conflict="open">Abrir e editar</button>
    </div>`;
  ($('recordDate')?.parentElement || firstCard)?.appendChild(conflict);
  let lastDate = $('recordDate')?.value || app.todayKey();

  const hideConflict = () => conflict.classList.add('hidden');
  const showConflict = () => {
    const date = $('recordDate')?.value;
    conflict.querySelector('[data-faro-conflict-detail]').textContent =
      `O dia ${shortDate(date)} já está salvo. Abra para ver e editar os valores salvos; nada é salvo por cima sem você confirmar.`;
    conflict.classList.remove('hidden');
  };

  const fillFromRecord = record => {
    $('recordDate').value = record.date;
    $('recordKm').value = fieldText(record.km);
    kmSuggested = null;
    resetKeypad();
    $('recordHours').value = fieldText(record.hours);
    $('recordFuel').value = fieldText(record.fuelSpend);
    if (record.earningsBySource) {
      setEarningsMode('detailed', { values:record.earningsBySource, render:false, persist:false });
    } else {
      if (grossInput) grossInput.value = fieldText(record.gross);
      setEarningsMode('legacy', { render:false, persist:false });
    }
    loadedDate = record.date;
    lastDate = record.date;
    hideConflict();
    const optional = document.getElementById('faroOptionalDetails');
    if (optional) optional.open = Boolean(record.hours || record.fuelSpend);
    showNote(`Editando ${shortDate(record.date)}. Os valores salvos já estão nos campos.`, 'fa-pen');
    app.renderRecordPreview();
  };

  const evaluateDate = () => {
    const date = $('recordDate')?.value;
    if (!date) return;
    const record = recordFor(date);
    if (record && loadedDate !== date) {
      if (formHasValues()) showConflict();
      else fillFromRecord(record);
      return;
    }
    hideConflict();
    lastDate = date;
    if (!record && loadedDate) note.classList.add('hidden');
  };

  $('recordDate')?.addEventListener('change', evaluateDate);
  $('recordDate')?.addEventListener('input', evaluateDate);

  // ---- Data de hoje sem pedir (F3) ----
  // O campo de data só aparece quando o motorista pede "Trocar data". O resumo diz qual dia está sendo registrado.
  const dateInput = $('recordDate');
  const dateLabel = dateInput?.previousElementSibling?.tagName === 'LABEL' ? dateInput.previousElementSibling : null;
  const dateSummary = document.createElement('div');
  dateSummary.id = 'faroDateSummary';
  dateSummary.className = 'faro-date-summary';
  dateSummary.innerHTML = '<strong data-faro-date-text></strong><button id="faroDateChange" type="button">Trocar data</button>';
  dateInput?.parentElement?.insertBefore(dateSummary, dateLabel || dateInput);
  let datePickerOpen = false;
  const shiftDate = (date, days) => { const d = app.parseDate(date); d.setDate(d.getDate() + days); return app.dateKey(d); };
  const weekdayText = date => new Intl.DateTimeFormat('pt-BR', { weekday:'long', day:'numeric', month:'long' }).format(app.parseDate(date)).replace('-feira', '');
  const dayName = date => {
    const today = app.todayKey();
    if (date === today) return `Hoje, ${weekdayText(date)}`;
    if (date === shiftDate(today, -1)) return `Ontem, ${weekdayText(date)}`;
    const text = weekdayText(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  const renderDateSummary = () => {
    const date = dateInput?.value || app.todayKey();
    dateSummary.querySelector('[data-faro-date-text]').textContent = dayName(date);
    dateInput?.classList.toggle('hidden', !datePickerOpen);
    dateLabel?.classList.toggle('hidden', !datePickerOpen);
    $('faroDateChange').hidden = datePickerOpen;
  };
  $('faroDateChange')?.addEventListener('click', () => {
    datePickerOpen = true;
    renderDateSummary();
    dateInput?.focus({ preventScroll:true });
    try { dateInput?.showPicker?.(); } catch {}
  });

  // ---- Km já preenchido com o último dia (F3) ----
  // O núcleo exige km > 0. O app sugere o km do último dia registrado; nunca inventa um valor.
  const kmInput = $('recordKm');
  const kmTools = document.createElement('div');
  kmTools.className = 'faro-km-tools';
  kmTools.innerHTML = '<button id="faroKmSame" type="button" class="faro-km-same hidden">Igual a ontem</button><span id="faroKmHint" class="faro-km-hint"></span>';
  const kmMessage = document.createElement('div');
  kmMessage.id = 'faroKmMessage';
  kmMessage.className = 'faro-field-error hidden';
  kmMessage.setAttribute('role', 'alert');
  (kmInput?.closest('.input-wrapper') || kmInput)?.insertAdjacentElement('afterend', kmTools);
  kmTools.insertAdjacentElement('afterend', kmMessage);

  const lastKmRecord = date => {
    const candidates = app.state.records.filter(record => record.date !== date && Number(record.km) > 0);
    const before = candidates.filter(record => record.date < date);
    const pool = before.length ? before : candidates;
    return pool.reduce((latest, record) => (!latest || record.date > latest.date ? record : latest), null);
  };
  const renderKmTools = () => {
    const date = dateInput?.value || app.todayKey();
    const last = lastKmRecord(date);
    const button = $('faroKmSame');
    const hint = $('faroKmHint');
    button.classList.toggle('hidden', !last);
    if (!last) { hint.textContent = ''; return; }
    const yesterday = last.date === shiftDate(date, -1);
    button.textContent = yesterday ? 'Igual a ontem' : 'Igual ao último dia';
    button.dataset.km = String(last.km);
    button.setAttribute('aria-label', `${button.textContent}: ${last.km} km`);
    hint.textContent = kmSuggested && kmInput?.value === kmSuggested
      ? `Mesmo km ${yesterday ? 'de ontem' : `do dia ${shortDate(last.date)}`}. Ajuste se rodou diferente.`
      : '';
  };
  const suggestKm = () => {
    if (!kmInput || String(kmInput.value || '').trim()) return;
    const last = lastKmRecord(dateInput?.value || app.todayKey());
    if (!last) return;
    kmInput.value = String(last.km);
    kmSuggested = kmInput.value;
  };
  $('faroKmSame')?.addEventListener('click', event => {
    const km = event.currentTarget.dataset.km;
    if (!km || !kmInput) return;
    kmInput.value = km;
    kmSuggested = null;
    showFieldError(kmMessage, '');
    kmInput.dispatchEvent(new Event('input', { bubbles:true }));
  });
  kmInput?.addEventListener('input', () => {
    if (kmInput.value !== kmSuggested) kmSuggested = null;
    if (Number(kmInput.value) > 0) showFieldError(kmMessage, '');
    renderKmTools();
  });

  conflict.addEventListener('click', event => {
    const action = event.target.closest('[data-faro-conflict]')?.dataset.faroConflict;
    if (!action) return;
    event.preventDefault();
    if (action === 'open') {
      const record = recordFor($('recordDate')?.value);
      if (record) fillFromRecord(record);
      saveDraft();
      return;
    }
    $('recordDate').value = lastDate && lastDate !== $('recordDate').value ? lastDate : '';
    hideConflict();
    if ($('recordDate').value) evaluateDate();
    app.renderRecordPreview();
    $('recordDate').focus({ preventScroll:true });
  });

  // O núcleo rotula "Atualizar este dia"; quando o dia foi aberto, a ação é salvar alterações.
  const baseRenderRecordPreview = app.renderRecordPreview;
  app.renderRecordPreview = function(...args) {
    const result = baseRenderRecordPreview.apply(this, args);
    const button = $('saveDayButton');
    const date = $('recordDate')?.value;
    if (button && date && loadedDate === date && recordFor(date)) button.innerHTML = '<i class="fas fa-check mr-2"></i>Salvar alterações';
    else if (button && date && !recordFor(date)) button.innerHTML = '<i class="fas fa-check mr-2"></i>Salvar dia';
    renderDateSummary();
    renderKmTools();
    return result;
  };

  $('clearDayButton')?.addEventListener('click', () => {
    // O núcleo volta a data para hoje. Se o motorista limpou o próprio dia aberto, ele continua sendo esse dia.
    if (loadedDate !== $('recordDate')?.value) loadedDate = null;
    setEarningsMode('detailed', { render:false, persist:false });
    if (grossInput) grossInput.value = '';
    clearDraft();
    note.classList.add('hidden');
    hideConflict();
    showFieldError(kmMessage, '');
    resetKeypad();
    kmSuggested = null;
    datePickerOpen = false;
    if (!loadedDate) { evaluateDate(); suggestKm(); }
    app.renderRecordPreview();
  });

  earningsSection.addEventListener('click', event => {
    const detail = event.target.closest('#faroEnableEarningsBreakdown');
    if (detail) {
      event.preventDefault();
      setEarningsMode('detailed', { render:true, persist:true });
      return;
    }

    const chip = event.target.closest('[data-faro-source-chip]');
    if (chip) {
      event.preventDefault();
      selectedSource = chip.dataset.faroSourceChip;
      showFieldError(earningMessage(), '');
      renderQuick();
      return;
    }

    const key = event.target.closest('[data-faro-key]');
    if (key) {
      event.preventDefault();
      pressKey(key.dataset.faroKey);
      return;
    }

    if (event.target.closest('#faroEarningAdd')) {
      event.preventDefault();
      addTyped();
      return;
    }

    const remove = event.target.closest('[data-faro-earning-remove]');
    if (remove) {
      event.preventDefault();
      const input = document.querySelector(`[data-faro-earning-source="${remove.dataset.faroEarningRemove}"]`);
      if (input) input.value = '';
      syncEarningsTotal({ render:true, persist:true });
      $('faroEarningAdd')?.focus({ preventScroll:true });
    }
  });

  // Setas trocam o app escolhido (grupo de rádio acessível pelo teclado).
  $('faroEarningChips')?.addEventListener('keydown', event => {
    const step = { ArrowRight:1, ArrowDown:1, ArrowLeft:-1, ArrowUp:-1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const keys = earningsSources.map(source => source.key);
    selectedSource = keys[(keys.indexOf(selectedSource) + step + keys.length) % keys.length];
    renderQuick();
    document.querySelector(`[data-faro-source-chip="${selectedSource}"]`)?.focus({ preventScroll:true });
  });

  // Teclado físico (computador ou teclado Bluetooth): números, Backspace e Enter usam o mesmo teclado do Registro.
  document.addEventListener('keydown', event => {
    if (app.currentView !== 'day' || earningsMode !== 'detailed' || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    if (/^\d$/.test(event.key)) { event.preventDefault(); pressKey(event.key); }
    else if (event.key === 'Backspace') { event.preventDefault(); pressKey('del'); }
    else if (event.key === 'Enter' && digits && !event.target.closest?.('button')) { event.preventDefault(); addTyped(); }
  });

  // Os campos por app continuam aceitando valor programático (restauração, testes de regressão).
  earningsSection.addEventListener('input', event => {
    if (!event.target.matches('[data-faro-earning-source]')) return;
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

  // ---- Retorno único depois de salvar (F2) ----
  const saved = document.createElement('div');
  saved.id = 'faroDaySaved';
  saved.className = 'faro-day-saved hidden';
  saved.setAttribute('role', 'status');
  saved.setAttribute('aria-live', 'polite');
  saved.innerHTML = `
    <p data-faro-saved-text></p>
    <div class="faro-day-saved-actions">
      <button type="button" data-faro-saved="undo">Desfazer</button>
      <button type="button" data-faro-saved="edit">Editar dia</button>
      <button type="button" data-faro-saved="home">Ver Início</button>
    </div>`;
  document.body.appendChild(saved);
  let savedDate = null;
  let savedTimer = null;
  // F3 "Desfazer": cópia do registro anterior (ou null se o dia era novo) e do formulário, guardadas antes de salvar.
  let lastSave = null;
  let pendingRestore = null;
  const hideSaved = () => { saved.classList.add('hidden'); clearTimeout(savedTimer); lastSave = null; };
  const undoLastSave = undo => {
    if (!undo) return;
    // Mesmo caminho do núcleo para tirar um dia (Histórico > Excluir): filtra, salva e redesenha.
    const others = app.state.records.filter(record => record.date !== undo.date);
    app.state.records = undo.previous ? others.concat([undo.previous]).sort((a, b) => a.date.localeCompare(b.date)) : others;
    app.save();
    app.render();
    pendingRestore = { ...undo.form, editing: undo.previous ? undo.date : null, kmSuggested:false, updatedAt: new Date().toISOString() };
    app.navigateToPrimary('day');
  };
  const syncSavedActions = () => {
    saved.querySelector('[data-faro-saved="home"]').hidden = app.currentView === 'dashboard';
  };
  const showSaved = (record, updated) => {
    const context = app.monthContext(app.parseDate(record.date));
    const net = app.recordNumbers(record, context).net;
    const isToday = record.date === app.todayKey();
    const day = shortDate(record.date);
    const label = net >= 0
      ? (isToday ? 'Lucro de hoje' : `Lucro do dia ${day}`)
      : (isToday ? 'Prejuízo de hoje' : `Prejuízo do dia ${day}`);
    const text = saved.querySelector('[data-faro-saved-text]');
    text.textContent = `${updated ? 'Dia atualizado.' : 'Dia salvo.'} ${label}: `;
    const value = document.createElement('strong');
    value.textContent = app.money(Math.abs(net));
    text.appendChild(value);
    savedDate = record.date;
    syncSavedActions();
    saved.classList.remove('hidden');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(hideSaved, 8000);
  };
  saved.addEventListener('click', event => {
    const action = event.target.closest('[data-faro-saved]')?.dataset.faroSaved;
    if (!action) return;
    const undo = lastSave;
    hideSaved();
    if (action === 'undo') return undoLastSave(undo);
    if (action === 'home') return app.navigateToPrimary('dashboard');
    if (savedDate) {
      clearDraft();
      loadedDate = null;
      ['recordGross', 'recordKm', 'recordHours', 'recordFuel'].forEach(id => { if ($(id)) $(id).value = ''; });
      $('recordDate').value = savedDate;
    }
    app.navigateToPrimary('day');
  });

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
      hideSaved();
      note.classList.add('hidden');
      hideConflict();
      showFieldError(kmMessage, '');
      datePickerOpen = false;
      resetKeypad();
      if (pendingRestore) {
        // Depois de "Desfazer": o que o motorista tinha digitado volta para o formulário.
        const restore = pendingRestore;
        pendingRestore = null;
        applyDraft(restore);
        loadedDate = restore.editing && recordFor(restore.editing) ? restore.editing : null;
        lastDate = restore.date;
        saveDraft();
        showNote('Salvamento desfeito. Seus valores continuam aqui.', 'fa-rotate-left');
        app.renderRecordPreview();
      } else if (editingExisting) {
        // Histórico > Editar: o núcleo preenche só parte dos campos; carregamos o registro inteiro.
        fillFromRecord(recordFor(editingDate));
      } else {
        const draft = loadDraft();
        const draftRecord = draft ? recordFor(draft.date) : null;
        const staleDraft = draftRecord && draft.editing === draft.date && String(draftRecord.updatedAt || '') > String(draft.updatedAt || '');
        if (hasMeaningfulDraft(draft) && !staleDraft) {
          applyDraft(draft);
          loadedDate = draftRecord && draft.editing === draft.date ? draft.date : null;
          lastDate = draft.date;
          showNote('Rascunho recuperado. Continue de onde parou.');
          if (hasConflict()) showConflict();
          app.renderRecordPreview();
        } else {
          if (staleDraft) clearDraft();
          const record = recordFor($('recordDate')?.value || app.todayKey());
          if (record) fillFromRecord(record);
          else {
            loadedDate = null;
            lastDate = $('recordDate')?.value || app.todayKey();
            setEarningsMode('detailed', { render:false, persist:false });
            suggestKm();
            app.renderRecordPreview();
          }
        }
      }
    } else if (!saved.classList.contains('hidden')) {
      syncSavedActions();
    }
    return result;
  };

  let saving = false;
  const baseSaveDay = app.saveDay;
  app.saveDay = function(...args) {
    if (saving) return;

    if (hasConflict()) {
      showConflict();
      conflict.querySelector('[data-faro-conflict="open"]')?.focus({ preventScroll:true });
      return;
    }

    if (earningsMode === 'detailed') {
      // Valor digitado e não adicionado entra no app escolhido: nada do que foi digitado se perde.
      if (digits && typedValue() > 0) addTyped({ render:false });
      const snapshot = earningsSnapshot();
      const problem = !snapshot.valid ? NEGATIVE_ERROR : (!earningsApi.hasAny(snapshot.normalized) ? SAVE_ERROR : '');
      if (problem) {
        // Erro junto do campo, dizendo o que fazer (nada de aviso rápido que some).
        showFieldError(earningMessage(), problem);
        earningMessage()?.scrollIntoView?.({ block:'center' });
        return;
      }
      syncEarningsTotal({ render:false, persist:false });
    }

    const before = this.recordDraft();
    if (before.date && before.gross > 0 && before.km <= 0) {
      showFieldError(kmMessage, KM_ERROR);
      kmInput?.focus({ preventScroll:true });
      kmMessage.scrollIntoView?.({ block:'center' });
      return;
    }
    if (!before.date || before.gross <= 0 || before.km <= 0) return baseSaveDay.apply(this, args);
    const existedBefore = Boolean(recordFor(before.date));
    const previous = existedBefore ? JSON.parse(JSON.stringify(recordFor(before.date))) : null;
    const formBefore = readForm();
    saving = true;
    const button = $('saveDayButton');
    if (button) {
      button.dataset.saving = 'true';
      button.setAttribute('aria-busy', 'true');
    }
    // O núcleo avisa "Dia salvo..." num toast; aqui o retorno é um só, então o toast dele é segurado.
    const ownToast = Object.prototype.hasOwnProperty.call(this, 'toast');
    const previousToast = this.toast;
    let heldToast = null;
    this.toast = message => { heldToast = message; };
    try {
      const result = baseSaveDay.apply(this, args);
      const savedRecord = this.state.records.find(record => record.date === before.date && Number(record.gross) === before.gross && Number(record.km) === before.km);
      if (savedRecord) {
        clearDraft();
        loadedDate = null;
        hideConflict();
        setEarningsMode('detailed', { render:false, persist:false });
        if (grossInput) grossInput.value = '';
        heldToast = null;
        showSaved(savedRecord, existedBefore);
        lastSave = { date: before.date, previous, form: formBefore };
      }
      return result;
    } finally {
      if (ownToast) this.toast = previousToast; else delete this.toast;
      if (heldToast) this.toast(heldToast);
      setTimeout(() => {
        saving = false;
        if (button) {
          delete button.dataset.saving;
          button.removeAttribute('aria-busy');
        }
      }, 350);
    }
  };

  window.FaroRegister = {
    loadDraft,
    clearDraft,
    saveDraft,
    readEarningsInputs,
    syncEarningsTotal,
    setEarningsMode,
    hasConflict,
    editingDate:() => loadedDate,
    mode:() => earningsMode
  };
})();

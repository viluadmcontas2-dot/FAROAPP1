(() => {
  const app = window.__vettaApp;
  if (!app || document.getElementById('faroNavigationFoundation')) return;

  const marker = document.createElement('span');
  marker.id = 'faroNavigationFoundation';
  marker.hidden = true;
  document.body.appendChild(marker);

  const navLabels = {
    dashboard: 'Início',
    day: 'Registrar',
    history: 'Histórico',
    settings: 'Planejar',
    more: 'Central'
  };

  document.querySelectorAll('.nav-item[data-view]').forEach(button => {
    const label = navLabels[button.dataset.view];
    if (!label) return;
    const span = button.querySelector('span');
    if (span) span.textContent = label;
    button.setAttribute('aria-label', label);
  });

  const settings = document.getElementById('view-settings');
  const more = document.getElementById('view-more');
  const historyView = document.getElementById('view-history');

  if (settings) {
    const heading = settings.querySelector('h2');
    const description = settings.querySelector('h2 + p');
    if (heading) heading.textContent = 'Planejar';
    if (description) description.textContent = 'Meta, agenda, energia e custos que moldam sua rota.';
  }

  if (more) {
    const heading = more.querySelector('h2');
    const description = more.querySelector('h2 + p');
    if (heading) heading.textContent = 'Central FARO';
    if (description) description.textContent = 'Seus dados, aplicativo e ferramentas ocasionais.';
  }

  // Histórico: fatos primeiro, análise depois.
  const historyList = document.getElementById('historyList');
  const historyListSection = historyList?.parentElement;
  const historyChart = document.getElementById('historyChart')?.closest('.card-vetta');
  if (historyView && historyListSection && historyChart && historyListSection.parentElement === historyView) {
    historyView.insertBefore(historyListSection, historyChart);
  }

  // Planejar vira o destino principal quando o usuário decide editar custos.
  document.getElementById('faroManageCosts')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    app.navigateToPrimary('settings');
  }, true);

  // Radar continua preservado no estado legado, mas não integra a superfície comercial da v1.
  const eventCard = document.getElementById('eventList')?.closest('.card-vetta');
  if (eventCard) {
    eventCard.classList.add('hidden');
    eventCard.setAttribute('aria-hidden', 'true');
    eventCard.dataset.faroDeferred = 'radar';
  }

  const resetButton = document.getElementById('resetButton');
  if (more && resetButton && !document.getElementById('faroSafetyZone')) {
    const safety = document.createElement('section');
    safety.id = 'faroSafetyZone';
    safety.className = 'card-vetta p-6 border border-red-100';
    safety.innerHTML = `
      <span class="label-micro !text-red-600">Zona de segurança</span>
      <h3 class="font-extrabold">Restaurar parâmetros</h3>
      <p class="text-xs text-slate-500 mt-2">Use só quando quiser recomeçar as configurações. Seus registros e dados preservados pelo FARO continuam seguindo as regras atuais do aplicativo.</p>`;
    resetButton.className = 'w-full mt-4 py-4 rounded-2xl bg-red-50 text-red-700 text-sm font-extrabold';
    safety.appendChild(resetButton);
    more.appendChild(safety);
  }

  if (more && !document.getElementById('faroCentralIntro')) {
    const intro = document.createElement('div');
    intro.id = 'faroCentralIntro';
    intro.className = 'card-vetta p-5 bg-gradient-to-br from-blue-50 to-white';
    intro.innerHTML = `
      <span class="label-micro !text-blue-700">Central FARO</span>
      <strong class="block text-lg">O que você usa de vez em quando fica aqui</strong>
      <p class="text-xs text-slate-500 mt-2">Backup, relatório, comparadores e informações do aplicativo sem poluir sua rotina diária.</p>`;
    const firstContent = [...more.children].find(node => node !== more.firstElementChild);
    if (firstContent) more.insertBefore(intro, firstContent);
    else more.appendChild(intro);
  }

  const detail = document.createElement('div');
  detail.id = 'faroHistoryDetail';
  detail.className = 'modal-backdrop hidden';
  detail.innerHTML = `
    <div class="modal-sheet">
      <div class="flex justify-between items-start gap-3">
        <div>
          <span class="label-micro !text-blue-600">Dia registrado</span>
          <h3 id="faroHistoryDetailTitle" class="text-xl font-extrabold">Detalhe do dia</h3>
        </div>
        <button id="faroHistoryDetailClose" type="button" class="w-12 h-12 rounded-2xl bg-slate-100" aria-label="Fechar detalhe"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-5">
        <div class="bg-slate-50 rounded-2xl p-4"><span class="label-micro">Faturamento</span><strong id="faroHistoryDetailGross" class="text-lg"></strong></div>
        <div class="bg-emerald-50 rounded-2xl p-4"><span class="label-micro !text-emerald-700">Líquido estimado</span><strong id="faroHistoryDetailNet" class="text-lg text-emerald-700"></strong></div>
        <div class="bg-blue-50 rounded-2xl p-4"><span class="label-micro !text-blue-700">Quilômetros</span><strong id="faroHistoryDetailKm" class="text-lg"></strong></div>
        <div class="bg-amber-50 rounded-2xl p-4"><span class="label-micro !text-amber-700">Receita/km</span><strong id="faroHistoryDetailRevenueKm" class="text-lg"></strong></div>
      </div>
      <p id="faroHistoryDetailContext" class="text-xs text-slate-500 mt-4"></p>
      <button id="faroHistoryDetailEdit" type="button" class="w-full mt-5 py-4 rounded-2xl bg-blue-600 text-white font-extrabold">EDITAR ESTE DIA</button>
    </div>`;
  document.body.appendChild(detail);

  let selectedDate = null;
  const closeDetail = () => detail.classList.add('hidden');
  document.getElementById('faroHistoryDetailClose').addEventListener('click', closeDetail);
  detail.addEventListener('click', event => { if (event.target === detail) closeDetail(); });

  const openDetail = date => {
    const record = (app.state.records || []).find(item => item.date === date);
    if (!record) return;
    selectedDate = date;
    const numbers = app.recordNumbers(record, app.monthContext(app.parseDate(date)));
    document.getElementById('faroHistoryDetailTitle').textContent = app.parseDate(date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    document.getElementById('faroHistoryDetailGross').textContent = app.money(numbers.gross);
    document.getElementById('faroHistoryDetailNet').textContent = app.money(numbers.net);
    document.getElementById('faroHistoryDetailKm').textContent = `${app.integer(numbers.km)} km`;
    document.getElementById('faroHistoryDetailRevenueKm').textContent = `${app.money(numbers.revenuePerKm)}/km`;
    document.getElementById('faroHistoryDetailContext').textContent = 'Custos e combustível deste registro permanecem ligados aos parâmetros salvos no próprio dia.';
    detail.classList.remove('hidden');
  };

  const decorateHistoryRows = () => {
    historyList?.querySelectorAll('.history-row').forEach(row => {
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      const edit = row.querySelector('[data-action="edit"][data-date]');
      if (edit?.dataset.date) row.setAttribute('aria-label', `Abrir detalhe do dia ${edit.dataset.date}`);
    });
  };

  historyList?.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    const row = event.target.closest('.history-row');
    if (!row) return;
    const edit = row.querySelector('[data-action="edit"][data-date]');
    if (edit?.dataset.date) openDetail(edit.dataset.date);
  });

  historyList?.addEventListener('keydown', event => {
    if (event.target.closest('button') || (event.key !== 'Enter' && event.key !== ' ')) return;
    const row = event.target.closest('.history-row');
    if (!row) return;
    const edit = row.querySelector('[data-action="edit"][data-date]');
    if (!edit?.dataset.date) return;
    event.preventDefault();
    openDetail(edit.dataset.date);
  });

  document.getElementById('faroHistoryDetailEdit').addEventListener('click', () => {
    const record = (app.state.records || []).find(item => item.date === selectedDate);
    if (!record) return closeDetail();
    closeDetail();
    app.$('recordDate').value = record.date;
    app.$('recordGross').value = record.gross;
    app.$('recordKm').value = record.km;
    app.$('recordHours').value = record.hours || '';
    app.$('recordFuel').value = record.fuelSpend || '';
    app.openSecondary('day');
    app.renderRecordPreview();
  });

  // O botão EDITAR legado passa a respeitar o contexto de origem do Histórico.
  historyList?.addEventListener('click', event => {
    const button = event.target.closest('[data-action="edit"][data-date]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const record = (app.state.records || []).find(item => item.date === button.dataset.date);
    if (!record) return;
    app.$('recordDate').value = record.date;
    app.$('recordGross').value = record.gross;
    app.$('recordKm').value = record.km;
    app.$('recordHours').value = record.hours || '';
    app.$('recordFuel').value = record.fuelSpend || '';
    app.openSecondary('day');
    app.renderRecordPreview();
  }, true);

  const baseRenderHistory = app.renderHistory;
  app.renderHistory = function(...args) {
    const result = baseRenderHistory.apply(this, args);
    decorateHistoryRows();
    return result;
  };
  decorateHistoryRows();

  const baseSaveDay = app.saveDay;
  app.saveDay = function(...args) {
    const returnToHistory = this.currentPrimaryView === 'history';
    const result = baseSaveDay.apply(this, args);
    if (returnToHistory) {
      history.replaceState({ vettaNavigation: true, view: 'history', primaryView: 'history' }, '', window.location.href);
      this.showView('history', 'history');
    }
    return result;
  };

  window.FaroNavigation = { openHistoryDetail: openDetail };
})();

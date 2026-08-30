(() => {
  const BRAND = 'FARO';
  const TAGLINE = 'APP DO MOTORISTA!';
  const brandText = value => String(value ?? '')
    .replaceAll('VETTA', BRAND)
    .replaceAll('TESTE NETLIFY OF', BRAND)
    .replaceAll('CalculaAê', BRAND);

  const rewriteNode = node => {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const next = brandText(node.data);
      if (next !== node.data) node.data = next;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const attr of ['title', 'aria-label', 'placeholder', 'alt']) {
        if (!node.hasAttribute(attr)) continue;
        const current = node.getAttribute(attr);
        const next = brandText(current);
        if (next !== current) node.setAttribute(attr, next);
      }
    }
    node.childNodes?.forEach(rewriteNode);
  };

  const replaceExactText = (root, from, to) => {
    root?.querySelectorAll?.('*').forEach(element => {
      if (element.children.length === 0 && element.textContent.trim() === from) element.textContent = to;
    });
  };

  document.title = `${BRAND} | ${TAGLINE}`;
  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) appleTitle.setAttribute('content', BRAND);
  rewriteNode(document.documentElement);

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') rewriteNode(record.target);
      else if (record.type === 'attributes') rewriteNode(record.target);
      else record.addedNodes.forEach(rewriteNode);
    }
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['title', 'aria-label', 'placeholder', 'alt']
  });

  const app = window.__vettaApp;
  if (!app) return;

  const baseToast = app.toast;
  app.toast = function(message) {
    return baseToast.call(this, brandText(message));
  };

  const basePrintReport = app.printReport;
  app.printReport = function(...args) {
    const nativePrint = window.print;
    window.print = () => {
      rewriteNode(document.getElementById('reportSheet'));
      nativePrint.call(window);
    };
    try {
      return basePrintReport.apply(this, args);
    } finally {
      window.print = nativePrint;
    }
  };

  app.shareSummary = async function() {
    const c = this.calculations();
    const week = this.weekContext(c);
    const text = `FARO — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}\nMeta líquida: ${this.money(this.state.targetProfit, 0)}\nLíquido realizado: ${this.money(c.actualNet, 0)}\nFaturamento: ${this.money(c.actualGross, 0)}\nRodagem: ${this.integer(c.actualKm)} km\nSemana: ${this.money(week.actual, 0)} de ${this.money(week.target, 0)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Resumo FARO', text });
      else {
        await navigator.clipboard.writeText(text);
        this.toast('Resumo copiado para compartilhar.');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') this.toast('Não foi possível compartilhar agora.');
    }
  };

  app.exportData = function() {
    const payload = {
      app: 'FARO',
      version: this.state?.version || 4,
      release: this.state?.release || '3.5.1',
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
    this.toast('Backup exportado.');
  };

  const setupDailyJourney = () => {
    const dashboard = document.getElementById('view-dashboard');
    const dayView = document.getElementById('view-day');
    if (!dashboard || !dayView || document.getElementById('faroDailyResult')) return;

    if (!document.getElementById('faroDailyStyles')) {
      const style = document.createElement('style');
      style.id = 'faroDailyStyles';
      style.textContent = `
        #faroOptionalDetails{border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc;padding:14px 16px}
        #faroOptionalDetails summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;color:#334155;font-size:12px;font-weight:800}
        #faroOptionalDetails summary::-webkit-details-marker{display:none}
        #faroOptionalDetails summary::after{content:'+';width:26px;height:26px;border-radius:999px;display:grid;place-items:center;background:#fff;color:#2563eb;font-size:18px;box-shadow:0 1px 3px rgba(15,23,42,.08)}
        #faroOptionalDetails[open] summary::after{content:'−'}
        #faroOptionalDetails .faro-optional-grid{margin-top:14px}
        #faroDailyResult .faro-result-hero{border-radius:22px;padding:20px;background:linear-gradient(145deg,#0b1121,#172554);color:white}
        #faroDailyResult .faro-result-value{font-size:34px;font-weight:900;letter-spacing:-.04em}
        #faroDailyResult .faro-result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
        #faroDailyResult .faro-result-metric{border-radius:16px;background:#f8fafc;padding:13px}
        #faroDailyResult .faro-result-label{display:block;color:#64748b;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
      `;
      document.head.appendChild(style);
    }

    replaceExactText(dashboard, 'Meta de faturamento por dia', 'Meta de hoje');
    replaceExactText(dashboard, 'Líquido planejado', 'Líquido que precisa sobrar');
    replaceExactText(dashboard, 'Rodagem estimada', 'Km estimados');
    replaceExactText(dashboard, 'Fechamento rápido', 'Fim do dia');
    replaceExactText(dashboard, 'Ver planejamento do mês', 'Ver / ajustar meta');
    replaceExactText(dayView, 'Como foi seu dia?', 'Feche seu dia em poucos segundos');
    replaceExactText(dayView, 'Informe só faturamento e quilômetros.', 'Só faturamento e quilômetros são obrigatórios.');

    const hours = document.getElementById('recordHours');
    const fuel = document.getElementById('recordFuel');
    const optionalGrid = hours?.parentElement?.parentElement;
    if (optionalGrid && optionalGrid === fuel?.parentElement?.parentElement && !document.getElementById('faroOptionalDetails')) {
      const details = document.createElement('details');
      details.id = 'faroOptionalDetails';
      const summary = document.createElement('summary');
      const label = document.createElement('span');
      label.textContent = 'Adicionar detalhes opcionais';
      const hint = document.createElement('span');
      hint.textContent = 'horas + combustível';
      hint.className = 'text-[10px] text-slate-400 font-bold';
      summary.append(label, hint);
      optionalGrid.parentNode.insertBefore(details, optionalGrid);
      optionalGrid.classList.add('faro-optional-grid');
      details.append(summary, optionalGrid);
    }

    const modal = document.createElement('div');
    modal.id = 'faroDailyResult';
    modal.className = 'modal-backdrop hidden';
    modal.innerHTML = `
      <div class="modal-sheet">
        <div class="flex justify-between items-start gap-3">
          <div><span class="label-micro !text-emerald-700">Fechamento concluído</span><h3 id="faroResultTitle" class="text-2xl font-extrabold">Dia registrado</h3></div>
          <button id="faroResultClose" class="w-9 h-9 rounded-full bg-slate-100" aria-label="Fechar resultado"><i class="fas fa-xmark"></i></button>
        </div>
        <div class="faro-result-hero mt-5">
          <span class="text-[10px] text-slate-300 font-extrabold uppercase tracking-widest">Líquido estimado do dia</span>
          <strong id="faroResultNet" class="faro-result-value block mt-1">R$ 0</strong>
          <p id="faroResultMessage" class="text-xs text-slate-300 mt-2 leading-relaxed"></p>
        </div>
        <div class="faro-result-grid">
          <div class="faro-result-metric"><span class="faro-result-label">Custo do dia</span><strong id="faroResultCost">R$ 0</strong></div>
          <div class="faro-result-metric"><span class="faro-result-label">Receita/km</span><strong id="faroResultRevenueKm">R$ 0</strong></div>
        </div>
        <div id="faroResultDelta" class="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs text-blue-700"></div>
        <div class="grid grid-cols-2 gap-3 mt-5">
          <button id="faroResultHistory" class="py-4 rounded-2xl bg-slate-100 text-slate-700 text-xs font-extrabold">VER HISTÓRICO</button>
          <button id="faroResultDone" class="py-4 rounded-2xl bg-blue-600 text-white text-xs font-extrabold">CONCLUIR</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const closeResult = () => modal.classList.add('hidden');
    document.getElementById('faroResultClose').addEventListener('click', closeResult);
    document.getElementById('faroResultDone').addEventListener('click', closeResult);
    document.getElementById('faroResultHistory').addEventListener('click', () => {
      closeResult();
      app.navigateToPrimary('history');
    });

    const baseShowView = app.showView;
    app.showView = function(view, primaryView = view) {
      const result = baseShowView.call(this, view, primaryView);
      if (view === 'day') {
        const details = document.getElementById('faroOptionalDetails');
        if (details) details.open = Boolean(this.$('recordHours').value || this.$('recordFuel').value);
      }
      return result;
    };

    const baseSaveDay = app.saveDay;
    app.saveDay = function() {
      const draft = this.recordDraft();
      if (!draft.date || draft.gross <= 0 || draft.km <= 0) return baseSaveDay.call(this);

      const existedBefore = this.state.records.some(record => record.date === draft.date);
      const before = this.calculations();
      const expectedContribution = before.dailyContribution;
      const result = baseSaveDay.call(this);
      const saved = this.state.records.find(record => record.date === draft.date);
      if (!saved) return result;

      const context = this.monthContext(this.parseDate(saved.date));
      const numbers = this.recordNumbers(saved, context);
      const after = this.calculations();
      const totalCost = numbers.fuel + numbers.variable + numbers.percentCost + numbers.fixedShare;
      const dailyDelta = numbers.contribution - expectedContribution;
      const currentMonth = saved.date.startsWith(this.monthKey());
      const remaining = Math.max(0, this.state.targetProfit - after.actualNet);

      this.$('faroResultTitle').textContent = existedBefore ? 'Dia atualizado' : 'Dia registrado';
      this.$('faroResultNet').textContent = this.money(numbers.net);
      this.$('faroResultCost').textContent = this.money(totalCost);
      this.$('faroResultRevenueKm').textContent = this.money(numbers.revenuePerKm);
      this.$('faroResultMessage').textContent = currentMonth
        ? remaining > 0
          ? `Depois deste fechamento, faltam ${this.money(remaining, 0)} líquidos para concluir a meta do mês.`
          : `Meta mensal concluída. Você já acumulou ${this.money(after.actualNet, 0)} líquidos.`
        : 'O registro foi salvo no histórico do mês correspondente.';
      this.$('faroResultDelta').textContent = dailyDelta >= 0
        ? `Resultado do dia: ${this.money(dailyDelta, 0)} acima da contribuição esperada.`
        : `Resultado do dia: ${this.money(Math.abs(dailyDelta), 0)} abaixo da contribuição esperada; o FARO redistribuiu o restante pelos próximos dias.`;
      modal.classList.remove('hidden');
      rewriteNode(modal);
      return result;
    };
  };

  setupDailyJourney();
  rewriteNode(document.documentElement);
})();

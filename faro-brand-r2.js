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
    if (!dashboard || !dayView || dayView.dataset.faroDailyJourney) return;
    dayView.dataset.faroDailyJourney = 'true';

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
      hint.className = 'text-xs text-slate-400 font-bold';
      summary.append(label, hint);
      optionalGrid.parentNode.insertBefore(details, optionalGrid);
      optionalGrid.classList.add('faro-optional-grid');
      details.append(summary, optionalGrid);
    }

    // O retorno depois de salvar o dia é do Registro (faro-register.js): um aviso único com o lucro do dia.
    const baseShowView = app.showView;
    app.showView = function(view, primaryView = view) {
      const result = baseShowView.call(this, view, primaryView);
      if (view === 'day') {
        const details = document.getElementById('faroOptionalDetails');
        if (details) details.open = Boolean(this.$('recordHours').value || this.$('recordFuel').value);
      }
      return result;
    };
  };

  setupDailyJourney();
  rewriteNode(document.documentElement);
})();

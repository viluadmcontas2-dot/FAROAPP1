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

  rewriteNode(document.documentElement);
})();

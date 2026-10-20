(() => {
  const BRAND = 'FARO';
  const TAGLINE = 'APP DO MOTORISTA!';

  // FaroCopy: mapa ÚNICO de vocabulário (docs/decisoes/vocabulario.md). app.js e legacy-shell.html são imutáveis,
  // então o texto deles é trocado em runtime, depois do load, por este mapa. Só texto/atributos visíveis; IDs,
  // data-attributes e ganchos nunca mudam. Toda regra é idempotente (a saída não casa com a própria entrada).
  const monthName = () => new Date().toLocaleDateString('pt-BR', { month: 'long' });
  // [seletor do elemento que contém o texto | null, texto exato, novo texto]
  const EXACT = [
    ['#costList', 'EDITAR', 'Editar conta'], ['#costList', 'EXCLUIR', 'Excluir conta'],
    ['#historyList', 'EDITAR', 'Editar dia'], ['#historyList', 'EXCLUIR', 'Excluir dia'],
    ['#eventList', 'EDITAR', 'Editar alerta'], ['#eventList', 'EXCLUIR', 'Excluir alerta'],
    [null, 'EDITAR', 'Editar'], [null, 'EXCLUIR', 'Excluir'],
    [null, 'EDITAR ESTE DIA', 'Editar este dia'],
    [null, 'CONCLUIR', 'Concluir cadastro'], [null, 'IR PARA O FARO', 'Abrir o FARO'], [null, 'AGORA NÃO', 'Pular reserva'],
    [null, 'META', 'Ver meta'], [null, 'DESFAZER', 'Desfazer pagamento'], [null, 'MARCAR PAGO', 'Marcar como paga'],
    [null, 'Editar custo', 'Editar conta a pagar'], [null, 'Adicionar custo', 'Adicionar conta a pagar'],
    [null, 'Salvar custo', 'Salvar conta a pagar'], [null, 'Novo custo', 'Nova conta a pagar'],
    [null, 'GERENCIAR CUSTOS E VENCIMENTOS', 'Gerenciar contas a pagar'],
    [null, 'Custo para rodar', 'Custo por km'], [null, 'Custo variável/km', 'Custo por km'], [null, 'Operação', 'Custo por km'],
    [null, 'Operação atualizada.', 'Custo por km atualizado.'],
    [null, 'Conta ou obrigação', 'Conta a pagar'], [null, 'Conta/obrigação', 'Conta a pagar'], [null, 'Obrigação', 'Conta a pagar'],
    [null, 'Obrigações/mês', 'Contas a pagar/mês'], [null, 'Obrigações e reservas', 'Contas a pagar e reservas'],
    [null, 'Obrigações mensais iniciais', 'Contas a pagar por mês'],
    [null, 'Reserva ou objetivo', 'Reserva'], [null, 'Reserva/objetivo', 'Reserva'],
    [null, '+ ADICIONAR CONTA', '+ Adicionar conta a pagar'], [null, '+ CRIAR RESERVA', '+ Criar reserva'],
    [null, '+ CRIAR UMA RESERVA', '+ Criar reserva'], [null, '+ Criar uma reserva', '+ Criar reserva'],
    [null, '+ REGISTRAR APORTE', 'Guardar aporte'], [null, '+ Aportar', 'Guardar aporte'], [null, '+ APORTAR', 'Guardar aporte'],
    [null, 'SALVAR APORTE', 'Guardar aporte'], [null, 'Registrar aporte', 'Guardar aporte'], [null, 'Proteger este valor', 'Guardar este valor'],
    [null, 'DEFINIR META', 'Definir meta da reserva'], [null, 'Definir objetivo', 'Definir meta da reserva'],
    [null, 'SALVAR OBJETIVO', 'Salvar meta da reserva'], [null, 'Salvar objetivo', 'Salvar meta da reserva'],
    [null, 'Editar objetivo', 'Editar meta da reserva'], [null, 'REMOVER', 'Remover aporte'], [null, 'ÚLTIMOS APORTES', 'Últimos aportes'],
    [null, 'CONTAS', 'Contas a pagar'], [null, 'RESERVAS', 'Reservas'], [null, 'CANCELAR', 'Cancelar'],
    [null, 'APLICAR MUDANÇA', 'Aplicar mudança'], [null, 'APLICAR', 'Aplicar no meu plano'], [null, 'VER PLANO →', 'Ver plano'],
    [null, 'SALVAR FECHAMENTO', 'Salvar fechamento do mês'], [null, 'Fechamento mensal', 'Fechamento do mês'],
    [null, 'Fechar e salvar o dia', 'Salvar dia'], [null, 'Fechamento diário', 'Registrar dia'], [null, 'Prévia do fechamento', 'Prévia do dia'],
    [null, 'Fechamento rápido', 'Registrar dia'], [null, 'Fim do dia', 'Registrar dia'],
    [null, 'Feche seu dia em poucos segundos', 'Registre seu dia em poucos segundos'],
    [null, 'SALVAR MEU FARO', 'Salvar meu FARO'], [null, 'SAIR DESTA CONTA', 'Sair da conta'], [null, 'ENTRAR', 'Entrar na conta'],
    [null, 'CRIAR MINHA CONTA', 'Criar minha conta'], [null, 'ESQUECI MINHA SENHA', 'Recuperar senha'], [null, 'CRIAR CONTA', 'Criar conta'],
    [null, 'JÁ TENHO CONTA', 'Entrar com minha conta'], [null, 'SALVAR NOVA SENHA', 'Salvar nova senha'],
    [null, 'USAR DADOS DESTE APARELHO', 'Usar dados deste aparelho'], [null, 'USAR DADOS SALVOS NA CONTA', 'Usar dados da conta'],
    [null, 'DECIDIR DEPOIS', 'Decidir depois'], [null, 'GERENCIAR ASSINATURA', 'Gerenciar assinatura'], [null, 'EM BREVE', 'Em breve'],
    [null, 'VER TOUR', 'Ver tour'], [null, 'PULAR', 'Pular tour'], [null, 'VOLTAR', 'Voltar'], [null, 'PRÓXIMO', 'Ver próximo passo'],
    [null, 'IR PARA O INÍCIO', 'Ir para o início'], [null, 'VER PASSO A PASSO', 'Ver passo a passo'],
    [null, 'TENTAR INSTALAR DE NOVO', 'Tentar instalar de novo'], [null, 'Tentar instalar', 'Tentar instalar de novo'],
    [null, 'INSTALAR FARO', 'Instalar o FARO'], [null, 'INSTALAR', 'Instalar o FARO'], [null, 'Instalar', 'Instalar o FARO'],
    [null, 'DEPOIS', 'Atualizar depois'], [null, 'ATUALIZAR', 'Atualizar agora'], [null, 'USAR NAS METAS', 'Usar nas metas']
  ];
  // A barra de 8 s (faro-interactions) já diz "Desfazer" ao lado do aviso que nomeia o que mudou; o botão solto "DESFAZER" da conta paga vira "Desfazer pagamento".
  const exactMap = new Map();
  for (const [ctx, from, to] of EXACT) { if (!exactMap.has(from)) exactMap.set(from, []); exactMap.get(from).push([ctx, to]); }
  const exactCopy = (value, el) => {
    const trimmed = value.trim();
    const hits = exactMap.get(trimmed);
    if (!hits) return value;
    const hit = hits.find(([ctx]) => ctx && el?.closest?.(ctx)) || hits.find(([ctx]) => !ctx);
    return hit ? value.replace(trimmed, hit[1]) : value;
  };
  // Frases dentro de textos maiores (ordem importa: específicas primeiro).
  const PHRASES = [
    [/(\d+) REGISTROS?\b/g, (_, n) => `${n} ${Number(n) === 1 ? 'dia' : 'dias'}`],
    [/\b([Mm])eta do mês\b/g, (_, c) => `${c}eta de ${monthName()}`],
    [/\b(Sua |Minha )?([Mm])eta (mensal )?líquida\b/g, (_, a, c) => `${a || ''}${c}eta de ${monthName()}`],
    [/\b([Oo])bjetivo (mensal )?líquido( mensal)?\b/g, (_, c) => `${c === 'O' ? 'Meta' : 'meta'} de ${monthName()}`],
    [/Meta de faturamento por dia/g, 'Meta de hoje'],
    [/Saldo líquido restante/g, 'Lucro restante'],
    [/Melhor dia líquido/g, 'Melhor dia de lucro'],
    [/(\d[\d.,]*) líquidos\b/g, '$1 de lucro'],
    [/\blíquido acumulado\b/g, 'lucro acumulado'],
    [/\bLíquido\b/g, 'Lucro'], [/\blíquido\b/g, 'lucro'], [/\blíquidos\b/g, 'de lucro'],
    [/Custos e combustível deste registro/g, 'Gastos e combustível deste dia'],
    [/Marcar pago não remove o custo/g, 'Marcar como paga não remove a conta'],
    [/(seus dias), custos, pagamentos/g, '$1, contas a pagar, pagamentos'],
    [/(Meta, agenda, energia) e custos/g, '$1 e contas a pagar'],
    [/Este registro é antigo/g, 'Este dia é antigo'], [/Esse dia já tem registro/g, 'Esse dia já foi registrado'],
    [/Registro excluído/g, 'Dia excluído'], [/Nenhum registro\b/g, 'Nenhum dia registrado'],
    [/com seus registros/g, 'com seus dias'], [/dois registros/g, 'dois dias registrados'],
    [/Não há registros para fechar/g, 'Não há dias registrados para fechar'], [/deste registro/g, 'deste dia'],
    [/\bprotegidos\b/g, 'guardados'], [/\bprotegido\b/g, 'guardado'], [/\bProtegidos\b/g, 'Guardados'],
    [/\b1 objetivo\b/g, '1 meta'], [/(\d+) objetivos\b/g, '$1 metas'],
    [/Defina um objetivo se quiser/g, 'Defina uma meta da reserva se quiser']
  ];
  const copyText = (value, el) => {
    if (el?.closest?.('.cost-row strong, [data-faro-user-text]')) return value;
    let next = exactCopy(String(value ?? ''), el);
    for (const [re, to] of PHRASES) next = next.replace(re, to);
    return next;
  };
  const brandText = (value, el) => copyText(String(value ?? '')
    .replaceAll('VETTA', BRAND)
    .replaceAll('TESTE NETLIFY OF', BRAND)
    .replaceAll('CalculaAê', BRAND), el);
  window.FaroCopy = Object.freeze({ text: copyText, exact: EXACT.map(([, from, to]) => [from, to]) });

  const rewriteNode = node => {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement?.closest('script,style,textarea,input')) return;
      const next = brandText(node.data, node.parentElement);
      if (next !== node.data) node.data = next;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const attr of ['title', 'aria-label', 'placeholder', 'alt']) {
        if (!node.hasAttribute(attr)) continue;
        const current = node.getAttribute(attr);
        const next = brandText(current, node);
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
        #faroOptionalDetails summary::after{content:'+';width:26px;height:26px;border-radius:999px;display:grid;place-items:center;background:var(--faro-amber-soft);color:var(--faro-amber-text);font-size:18px;box-shadow:0 1px 3px rgba(var(--faro-black-rgb),.08)}
        #faroOptionalDetails[open] summary::after{content:'−'}
        #faroOptionalDetails .faro-optional-grid{margin-top:14px}
      `;
      document.head.appendChild(style);
    }

    replaceExactText(dashboard, 'Meta de faturamento por dia', 'Meta de hoje');
    replaceExactText(dashboard, 'Líquido planejado', 'Lucro que precisa sobrar');
    replaceExactText(dashboard, 'Rodagem estimada', 'Km estimados');
    replaceExactText(dashboard, 'Fechamento rápido', 'Registrar dia');
    replaceExactText(dashboard, 'Ver planejamento do mês', 'Ajustar meta');
    replaceExactText(dayView, 'Como foi seu dia?', 'Registre seu dia em poucos segundos');
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

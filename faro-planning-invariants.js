(() => {
  const app = window.__vettaApp;
  const planning = document.getElementById('view-planning');
  if (!app || !planning || window.FaroPlanningInvariants) return;

  const setText = (node, value) => {
    if (!node) return;
    const next = String(value ?? '');
    if (node.textContent !== next) node.textContent = next;
  };

  // O primeiro plano não pode fingir que começou no dia 1 quando o motorista
  // configurou o FARO no meio do mês. Mantemos o monthContext canônico e só
  // recortamos sua janela temporal no mês em que o onboarding realmente nasceu.
  const baseMonthContext = app.monthContext;
  app.monthContext = function(reference = new Date()) {
    const base = baseMonthContext.call(this, reference);
    const configuredAt = this.state.onboardingProfile?.configuredAt;
    if (!configuredAt) return base;

    const startedAt = new Date(configuredAt);
    if (!Number.isFinite(startedAt.getTime())) return base;
    if (startedAt.getFullYear() !== base.year || startedAt.getMonth() !== base.month) return base;

    const startKey = this.dateKey(startedAt);
    const selectedDates = base.selectedDates.filter(date => date >= startKey);
    const monthRecords = base.monthRecords.filter(record => record.date >= startKey);
    const recordDates = new Set(monthRecords.map(record => record.date));
    const today = this.todayKey();
    const elapsedSelected = selectedDates.filter(key => key < today).length;
    const recordedElapsed = monthRecords.filter(record => record.date < today && selectedDates.includes(record.date)).length;
    const extraUsed = this.clamp(elapsedSelected - recordedElapsed, 0, this.state.extraDaysOff);
    const extraRemaining = Math.max(0, this.state.extraDaysOff - extraUsed);
    const selectedRemaining = selectedDates.filter(key => key >= today && !recordDates.has(key)).length;
    const remainingDays = Math.max(0, selectedRemaining - extraRemaining);

    return {
      ...base,
      selectedDates,
      monthRecords,
      recordDates,
      plannedDays: Math.max(1, selectedDates.length - this.state.extraDaysOff),
      remainingDays,
      extraUsed,
      extraRemaining,
      planStartKey: startKey
    };
  };

  // app.js continua sendo o único motor financeiro. Esta camada só agrega
  // os valores diários canônicos para responder à pergunta operacional da semana.
  const baseWeekContext = app.weekContext;
  app.weekContext = function(calculation = null) {
    const c = calculation || this.calculations();
    const base = baseWeekContext.call(this, c);
    const today = this.todayKey();
    const recordDates = new Set(base.records.map(record => record.date));
    const remainingDays = base.dates.filter(date => date >= today && !recordDates.has(date)).length;
    const actualGross = base.records.reduce((sum, record) => sum + record.gross, 0);
    const actualNet = base.records.reduce((sum, record) => sum + record.net, 0);
    const targetGross = actualGross + c.dailyGross * remainingDays;
    const targetNet = actualNet + c.dailyNet * remainingDays;
    const remainingGross = Math.max(0, targetGross - actualGross);

    return {
      ...base,
      target: targetGross,
      actual: actualGross,
      targetGross,
      actualGross,
      targetNet,
      actualNet,
      remainingGross,
      remainingDays
    };
  };

  // app.js é o motor canônico e ainda escreve neste ID em todo render().
  // A nova composição não exibe o badge no primeiro nível, mas preserva o nó
  // para que reorganização visual nunca quebre o contrato de render do motor.
  if (!document.getElementById('extraDaysOffBadge')) {
    const compatibility = document.createElement('span');
    compatibility.id = 'extraDaysOffBadge';
    compatibility.hidden = true;
    compatibility.setAttribute('aria-hidden', 'true');
    planning.appendChild(compatibility);
  }

  // O campo exato precisa permitir apagar e digitar antes de normalizar.
  // Ele não vira um segundo owner: ao confirmar, delega ao mesmo slider/draft
  // controlado por faro-planning.js.
  const exact = document.getElementById('faroTargetExact');
  const slider = document.getElementById('faroTargetSlider');
  if (exact && slider && exact.dataset.faroTypingGuard !== 'true') {
    const freeInput = exact.cloneNode(true);
    freeInput.dataset.faroTypingGuard = 'true';
    exact.replaceWith(freeInput);

    const commitExact = () => {
      const raw = String(freeInput.value || '').trim();
      if (!raw) {
        freeInput.value = String(slider.value || app.state.targetProfit || 500);
        return;
      }
      const normalized = Math.max(500, Math.min(50000, Math.round(app.number(raw) / 100) * 100));
      slider.value = String(Math.min(20000, normalized));
      if (normalized > 20000) {
        // O slider visual termina em 20 mil; para valores maiores, atualizamos seu teto
        // só durante esta edição para continuar usando o mesmo owner de draft.
        slider.max = String(normalized);
        slider.value = String(normalized);
      }
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    };

    freeInput.addEventListener('change', commitExact);
    freeInput.addEventListener('blur', commitExact);
    freeInput.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      commitExact();
      freeInput.blur();
    });
  }

  const variableCostKm = c => c.fuelKm + c.costs.perKm + app.state.revenueKm * c.costs.percent;

  const decoratePlanningDetail = () => {
    const c = app.calculations();
    const daily = document.getElementById('faroDetailDaily');
    const days = document.getElementById('faroDetailDays');
    const energy = document.getElementById('faroDetailEnergy');
    setText(daily?.previousElementSibling, 'Bruto necessário/dia');
    setText(days?.previousElementSibling, 'Dias restantes no plano');
    setText(days, `${c.remainingDays} dias`);
    setText(energy?.previousElementSibling, 'Custo variável/km');
    setText(energy, `${app.money(variableCostKm(c))}/km`);
  };

  const decorateOnboardingPlan = () => {
    const week = document.getElementById('faroPlanWeek');
    const days = document.getElementById('faroPlanDays');
    const energy = document.getElementById('faroPlanEnergyKm');
    setText(week?.previousElementSibling, 'Bruto necessário/semana');
    setText(days?.previousElementSibling, 'Dias restantes no plano');
    setText(energy?.previousElementSibling, 'Custo variável/km');

    const syncVisibleMath = () => {
      const c = app.calculations();
      setText(days, `${c.remainingDays} dias`);
      setText(energy, `${app.money(variableCostKm(c))}/km`);
    };
    syncVisibleMath();

    for (const node of [days, energy]) {
      if (!node || node.dataset.faroMathObserver === 'true') continue;
      node.dataset.faroMathObserver = 'true';
      new MutationObserver(syncVisibleMath).observe(node, { childList:true, subtree:true, characterData:true });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decorateOnboardingPlan, { once:true });
  else decorateOnboardingPlan();

  // faro-planning.js já é o owner de render do detalhe. Esta camada roda depois
  // dele apenas para traduzir as mesmas saídas canônicas em uma conta visível e auditável.
  const baseRender = app.render;
  app.render = function(...args) {
    const result = baseRender.apply(this, args);
    if (this.currentView === 'planning-detail') decoratePlanningDetail();
    return result;
  };
  const baseShowView = app.showView;
  app.showView = function(view, primaryView = view) {
    const result = baseShowView.call(this, view, primaryView);
    if (view === 'planning-detail') decoratePlanningDetail();
    return result;
  };

  // Recalcula a UI uma vez com a janela temporal correta; não grava estado.
  app.render();

  window.FaroPlanningInvariants = Object.freeze({
    hasExtraDaysRenderTarget: () => Boolean(document.getElementById('extraDaysOffBadge')),
    exactValueDelegatesToDraftOwner: () => Boolean(document.getElementById('faroTargetExact')?.dataset.faroTypingGuard),
    weeklyGrossUsesCanonicalDaily: true,
    firstMonthStartsAtConfiguredAt: true,
    visibleVariableCostUsesCanonicalComponents: true
  });
})();

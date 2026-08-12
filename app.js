const APP_RELEASE = '3.5.1';
const STORAGE_KEY = 'vetta-driver-intelligence-v3';
const LEGACY_KEYS = [];

const fuelPresets = {
  gnv: { label: 'GNV', unit: 'm³', price: 4.79, efficiency: 13.2 },
  gasoline: { label: 'Gasolina', unit: 'L', price: 6.19, efficiency: 10.5 },
  ethanol: { label: 'Etanol', unit: 'L', price: 4.29, efficiency: 7.4 },
  diesel: { label: 'Diesel', unit: 'L', price: 6.09, efficiency: 11.5 },
  custom: { label: 'Personalizado', unit: 'un.', price: 5, efficiency: 10 }
};

const defaults = {
  version: 3,
  onboardingComplete: false,
  targetProfit: 4000,
  workWeekdays: [1, 2, 3, 4, 5, 6],
  extraDaysOff: 0,
  revenueKm: 2.25,
  fuel: { type: 'gnv', ...fuelPresets.gnv },
  compare: { gasPrice: 6.19, gasEff: 10.5, gnvPrice: 4.79, gnvEff: 13.2, period: 1 },
  costs: [
    { id: 'maintenance-default', name: 'Reserva de manutenção', kind: 'per_km', category: 'reserve', value: 0.18, active: true },
    { id: 'fixed-default', name: 'Custos fixos iniciais', kind: 'monthly', category: 'obligation', value: 650, active: true }
  ],
  records: [],
  events: []
};

const app = {
  state: null,
  revenueChart: null,
  compareChart: null,
  historyChart: null,
  deferredPrompt: null,
  toastTimer: null,
  onboardingStep: 1,
  onboardingDays: 6,
  currentView: 'dashboard',
  currentPrimaryView: 'dashboard',

  init() {
    this.load();
    this.bind();
    this.prepareRecordForm();
    this.syncInputs();
    this.render();
    this.initializeNavigation();
    this.setupPwa();
    this.prepareOnboarding();
  },

  $(id) { return document.getElementById(id); },
  cloneDefaults() { return JSON.parse(JSON.stringify(defaults)); },
  uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; },
  number(value) { const parsed = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(parsed) ? parsed : 0; },
  clamp(value, min, max) { return Math.min(max, Math.max(min, value)); },
  money(value, digits = 2) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number.isFinite(value) ? value : 0); },
  integer(value) { return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0); },
  escape(value) { const div = document.createElement('div'); div.textContent = String(value ?? ''); return div.innerHTML; },
  dateKey(date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; },
  todayKey() { return this.dateKey(new Date()); },
  monthKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; },
  parseDate(key) { const [year, month, day] = key.split('-').map(Number); return new Date(year, month - 1, day, 12); },
  weekdaysForCount(count) { return count <= 5 ? [1, 2, 3, 4, 5] : count === 6 ? [1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6]; },
  currentDaysPerWeek() { return this.state.workWeekdays.length; },

  load() {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (current) { this.state = this.normalizeState(current); return; }
      for (const key of LEGACY_KEYS) {
        const legacy = JSON.parse(localStorage.getItem(key) || 'null');
        if (!legacy) continue;
        this.state = this.migrateLegacy(legacy);
        this.save();
        return;
      }
    } catch (error) {
      console.warn('Falha ao carregar dados locais', error);
    }
    this.state = this.cloneDefaults();
  },

  normalizeState(value) {
    const base = this.cloneDefaults();
    const normalized = { ...base, ...value };
    normalized.fuel = { ...base.fuel, ...(value.fuel || {}) };
    normalized.compare = { ...base.compare, ...(value.compare || {}) };
    normalized.costs = Array.isArray(value.costs) ? value.costs : base.costs;
    normalized.records = Array.isArray(value.records) ? value.records : [];
    normalized.events = Array.isArray(value.events) ? value.events : [];
    normalized.workWeekdays = Array.isArray(value.workWeekdays) && value.workWeekdays.length ? value.workWeekdays : base.workWeekdays;
    normalized.version = 3;
    return normalized;
  },

  migrateLegacy(legacy) {
    const base = this.cloneDefaults();
    const days = Number(legacy.daysPerWeek || legacy.days || legacy.workWeekdays?.length || 6);
    const active = legacy.activeFuel === 'gas' ? 'gasoline' : 'gnv';
    const preset = fuelPresets[active];
    const fuel = active === 'gasoline'
      ? { type: active, label: preset.label, unit: preset.unit, price: Number(legacy.gasPrice || preset.price), efficiency: Number(legacy.gasEff || preset.efficiency) }
      : { type: active, label: preset.label, unit: preset.unit, price: Number(legacy.gnvPrice || preset.price), efficiency: Number(legacy.gnvEff || preset.efficiency) };
    const fixedMonthly = Number(legacy.fixedMonthly || legacy.fixed || 650);
    const maintKm = Number(legacy.maintKm || 0.18);
    return this.normalizeState({
      ...base,
      onboardingComplete: true,
      targetProfit: Number(legacy.targetProfit || legacy.target || 4000),
      workWeekdays: Array.isArray(legacy.workWeekdays) ? legacy.workWeekdays : this.weekdaysForCount(days),
      extraDaysOff: Number(legacy.extraDaysOff || 0),
      revenueKm: Number(legacy.revenueKm || 2.25),
      fuel,
      compare: {
        gasPrice: Number(legacy.gasPrice || 6.19), gasEff: Number(legacy.gasEff || 10.5),
        gnvPrice: Number(legacy.gnvPrice || 4.79), gnvEff: Number(legacy.gnvEff || 13.2),
        period: Number(legacy.period || 1)
      },
      costs: [
        { id: 'maintenance-migrated', name: 'Reserva de manutenção', kind: 'per_km', category: 'reserve', value: maintKm, active: true },
        { id: 'fixed-migrated', name: 'Outros custos mensais', kind: 'monthly', category: 'obligation', value: fixedMonthly, active: true }
      ],
      records: Array.isArray(legacy.records) ? legacy.records : [],
      events: []
    });
  },

  save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); },

  bind() {
    document.querySelectorAll('[data-model]').forEach(input => {
      const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventName, event => {
        const key = event.currentTarget.dataset.model;
        this.state[key] = event.currentTarget.tagName === 'SELECT' ? event.currentTarget.value : this.number(event.currentTarget.value);
        this.save(); this.syncInputs(key, event.currentTarget); this.render();
      });
    });
    document.querySelectorAll('[data-days]').forEach(button => button.addEventListener('click', () => {
      this.state.workWeekdays = this.weekdaysForCount(Number(button.dataset.days)); this.save(); this.render();
    }));
    document.querySelectorAll('[data-weekday]').forEach(button => button.addEventListener('click', () => {
      const day = Number(button.dataset.weekday); const selected = new Set(this.state.workWeekdays);
      if (selected.has(day)) { if (selected.size === 1) return this.toast('Escolha pelo menos um dia de trabalho.'); selected.delete(day); } else selected.add(day);
      this.state.workWeekdays = [...selected].sort((a, b) => a - b); this.save(); this.render();
    }));
    document.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => {
      this.state.compare.period = Number(button.dataset.period); this.save(); this.renderCompare(this.calculations());
    }));
    document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => this.navigateToPrimary(button.dataset.view)));
    document.querySelectorAll('[data-secondary-view]').forEach(button => button.addEventListener('click', () => this.openSecondary(button.dataset.secondaryView)));
    document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => this.navigateBack()));
    window.addEventListener('popstate', event => this.restoreNavigation(event.state));

    ['recordGross', 'recordKm', 'recordHours', 'recordFuel', 'recordDate'].forEach(id => this.$(id).addEventListener('input', () => this.renderRecordPreview()));
    this.$('saveDayButton').addEventListener('click', () => this.saveDay());
    this.$('clearDayButton').addEventListener('click', () => this.prepareRecordForm(true));
    this.$('historyList').addEventListener('click', event => this.handleHistoryAction(event));

    this.$('fuelType').addEventListener('change', event => this.changeFuelType(event.target.value));
    ['fuelLabel', 'fuelPrice', 'fuelEfficiency'].forEach(id => this.$(id).addEventListener('input', () => this.updateFuelFromForm()));
    ['compareGasPrice', 'compareGasEff', 'compareGnvPrice', 'compareGnvEff'].forEach(id => this.$(id).addEventListener('input', () => this.updateCompareFromForm()));
    this.$('applyGasButton').addEventListener('click', () => this.applyCompareFuel('gasoline'));
    this.$('applyGnvButton').addEventListener('click', () => this.applyCompareFuel('gnv'));
    this.$('compareDetails').addEventListener('toggle', () => { if (this.$('compareDetails').open) setTimeout(() => this.renderCompare(this.calculations()), 20); });

    this.$('addCostButton').addEventListener('click', () => this.openCostModal());
    this.$('closeCostModal').addEventListener('click', () => this.closeModal('costModal'));
    this.$('costKind').addEventListener('change', () => this.syncCostModal());
    this.$('saveCostButton').addEventListener('click', event => { event.preventDefault(); this.saveCost(); });
    this.$('costList').addEventListener('click', event => this.handleCostAction(event));
    this.$('learningActions').addEventListener('click', event => this.handleLearningAction(event));

    this.$('addEventButton').addEventListener('click', () => this.openEventModal());
    this.$('closeEventModal').addEventListener('click', () => this.closeModal('eventModal'));
    this.$('saveEventButton').addEventListener('click', () => this.saveEvent());
    this.$('eventList').addEventListener('click', event => this.handleEventAction(event));

    this.$('resetButton').addEventListener('click', () => this.reset());
    this.$('exportButton').addEventListener('click', () => this.exportData());
    this.$('importInput').addEventListener('change', event => this.importData(event));
    this.$('reportButton').addEventListener('click', () => this.printReport());

    this.$('installButton').addEventListener('click', () => this.install());
    this.$('installCardButton').addEventListener('click', () => this.install());
    this.$('retryInstallButton').addEventListener('click', () => this.install());
    this.$('copyInstallLink').addEventListener('click', () => this.copyInstallUrl());
    this.$('closeInstallModal').addEventListener('click', () => this.closeModal('installModal'));

    document.querySelectorAll('[data-onboarding-days]').forEach(button => button.addEventListener('click', () => {
      this.onboardingDays = Number(button.dataset.onboardingDays);
      document.querySelectorAll('[data-onboarding-days]').forEach(item => item.classList.toggle('active', item === button));
    }));
    this.$('onboardingFuelType').addEventListener('change', event => this.fillOnboardingFuel(event.target.value));
    this.$('onboardingNext').addEventListener('click', () => this.nextOnboarding());
    this.$('onboardingBack').addEventListener('click', () => this.previousOnboarding());
  },

  syncInputs(changedKey = null, source = null) {
    document.querySelectorAll('[data-model]').forEach(input => {
      const key = input.dataset.model;
      if (source === input || (changedKey && key !== changedKey)) return;
      input.value = this.state[key];
    });
    const fuel = this.state.fuel;
    this.$('fuelType').value = fuel.type;
    this.$('fuelLabel').value = fuel.label;
    this.$('fuelPrice').value = fuel.price;
    this.$('fuelEfficiency').value = fuel.efficiency;
    this.$('compareGasPrice').value = this.state.compare.gasPrice;
    this.$('compareGasEff').value = this.state.compare.gasEff;
    this.$('compareGnvPrice').value = this.state.compare.gnvPrice;
    this.$('compareGnvEff').value = this.state.compare.gnvEff;
    this.syncFuelLabels();
  },

  syncFuelLabels() {
    const custom = this.state.fuel.type === 'custom';
    this.$('customFuelNameWrap').classList.toggle('hidden', !custom);
    this.$('fuelUnitLabel').textContent = this.state.fuel.unit;
    this.$('fuelEfficiencyUnit').textContent = this.state.fuel.unit;
  },

  changeFuelType(type) {
    const preset = fuelPresets[type] || fuelPresets.custom;
    this.state.fuel = { type, ...preset };
    this.save(); this.syncInputs(); this.render();
  },

  updateFuelFromForm() {
    const preset = fuelPresets[this.$('fuelType').value] || fuelPresets.custom;
    this.state.fuel = {
      type: this.$('fuelType').value,
      label: this.$('fuelType').value === 'custom' ? (this.$('fuelLabel').value.trim() || 'Personalizado') : preset.label,
      unit: preset.unit,
      price: this.number(this.$('fuelPrice').value),
      efficiency: this.number(this.$('fuelEfficiency').value)
    };
    this.save(); this.syncFuelLabels(); this.render();
  },

  updateCompareFromForm() {
    this.state.compare = {
      ...this.state.compare,
      gasPrice: this.number(this.$('compareGasPrice').value), gasEff: this.number(this.$('compareGasEff').value),
      gnvPrice: this.number(this.$('compareGnvPrice').value), gnvEff: this.number(this.$('compareGnvEff').value)
    };
    this.save(); this.renderCompare(this.calculations());
  },

  applyCompareFuel(type) {
    if (type === 'gasoline') this.state.fuel = { type, ...fuelPresets.gasoline, price: this.state.compare.gasPrice, efficiency: this.state.compare.gasEff };
    else this.state.fuel = { type, ...fuelPresets.gnv, price: this.state.compare.gnvPrice, efficiency: this.state.compare.gnvEff };
    this.save(); this.syncInputs(); this.render(); this.toast(`${this.state.fuel.label} agora é o combustível das metas.`);
  },

  initializeNavigation() {
    const state = history.state;
    if (state?.vettaNavigation) this.restoreNavigation(state);
    else history.replaceState({ vettaNavigation: true, view: 'dashboard', primaryView: 'dashboard' }, '', window.location.href);
  },

  navigateToPrimary(view) {
    if (view === this.currentView && view === this.currentPrimaryView) return;
    history.pushState({ vettaNavigation: true, view, primaryView: view }, '', window.location.href);
    this.showView(view, view);
  },

  openSecondary(view) {
    const primaryView = this.currentPrimaryView;
    history.pushState({ vettaNavigation: true, view, primaryView }, '', window.location.href);
    this.showView(view, primaryView);
  },

  navigateBack() {
    if (this.currentView !== this.currentPrimaryView) history.back();
  },

  restoreNavigation(state) {
    const view = state?.vettaNavigation ? state.view : 'dashboard';
    const primaryView = state?.vettaNavigation ? state.primaryView : 'dashboard';
    this.showView(view, primaryView);
  },

  showView(view, primaryView = view) {
    document.querySelectorAll('.view-section').forEach(section => section.classList.add('hidden'));
    const target = this.$(`view-${view}`); if (!target) return;
    target.classList.remove('hidden');
    this.currentView = view;
    this.currentPrimaryView = primaryView;
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === primaryView));
    if (view === 'day') this.prepareRecordForm(false);
    if (view === 'history') this.renderHistory();
    if (view === 'settings') { this.renderCosts(); this.renderLearning(); }
    if (view === 'more') { this.renderEvents(); this.renderCompare(this.calculations()); }
    if (view === 'planning') this.renderPlanning();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderPlanning() {
    const context = this.monthContext();
    this.$('planningTarget').textContent = this.money(this.state.targetProfit, 0);
    this.$('planningDays').textContent = `${context.plannedDays} dias`;
    this.$('planningDaysOff').textContent = this.integer(this.state.extraDaysOff);
  },

  monthContext(reference = new Date()) {
    const year = reference.getFullYear(), month = reference.getMonth();
    const first = new Date(year, month, 1, 12), last = new Date(year, month + 1, 0, 12);
    const selectedDates = [];
    for (let cursor = new Date(first); cursor <= last; cursor.setDate(cursor.getDate() + 1)) if (this.state.workWeekdays.includes(cursor.getDay())) selectedDates.push(this.dateKey(cursor));
     const monthRecords = this.state.records.filter(record => record.date.startsWith(this.monthKey(reference))).sort((a, b) => a.date.localeCompare(b.date));
    const recordDates = new Set(monthRecords.map(record => record.date));
    const today = this.todayKey();
    const elapsedSelected = selectedDates.filter(key => key < today).length;
    const recordedElapsed = monthRecords.filter(record => record.date < today && selectedDates.includes(record.date)).length;
    const extraUsed = this.clamp(elapsedSelected - recordedElapsed, 0, this.state.extraDaysOff);
    const extraRemaining = Math.max(0, this.state.extraDaysOff - extraUsed);
    const selectedRemaining = selectedDates.filter(key => key >= today && !recordDates.has(key)).length;
    const remainingDays = Math.max(0, selectedRemaining - extraRemaining);
    return { year, month, first, last, selectedDates, monthRecords, recordDates, plannedDays: Math.max(1, selectedDates.length - this.state.extraDaysOff), remainingDays, extraUsed, extraRemaining };
  },

  weekContext(calculation = null) {
    const now = new Date();
    const monday = new Date(now); monday.setHours(12, 0, 0, 0); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const dates = [];
    for (let cursor = new Date(monday); cursor <= sunday; cursor.setDate(cursor.getDate() + 1)) if (this.state.workWeekdays.includes(cursor.getDay()) && cursor.getMonth() === now.getMonth()) dates.push(this.dateKey(cursor));
    const c = calculation || this.calculations();
    const records = c.records.filter(record => record.date >= this.dateKey(monday) && record.date <= this.dateKey(sunday));
    const target = (this.state.targetProfit / Math.max(1, c.ctx.plannedDays)) * dates.length;
    const actual = records.reduce((sum, record) => sum + record.net, 0);
    const km = records.reduce((sum, record) => sum + record.km, 0);
    const gross = records.reduce((sum, record) => sum + record.gross, 0);
    return { monday, sunday, dates, records, target, actual, revenueKm: km > 0 ? gross / km : 0 };
  },

  fuelCostKm() { return this.state.fuel.efficiency > 0 ? this.state.fuel.price / this.state.fuel.efficiency : 0; },

  monthlyEquivalent(cost, reference = new Date()) {
    if (!cost.active) return 0;
    if (cost.kind === 'monthly') return this.number(cost.value);
    if (cost.kind === 'weekly') return this.number(cost.value) * 52 / 12;
    if (cost.kind === 'one_time') return (!cost.month || cost.month === this.monthKey(reference)) ? this.number(cost.value) : 0;
    return 0;
  },

  costContext(reference = new Date()) {
    const active = this.state.costs.filter(cost => cost.active);
    let obligations = 0, reserves = 0, perKm = 0, percent = 0;
    active.forEach(cost => {
      if (cost.kind === 'per_km') perKm += this.number(cost.value);
      else if (cost.kind === 'percent') percent += this.number(cost.value) / 100;
      else if (cost.category === 'reserve') reserves += this.monthlyEquivalent(cost, reference);
      else obligations += this.monthlyEquivalent(cost, reference);
    });
    return { active, obligations, reserves, monthlyFixed: obligations + reserves, perKm, percent: this.clamp(percent, 0, 0.95) };
  },

  recordNumbers(record, context = this.monthContext(this.parseDate(record.date))) {
    const gross = this.number(record.gross), km = this.number(record.km);
    const fuelRate = this.number(record.fuelCostKmSnapshot) || this.fuelCostKm();
    const fuel = this.number(record.fuelSpend) > 0 ? this.number(record.fuelSpend) : km * fuelRate;
    const perKmRate = record.perKmCostSnapshot != null ? this.number(record.perKmCostSnapshot) : (record.maintKmSnapshot != null ? this.number(record.maintKmSnapshot) : this.costContext(this.parseDate(record.date)).perKm);
    const percentRate = record.percentCostSnapshot != null ? this.number(record.percentCostSnapshot) : 0;
    const variable = km * perKmRate;
    const percentCost = gross * percentRate;
    const currentFixed = this.costContext(this.parseDate(record.date)).monthlyFixed;
    const fixedShare = this.number(record.fixedShareSnapshot) > 0 ? this.number(record.fixedShareSnapshot) : currentFixed / Math.max(1, context.plannedDays);
    const contribution = gross - fuel - variable - percentCost;
    return { ...record, gross, km, fuel, variable, percentCost, contribution, fixedShare, net: contribution - fixedShare, revenuePerKm: km > 0 ? gross / km : 0, costPerKm: km > 0 ? (fuel + variable + percentCost) / km : 0 };
  },

  calculations() {
    const state = this.state, ctx = this.monthContext(), costs = this.costContext(), fuelKm = this.fuelCostKm();
    const contributionKm = Math.max(0.01, state.revenueKm * (1 - costs.percent) - fuelKm - costs.perKm);
    const records = ctx.monthRecords.map(record => this.recordNumbers(record, ctx));
    const actualGross = records.reduce((sum, record) => sum + record.gross, 0);
    const actualKm = records.reduce((sum, record) => sum + record.km, 0);
    const actualFuel = records.reduce((sum, record) => sum + record.fuel, 0);
    const actualVariable = records.reduce((sum, record) => sum + record.variable, 0);
    const actualPercent = records.reduce((sum, record) => sum + record.percentCost, 0);
    const actualContribution = actualGross - actualFuel - actualVariable - actualPercent;
    const fixedAllocated = costs.monthlyFixed * Math.min(1, records.length / Math.max(1, ctx.plannedDays));
    const actualNet = actualContribution - fixedAllocated;
    const requiredContribution = state.targetProfit + costs.monthlyFixed;
    const remainingContribution = Math.max(0, requiredContribution - actualContribution);
    const remainingDays = Math.max(0, ctx.remainingDays);
    const dailyContribution = remainingDays > 0 ? remainingContribution / remainingDays : remainingContribution;
    const dailyKm = dailyContribution / contributionKm;
    const dailyGross = dailyKm * state.revenueKm;
    const dailyNet = remainingDays > 0 ? Math.max(0, (state.targetProfit - actualNet) / remainingDays) : Math.max(0, state.targetProfit - actualNet);
    const totalRequiredKm = requiredContribution / contributionKm;
    const totalGross = totalRequiredKm * state.revenueKm;
    const totalFuel = totalRequiredKm * fuelKm;
    const totalVariable = totalRequiredKm * costs.perKm;
    const totalPercent = totalGross * costs.percent;
    const averageContribution = records.length ? actualContribution / records.length : dailyContribution;
    const projectedNet = records.length ? averageContribution * ctx.plannedDays - costs.monthlyFixed : state.targetProfit;
    const consumedDays = Math.max(0, ctx.plannedDays - remainingDays);
    const expectedNetToDate = state.targetProfit * (consumedDays / Math.max(1, ctx.plannedDays));
    const paceDelta = actualNet - expectedNetToDate;
    const progress = state.targetProfit > 0 ? this.clamp(actualNet / state.targetProfit * 100, 0, 100) : 0;
    const avgRevenueKm = actualKm > 0 ? actualGross / actualKm : 0;
    const avgNetKm = actualKm > 0 ? actualContribution / actualKm : 0;
    const surplusContribution = Math.max(0, actualContribution - requiredContribution * (consumedDays / Math.max(1, ctx.plannedDays)));
    const earnedDays = dailyContribution > 0 ? Math.floor(surplusContribution / dailyContribution) : 0;
    return { ctx, costs, records, fuelKm, contributionKm, actualGross, actualKm, actualFuel, actualVariable, actualPercent, actualContribution, fixedAllocated, actualNet, remainingContribution, remainingDays, dailyContribution, dailyGross, dailyKm, dailyNet, totalRequiredKm, totalGross, totalFuel, totalVariable, totalPercent, projectedNet, expectedNetToDate, paceDelta, progress, avgRevenueKm, avgNetKm, earnedDays };
  },

  render() {
    const c = this.calculations();
    this.$('targetProfitDisplay').textContent = this.money(this.state.targetProfit, 0);
    this.$('extraDaysOffBadge').textContent = this.state.extraDaysOff;
    this.$('kpiGrossDaily').textContent = this.integer(c.dailyGross);
    this.$('kpiNetDaily').textContent = this.money(c.dailyNet);
    this.$('kpiKmDaily').textContent = `${this.integer(c.dailyKm)} km`;
    this.$('navFuelPrice').textContent = `${this.state.fuel.label}: ${this.money(c.fuelKm)}/km`;
    this.$('fuelCostBadge').textContent = `${this.money(c.fuelKm)}/km`;
    this.$('dreGross').textContent = this.money(c.totalGross);
    this.$('dreKm').textContent = `${this.integer(c.totalRequiredKm)} km`;
    this.$('dreFuel').textContent = `- ${this.money(c.totalFuel)}`;
    this.$('dreVariable').textContent = `- ${this.money(c.totalVariable)}`;
    this.$('drePercent').textContent = `- ${this.money(c.totalPercent)}`;
    this.$('dreFixed').textContent = `- ${this.money(c.costs.monthlyFixed)}`;
    this.$('dreNet').textContent = this.money(this.state.targetProfit);
    this.$('actualNet').textContent = this.money(Math.max(0, c.actualNet), 0);
    this.$('projectedNet').textContent = this.money(c.projectedNet, 0);
    this.$('remainingDays').textContent = c.remainingDays;
    this.$('monthProgress').style.width = `${c.progress}%`;
    this.$('calendarSummary').textContent = `Há ${c.ctx.selectedDates.length} dias compatíveis com sua agenda. Com ${this.state.extraDaysOff} folga(s) extra(s), o plano considera ${c.ctx.plannedDays} dias de trabalho.`;
    document.querySelectorAll('.day-button').forEach(button => { const active = Number(button.dataset.days) === this.currentDaysPerWeek(); button.className = `day-button flex-1 py-3 rounded-xl text-[10px] font-bold uppercase ${active ? 'day-btn-active' : 'day-btn-inactive'}`; });
    document.querySelectorAll('.weekday-button').forEach(button => { const active = this.state.workWeekdays.includes(Number(button.dataset.weekday)); button.className = `weekday-button py-3 rounded-xl text-[10px] font-bold ${active ? 'weekday-active' : 'weekday-inactive bg-slate-50'}`; });
    document.querySelectorAll('.period-button').forEach(button => { const active = Number(button.dataset.period) === this.state.compare.period; button.className = `period-button px-3 py-1.5 rounded-md text-[10px] font-bold ${active ? 'period-btn-active' : 'period-btn-inactive'}`; });
    this.renderStatus(c); this.renderWeek(c); this.renderInsights(c); this.renderHistory(c); this.renderCosts(c); this.renderLearning(c); this.renderEvents(); this.renderCharts(c); this.renderRecordPreview();
  },

  renderStatus(c) {
    const title = this.$('monthStatusTitle'), text = this.$('monthStatusText'), pill = this.$('monthStatusPill'), hero = this.$('heroStatus');
    pill.className = 'px-3 py-1.5 rounded-full text-[10px] font-extrabold ';
    if (!c.records.length) {
      title.textContent = 'Comece registrando seu primeiro dia'; text.textContent = `Sua meta foi dividida por ${c.ctx.plannedDays} dias de trabalho neste mês.`; pill.textContent = 'PLANO PRONTO'; pill.className += 'status-neutral'; hero.textContent = `Você tem ${c.remainingDays} dias planejados para alcançar ${this.money(this.state.targetProfit, 0)} líquidos.`; return;
    }
    if (c.paceDelta >= 0) { title.textContent = `Você está ${this.money(c.paceDelta, 0)} adiantado`; text.textContent = c.earnedDays > 0 ? `Seu ritmo já representa ${c.earnedDays} dia(s) de meta. Preserve a vantagem ou transforme em folga.` : 'Seu resultado real está acima do ritmo necessário para o mês.'; pill.textContent = 'ADIANTADO'; pill.className += 'status-positive'; }
    else { title.textContent = `Faltam ${this.money(Math.abs(c.paceDelta), 0)} para o ritmo ideal`; text.textContent = `A diferença foi redistribuída pelos ${c.remainingDays} dias restantes.`; pill.textContent = 'AJUSTANDO'; pill.className += 'status-negative'; }
    hero.textContent = c.remainingDays > 0 ? `Meta recalculada após ${c.records.length} dia(s): ${this.money(c.dailyGross, 0)} de faturamento por dia.` : 'Não restam dias planejados neste mês. Revise a agenda ou a meta.';
  },

  renderWeek(c) {
    const week = this.weekContext(c), delta = week.actual - week.target;
    this.$('weekTarget').textContent = this.money(week.target, 0);
    this.$('weekActual').textContent = this.money(week.actual, 0);
    this.$('weekRevenueKm').textContent = this.money(week.revenueKm);
    this.$('weekStatusPill').className = `px-3 py-1.5 rounded-full text-[10px] font-extrabold ${delta >= 0 && week.records.length ? 'status-positive' : week.records.length ? 'status-negative' : 'status-neutral'}`;
    this.$('weekStatusPill').textContent = week.records.length ? (delta >= 0 ? 'NO RITMO' : 'AJUSTANDO') : 'SEMANA';
    this.$('weekStatusTitle').textContent = week.records.length ? (delta >= 0 ? 'Semana acima da rota' : 'Semana pede recuperação') : 'Planejamento semanal';
    this.$('weekStatusText').textContent = week.records.length ? `${week.records.length} dia(s) registrados. Saldo semanal: ${delta >= 0 ? '+' : '-'} ${this.money(Math.abs(delta), 0)}.` : `A semana tem ${week.dates.length} dia(s) previstos na sua agenda.`;
  },

  renderInsights(c) {
    const title = this.$('insightTitle'), text = this.$('insightText'), reasons = this.$('insightReasons'); const items = [];
    if (!c.records.length) { title.textContent = 'Sua meta está pronta'; text.textContent = `Para alcançar ${this.money(this.state.targetProfit, 0)} líquidos, a estimativa é rodar ${this.integer(c.dailyKm)} km por dia.`; }
    else if (c.paceDelta < 0) { title.textContent = 'Por que sua meta diária aumentou?'; text.textContent = 'O VETTA recalculou o esforço necessário sem esconder o motivo.'; items.push(`O ritmo acumulado está ${this.money(Math.abs(c.paceDelta), 0)} abaixo do planejado.`); }
    else { title.textContent = c.earnedDays > 0 ? 'Você conquistou margem para folgar' : 'Seu ritmo está saudável'; text.textContent = c.earnedDays > 0 ? `A vantagem atual equivale a aproximadamente ${c.earnedDays} dia(s) da meta.` : 'Mantendo a eficiência atual, a projeção continua acima do objetivo.'; }
    if (this.state.extraDaysOff > 0) items.push(`${this.state.extraDaysOff} folga(s) extra(s) deixam menos dias para dividir a mesma meta.`);
    items.push(`${this.state.fuel.label} custa ${this.money(c.fuelKm)}/km; custos personalizados adicionam ${this.money(c.costs.perKm)}/km e ${(c.costs.percent * 100).toFixed(1)}% do faturamento.`);
    if (c.records.length && c.avgRevenueKm > 0) items.push(`Sua receita real média está em ${this.money(c.avgRevenueKm)}/km.`);
    reasons.innerHTML = items.map(item => `<div class="flex gap-2 text-xs text-slate-600 bg-white/70 p-3 rounded-xl"><i class="fas fa-circle-info text-blue-500 mt-0.5"></i><span>${this.escape(item)}</span></div>`).join('');
  },

  prepareRecordForm(force = false) {
    if (force || !this.$('recordDate').value) this.$('recordDate').value = this.todayKey();
    if (force) ['recordGross', 'recordKm', 'recordHours', 'recordFuel'].forEach(id => this.$(id).value = '');
    this.renderRecordPreview();
  },

  recordDraft() {
    const date = this.$('recordDate').value || this.todayKey(); const ctx = this.monthContext(this.parseDate(date)); const costs = this.costContext(this.parseDate(date));
    return { id: `day-${date}`, date, gross: this.number(this.$('recordGross').value), km: this.number(this.$('recordKm').value), hours: this.number(this.$('recordHours').value), fuelSpend: this.number(this.$('recordFuel').value), fuelTypeSnapshot: this.state.fuel.type, fuelLabelSnapshot: this.state.fuel.label, fuelPriceSnapshot: this.state.fuel.price, fuelCostKmSnapshot: this.fuelCostKm(), perKmCostSnapshot: costs.perKm, percentCostSnapshot: costs.percent, fixedShareSnapshot: costs.monthlyFixed / Math.max(1, ctx.plannedDays), updatedAt: new Date().toISOString() };
  },

  renderRecordPreview() {
    const draft = this.recordDraft(), numbers = this.recordNumbers(draft), c = this.calculations();
    this.$('previewCost').textContent = this.money(numbers.fuel + numbers.variable + numbers.percentCost + numbers.fixedShare);
    this.$('previewNet').textContent = this.money(numbers.net);
    this.$('previewRevenueKm').textContent = this.money(numbers.revenuePerKm);
    const delta = numbers.contribution - c.dailyContribution;
    this.$('previewDelta').textContent = `${delta >= 0 ? '+' : ''}${this.money(delta)}`;
    this.$('previewDelta').className = `text-lg tabular ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`;
    if (!draft.gross || !draft.km) this.$('previewExplanation').textContent = 'Preencha faturamento e quilômetros. Os custos serão estimados automaticamente.';
    else if (delta >= 0) this.$('previewExplanation').textContent = `Este dia gerou ${this.money(delta)} a mais de contribuição que a meta atual.`;
    else this.$('previewExplanation').textContent = `A combinação de faturamento e rodagem deixou o resultado ${this.money(Math.abs(delta))} abaixo da contribuição necessária.`;
    const exists = this.state.records.some(record => record.date === draft.date); this.$('saveDayButton').innerHTML = exists ? '<i class="fas fa-pen mr-2"></i>Atualizar este dia' : '<i class="fas fa-check mr-2"></i>Fechar e salvar o dia';
  },

  saveDay() {
    const draft = this.recordDraft();
    if (!draft.date || draft.gross <= 0 || draft.km <= 0) return this.toast('Informe faturamento e quilômetros maiores que zero.');
    const index = this.state.records.findIndex(record => record.date === draft.date);
    if (index >= 0) this.state.records[index] = { ...this.state.records[index], ...draft }; else this.state.records.push({ ...draft, createdAt: new Date().toISOString() });
    this.state.records.sort((a, b) => a.date.localeCompare(b.date)); this.save(); this.render(); this.toast(index >= 0 ? 'Dia atualizado.' : 'Dia salvo e meta recalculada.'); this.prepareRecordForm(true); this.showView('dashboard');
  },

  handleHistoryAction(event) {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const date = button.dataset.date, action = button.dataset.action;
    if (action === 'edit') { const record = this.state.records.find(item => item.date === date); if (!record) return; this.$('recordDate').value = record.date; this.$('recordGross').value = record.gross; this.$('recordKm').value = record.km; this.$('recordHours').value = record.hours || ''; this.$('recordFuel').value = record.fuelSpend || ''; this.showView('day'); this.renderRecordPreview(); }
    if (action === 'delete' && confirm('Excluir este registro? A meta será recalculada.')) { this.state.records = this.state.records.filter(item => item.date !== date); this.save(); this.render(); this.toast('Registro excluído.'); }
  },

  renderHistory(existing = null) {
    const c = existing || this.calculations(), records = [...c.records].sort((a, b) => b.date.localeCompare(a.date));
    this.$('historyDays').textContent = records.length; this.$('historyRevenueKm').textContent = this.money(c.avgRevenueKm); this.$('historyNet').textContent = this.money(records.reduce((sum, record) => sum + record.net, 0), 0); this.$('historyCount').textContent = `${records.length} ${records.length === 1 ? 'REGISTRO' : 'REGISTROS'}`;
    if (!records.length) this.$('historyList').innerHTML = '<div class="card-vetta p-8 text-center text-sm text-slate-400">Nenhum dia registrado ainda.</div>';
    else this.$('historyList').innerHTML = records.map(record => { const date = this.parseDate(record.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }); return `<article class="history-row"><div class="flex justify-between items-start gap-3"><div><span class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">${date}</span><strong class="block text-xl mt-1 tabular">${this.money(record.gross)}</strong><span class="text-xs text-slate-500">${this.integer(record.km)} km · ${this.money(record.revenuePerKm)}/km</span></div><div class="text-right"><span class="label-micro">Líquido estimado</span><strong class="${record.net >= 0 ? 'text-emerald-600' : 'text-red-500'} tabular">${this.money(record.net)}</strong></div></div><div class="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-50"><button data-action="edit" data-date="${record.date}" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-extrabold">EDITAR</button><button data-action="delete" data-date="${record.date}" class="px-3 py-2 rounded-xl bg-red-50 text-red-500 text-[10px] font-extrabold">EXCLUIR</button></div></article>`; }).join('');
    if (records.length < 2) this.$('historyInsight').innerHTML = '<span class="label-micro !text-emerald-700">Comparação inteligente</span><h3 class="font-extrabold text-lg">Ainda não há dias suficientes</h3><p class="text-xs text-slate-500 mt-2">Depois de dois registros, o VETTA mostra qual dia realmente rendeu mais.</p>';
    else { const best = [...records].sort((a, b) => b.net - a.net)[0], highest = [...records].sort((a, b) => b.gross - a.gross)[0], same = best.date === highest.date; this.$('historyInsight').innerHTML = `<span class="label-micro !text-emerald-700">Comparação inteligente</span><h3 class="font-extrabold text-lg">${same ? 'Seu maior faturamento também foi o melhor dia' : 'Faturar mais não significou ganhar mais'}</h3><p class="text-xs text-slate-500 mt-2">${same ? `Em ${this.parseDate(best.date).toLocaleDateString('pt-BR')}, você gerou ${this.money(best.net)} líquidos.` : `O dia de ${this.money(highest.gross)} bruto rendeu ${this.money(highest.net)} líquido, enquanto seu melhor dia líquido chegou a ${this.money(best.net)} com ${this.integer(best.km)} km.`}</p>`; }
  },

  renderCosts(existing = null) {
    const c = existing || this.calculations(), summary = c.costs;
    this.$('costSummary').innerHTML = `<div class="bg-red-50 rounded-2xl p-4"><span class="label-micro !text-red-700">Obrigações/mês</span><strong class="text-red-600">${this.money(summary.obligations)}</strong></div><div class="bg-emerald-50 rounded-2xl p-4"><span class="label-micro !text-emerald-700">Reservas/mês</span><strong class="text-emerald-600">${this.money(summary.reserves)}</strong></div><div class="bg-amber-50 rounded-2xl p-4"><span class="label-micro !text-amber-700">Custos por km</span><strong class="text-amber-600">${this.money(summary.perKm)}</strong></div><div class="bg-purple-50 rounded-2xl p-4"><span class="label-micro !text-purple-700">Taxas do bruto</span><strong class="text-purple-600">${(summary.percent * 100).toFixed(1)}%</strong></div>`;
    if (!this.state.costs.length) this.$('costList').innerHTML = '<p class="text-sm text-slate-400 text-center py-5">Nenhum custo cadastrado.</p>';
    else this.$('costList').innerHTML = this.state.costs.map(cost => `<article class="cost-row ${cost.active ? '' : 'opacity-50'}"><div class="flex justify-between gap-3"><div><div class="flex items-center gap-2"><strong>${this.escape(cost.name)}</strong><span class="cost-kind">${this.costKindLabel(cost.kind)}</span></div><span class="text-xs text-slate-500">${cost.category === 'reserve' ? 'Reserva/objetivo' : 'Obrigação'} · ${this.costValueText(cost)}</span></div><button data-cost-action="toggle" data-cost-id="${cost.id}" class="toggle ${cost.active ? 'active' : ''}" aria-label="Ativar ou desativar"></button></div><div class="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-50"><button data-cost-action="edit" data-cost-id="${cost.id}" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-extrabold">EDITAR</button><button data-cost-action="delete" data-cost-id="${cost.id}" class="px-3 py-2 rounded-xl bg-red-50 text-red-500 text-[10px] font-extrabold">EXCLUIR</button></div></article>`).join('');
  },

  costKindLabel(kind) { return ({ monthly: 'mensal', weekly: 'semanal', per_km: 'por km', percent: 'percentual', one_time: 'único' })[kind] || kind; },
  costValueText(cost) { if (cost.kind === 'percent') return `${this.number(cost.value).toFixed(1)}% do faturamento`; if (cost.kind === 'per_km') return `${this.money(cost.value)}/km`; if (cost.kind === 'one_time') return `${this.money(cost.value)} em ${cost.month || this.monthKey()}`; return `${this.money(cost.value)}/${cost.kind === 'weekly' ? 'semana' : 'mês'}`; },

  openCostModal(cost = null) {
    this.$('costModalTitle').textContent = cost ? 'Editar custo' : 'Adicionar custo'; this.$('costId').value = cost?.id || ''; this.$('costName').value = cost?.name || ''; this.$('costCategory').value = cost?.category || 'obligation'; this.$('costKind').value = cost?.kind || 'monthly'; this.$('costValue').value = cost?.value ?? ''; this.$('costMonth').value = cost?.month || this.monthKey(); this.syncCostModal(); this.$('costModal').classList.remove('hidden');
  },
  syncCostModal() { const kind = this.$('costKind').value; this.$('costMonthWrap').classList.toggle('hidden', kind !== 'one_time'); this.$('costValuePrefix').textContent = kind === 'percent' ? '%' : 'R$'; this.$('costValueLabel').textContent = kind === 'per_km' ? 'Valor por km' : kind === 'percent' ? 'Percentual' : 'Valor'; },
  saveCost() { const id = this.$('costId').value || this.uid('cost'), name = this.$('costName').value.trim(), value = this.number(this.$('costValue').value), kind = this.$('costKind').value; if (!name || value <= 0) return this.toast('Informe nome e valor do custo.'); const existing = this.state.costs.find(cost => cost.id === id); const cost = { id, name, category: this.$('costCategory').value, kind, value, active: existing?.active ?? true, month: kind === 'one_time' ? this.$('costMonth').value : undefined }; const index = this.state.costs.findIndex(item => item.id === id); if (index >= 0) this.state.costs[index] = cost; else this.state.costs.push(cost); this.save(); this.closeModal('costModal'); this.render(); this.toast(index >= 0 ? 'Custo atualizado.' : 'Custo adicionado e meta recalculada.'); },
  handleCostAction(event) { const button = event.target.closest('[data-cost-action]'); if (!button) return; const index = this.state.costs.findIndex(cost => cost.id === button.dataset.costId); if (index < 0) return; if (button.dataset.costAction === 'edit') this.openCostModal(this.state.costs[index]); if (button.dataset.costAction === 'toggle') { this.state.costs[index].active = !this.state.costs[index].active; this.save(); this.render(); } if (button.dataset.costAction === 'delete' && confirm(`Excluir “${this.state.costs[index].name}”?`)) { this.state.costs.splice(index, 1); this.save(); this.render(); this.toast('Custo excluído.'); } },

  learningSuggestions() {
    const recent = [...this.state.records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
    if (recent.length < 3) return { recent, revenue: null, efficiency: null };
    const normalized = recent.map(record => this.recordNumbers(record));
    const totalKm = normalized.reduce((sum, record) => sum + record.km, 0), totalGross = normalized.reduce((sum, record) => sum + record.gross, 0);
    const avgRevenue = totalKm > 0 ? totalGross / totalKm : 0;
    const revenue = avgRevenue > 0 && Math.abs(avgRevenue - this.state.revenueKm) / Math.max(0.01, this.state.revenueKm) >= 0.04 ? avgRevenue : null;
    const fuelRecords = recent.filter(record => this.number(record.fuelSpend) > 0 && this.number(record.km) > 0 && (!record.fuelTypeSnapshot || record.fuelTypeSnapshot === this.state.fuel.type));
    let efficiency = null;
    if (fuelRecords.length >= 3) { const km = fuelRecords.reduce((sum, record) => sum + this.number(record.km), 0), spend = fuelRecords.reduce((sum, record) => sum + this.number(record.fuelSpend), 0), costKm = spend / Math.max(1, km), suggestion = this.state.fuel.price / Math.max(0.01, costKm); if (suggestion > 1 && suggestion < 40 && Math.abs(suggestion - this.state.fuel.efficiency) / Math.max(0.01, this.state.fuel.efficiency) >= 0.06) efficiency = suggestion; }
    return { recent, revenue, efficiency };
  },

  renderLearning() {
    const suggestion = this.learningSuggestions();
    if (suggestion.recent.length < 3) { this.$('learningText').textContent = `Registre mais ${3 - suggestion.recent.length} dia(s) para receber a primeira leitura.`; this.$('learningActions').innerHTML = ''; return; }
    const actions = [];
    if (suggestion.revenue) actions.push(`<div class="bg-white p-4 rounded-2xl"><p class="text-xs text-slate-600">Sua média real foi <strong>${this.money(suggestion.revenue)}/km</strong>, enquanto o parâmetro está em ${this.money(this.state.revenueKm)}/km.</p><button data-learning="revenue" data-value="${suggestion.revenue}" class="mt-3 text-[10px] font-extrabold text-purple-600">ATUALIZAR RECEITA MÉDIA</button></div>`);
    if (suggestion.efficiency) actions.push(`<div class="bg-white p-4 rounded-2xl"><p class="text-xs text-slate-600">Pelos abastecimentos informados, o rendimento estimado é <strong>${suggestion.efficiency.toFixed(1)} km/${this.state.fuel.unit}</strong>.</p><button data-learning="efficiency" data-value="${suggestion.efficiency}" class="mt-3 text-[10px] font-extrabold text-purple-600">ATUALIZAR RENDIMENTO</button></div>`);
    this.$('learningText').textContent = actions.length ? 'Há sugestões baseadas nos seus próprios dias. Nada muda sem sua confirmação.' : 'Seus parâmetros estão coerentes com os registros recentes.';
    this.$('learningActions').innerHTML = actions.join('');
  },
  handleLearningAction(event) { const button = event.target.closest('[data-learning]'); if (!button) return; if (button.dataset.learning === 'revenue') this.state.revenueKm = this.number(button.dataset.value); if (button.dataset.learning === 'efficiency') this.state.fuel.efficiency = this.number(button.dataset.value); this.save(); this.syncInputs(); this.render(); this.toast('Parâmetro atualizado com seus dados reais.'); },

  renderCompare(c) {
    const gasCost = this.state.compare.gasEff > 0 ? this.state.compare.gasPrice / this.state.compare.gasEff : 0, gnvCost = this.state.compare.gnvEff > 0 ? this.state.compare.gnvPrice / this.state.compare.gnvEff : 0;
    this.$('gasCostKm').textContent = this.money(gasCost); this.$('gnvCostKm').textContent = this.money(gnvCost);
    const saving = Math.max(0, (gasCost - gnvCost) * c.totalRequiredKm * 12 * this.state.compare.period);
    this.$('projectedSaving').textContent = this.money(saving); this.$('savingCaption').textContent = `Economia acumulada em ${this.state.compare.period} ${this.state.compare.period === 1 ? 'ano' : 'anos'}, usando ${this.integer(c.totalRequiredKm)} km/mês.`; this.$('chartTitle').textContent = `Projeção em ${this.state.compare.period} ${this.state.compare.period === 1 ? 'ano' : 'anos'}`;
    if (!this.$('compareDetails').open || typeof Chart === 'undefined') return;
    const axis = Array.from({ length: this.state.compare.period }, (_, index) => `${index + 1}º ano`), annualKm = c.totalRequiredKm * 12, gasAnnual = gasCost * annualKm, gnvAnnual = gnvCost * annualKm;
    if (this.compareChart) this.compareChart.destroy();
    this.compareChart = new Chart(this.$('compareChart'), { type: 'bar', data: { labels: axis, datasets: [{ label: 'Gasolina', data: axis.map((_, index) => gasAnnual * (index + 1)), backgroundColor: '#2563EB', borderRadius: 8 }, { label: 'GNV', data: axis.map((_, index) => gnvAnnual * (index + 1)), backgroundColor: '#F59E0B', borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#F1F5F9' }, ticks: { callback: value => `R$ ${Math.round(value / 1000)}k` } } }, plugins: { legend: { labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: context => ` ${context.dataset.label}: ${this.money(context.raw)}` } } } } });
  },

  renderCharts(c) {
    if (typeof Chart === 'undefined') return;
    const values = [this.state.targetProfit, c.totalFuel, c.totalVariable, c.totalPercent, c.costs.monthlyFixed], labels = ['Líquido', 'Combustível', 'Por km', 'Percentuais', 'Fixos/Reservas'], colors = ['#10B981', '#EF4444', '#F59E0B', '#A855F7', '#2563EB'];
    if (this.revenueChart) this.revenueChart.destroy();
    this.revenueChart = new Chart(this.$('revenueChart'), { type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14, font: { size: 9, weight: '700' } } }, tooltip: { callbacks: { label: context => ` ${context.label}: ${this.money(context.raw)}` } } } } });
    const chronological = [...c.records].sort((a, b) => a.date.localeCompare(b.date));
    if (this.historyChart) this.historyChart.destroy();
    this.historyChart = new Chart(this.$('historyChart'), { type: 'line', data: { labels: chronological.map(record => this.parseDate(record.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })), datasets: [{ label: 'Líquido', data: chronological.map(record => record.net), borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,.12)', fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: '#10B981' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { grid: { color: '#F1F5F9' }, ticks: { callback: value => `R$ ${Math.round(value)}` } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => ` Líquido: ${this.money(context.raw)}` } } } } });
  },

  openEventModal(event = null) { this.$('eventModalTitle').textContent = event ? 'Editar item do radar' : 'Adicionar ao radar'; this.$('eventId').value = event?.id || ''; this.$('eventTitle').value = event?.title || ''; this.$('eventDate').value = event?.date || this.todayKey(); this.$('eventCategory').value = event?.category || 'event'; this.$('eventNotes').value = event?.notes || ''; this.$('eventModal').classList.remove('hidden'); },
  saveEvent() { const id = this.$('eventId').value || this.uid('event'), title = this.$('eventTitle').value.trim(), date = this.$('eventDate').value; if (!title || !date) return this.toast('Informe título e data.'); const item = { id, title, date, category: this.$('eventCategory').value, notes: this.$('eventNotes').value.trim(), updatedAt: new Date().toISOString() }; const index = this.state.events.findIndex(event => event.id === id); if (index >= 0) this.state.events[index] = item; else this.state.events.push(item); this.save(); this.closeModal('eventModal'); this.renderEvents(); this.toast('Radar local atualizado.'); },
  renderEvents() { const sorted = [...this.state.events].sort((a, b) => a.date.localeCompare(b.date)); if (!sorted.length) { this.$('eventList').innerHTML = '<div class="text-center text-sm text-slate-400 py-5">Nenhum evento ou alerta salvo.</div>'; return; } this.$('eventList').innerHTML = sorted.map(event => `<article class="event-row"><div class="flex justify-between gap-3"><div><span class="event-badge badge-${event.category}">${this.eventCategoryLabel(event.category)}</span><strong class="block mt-2">${this.escape(event.title)}</strong><span class="text-xs text-slate-500">${this.parseDate(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>${event.notes ? `<p class="text-xs text-slate-500 mt-2">${this.escape(event.notes)}</p>` : ''}</div></div><div class="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-50"><button data-event-action="edit" data-event-id="${event.id}" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-extrabold">EDITAR</button><button data-event-action="delete" data-event-id="${event.id}" class="px-3 py-2 rounded-xl bg-red-50 text-red-500 text-[10px] font-extrabold">EXCLUIR</button></div></article>`).join(''); },
  eventCategoryLabel(category) { return ({ event: 'evento', alert: 'alerta', opportunity: 'oportunidade', traffic: 'trânsito' })[category] || category; },
  handleEventAction(event) { const button = event.target.closest('[data-event-action]'); if (!button) return; const index = this.state.events.findIndex(item => item.id === button.dataset.eventId); if (index < 0) return; if (button.dataset.eventAction === 'edit') this.openEventModal(this.state.events[index]); if (button.dataset.eventAction === 'delete' && confirm('Excluir este item do radar local?')) { this.state.events.splice(index, 1); this.save(); this.renderEvents(); } },

  printReport() {
    const c = this.calculations(), week = this.weekContext(c), records = [...c.records].sort((a, b) => a.date.localeCompare(b.date));
    const costRows = this.state.costs.filter(cost => cost.active).map(cost => `<tr><td>${this.escape(cost.name)}</td><td>${this.escape(this.costKindLabel(cost.kind))}</td><td>${this.costValueText(cost)}</td></tr>`).join('');
    const recordRows = records.map(record => `<tr><td>${this.parseDate(record.date).toLocaleDateString('pt-BR')}</td><td>${this.money(record.gross)}</td><td>${this.integer(record.km)} km</td><td>${this.money(record.net)}</td></tr>`).join('');
    this.$('reportSheet').innerHTML = `<div class="report-title">VETTA</div><div class="report-muted">Relatório de ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div><div class="report-grid" style="margin-top:20px"><div class="report-metric"><div class="report-muted">Meta líquida</div><strong>${this.money(this.state.targetProfit)}</strong></div><div class="report-metric"><div class="report-muted">Líquido realizado</div><strong>${this.money(c.actualNet)}</strong></div><div class="report-metric"><div class="report-muted">Faturamento</div><strong>${this.money(c.actualGross)}</strong></div><div class="report-metric"><div class="report-muted">Quilômetros</div><strong>${this.integer(c.actualKm)} km</strong></div><div class="report-metric"><div class="report-muted">Receita média/km</div><strong>${this.money(c.avgRevenueKm)}</strong></div><div class="report-metric"><div class="report-muted">Projeção mensal</div><strong>${this.money(c.projectedNet)}</strong></div></div><h2 style="margin-top:24px">Custos configurados</h2><table class="report-table"><thead><tr><th>Nome</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${costRows || '<tr><td colspan="3">Nenhum custo</td></tr>'}</tbody></table><h2 style="margin-top:24px">Dias registrados</h2><table class="report-table"><thead><tr><th>Data</th><th>Bruto</th><th>Km</th><th>Líquido</th></tr></thead><tbody>${recordRows || '<tr><td colspan="4">Nenhum registro</td></tr>'}</tbody></table><p class="report-muted" style="margin-top:20px">Semana atual: meta ${this.money(week.target)} · realizado ${this.money(week.actual)}.</p>`;
    window.print();
  },

  reset() { if (!confirm('Restaurar parâmetros? Histórico, radar e backup local serão preservados.')) return; const records = this.state.records, events = this.state.events, onboardingComplete = true; this.state = { ...this.cloneDefaults(), records, events, onboardingComplete }; this.save(); this.syncInputs(); this.render(); this.toast('Parâmetros restaurados.'); },
  exportData() { const payload = { app: 'VETTA', version: 3, exportedAt: new Date().toISOString(), data: this.state }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `vetta-backup-${this.todayKey()}.json`; link.click(); URL.revokeObjectURL(url); this.toast('Backup exportado.'); },
  async importData(event) { const file = event.target.files?.[0]; if (!file) return; try { const parsed = JSON.parse(await file.text()), data = parsed.data || parsed; if (!Array.isArray(data.records)) throw new Error('Backup inválido'); this.state = data.version >= 3 ? this.normalizeState(data) : this.migrateLegacy(data); this.state.onboardingComplete = true; this.save(); this.syncInputs(); this.render(); this.toast('Backup importado.'); } catch (error) { console.error(error); this.toast('Não foi possível importar esse arquivo.'); } finally { event.target.value = ''; } },

  prepareOnboarding() {
    if (this.state.onboardingComplete) return;
    this.$('onboardingTarget').value = this.state.targetProfit; this.onboardingDays = 6; this.$('onboardingFuelType').value = this.state.fuel.type === 'custom' ? 'gnv' : this.state.fuel.type; this.fillOnboardingFuel(this.$('onboardingFuelType').value); this.$('onboardingRevenue').value = this.state.revenueKm; this.$('onboardingFixed').value = 650; this.$('onboardingModal').classList.remove('hidden'); this.renderOnboardingStep();
  },
  fillOnboardingFuel(type) { const preset = fuelPresets[type] || fuelPresets.gnv; this.$('onboardingFuelPrice').value = preset.price; this.$('onboardingFuelEff').value = preset.efficiency; },
  renderOnboardingStep() { [1, 2, 3].forEach(step => this.$(`onboardingStep${step}`).classList.toggle('hidden', step !== this.onboardingStep)); const titles = ['Qual é sua meta?', 'Qual combustível você usa?', 'Últimos parâmetros']; this.$('onboardingTitle').textContent = titles[this.onboardingStep - 1]; this.$('onboardingProgress').textContent = `${this.onboardingStep}/3`; this.$('onboardingBar').style.width = `${this.onboardingStep / 3 * 100}%`; this.$('onboardingBack').classList.toggle('invisible', this.onboardingStep === 1); this.$('onboardingNext').textContent = this.onboardingStep === 3 ? 'Começar a usar' : 'Continuar'; },
  nextOnboarding() { if (this.onboardingStep === 1 && this.number(this.$('onboardingTarget').value) <= 0) return this.toast('Informe uma meta mensal.'); if (this.onboardingStep === 2 && (this.number(this.$('onboardingFuelPrice').value) <= 0 || this.number(this.$('onboardingFuelEff').value) <= 0)) return this.toast('Informe preço e rendimento.'); if (this.onboardingStep < 3) { this.onboardingStep += 1; this.renderOnboardingStep(); return; } const type = this.$('onboardingFuelType').value, preset = fuelPresets[type]; this.state.targetProfit = this.number(this.$('onboardingTarget').value); this.state.workWeekdays = this.weekdaysForCount(this.onboardingDays); this.state.fuel = { type, ...preset, price: this.number(this.$('onboardingFuelPrice').value), efficiency: this.number(this.$('onboardingFuelEff').value) }; this.state.revenueKm = this.number(this.$('onboardingRevenue').value) || 2.25; const fixed = this.number(this.$('onboardingFixed').value); this.state.costs = [{ id: 'maintenance-onboarding', name: 'Reserva de manutenção', kind: 'per_km', category: 'reserve', value: 0.18, active: true }]; if (fixed > 0) this.state.costs.push({ id: 'fixed-onboarding', name: 'Obrigações mensais iniciais', kind: 'monthly', category: 'obligation', value: fixed, active: true }); this.state.onboardingComplete = true; this.save(); this.closeModal('onboardingModal'); this.syncInputs(); this.render(); this.toast('VETTA configurado. Você pode ajustar tudo depois.'); },
  previousOnboarding() { if (this.onboardingStep > 1) { this.onboardingStep -= 1; this.renderOnboardingStep(); } },

  isIos() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  isSafari() { return /Safari/i.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(navigator.userAgent); },
  isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; },
  setupPwa() {
    const button = this.$('installButton');
    if (this.isStandalone()) button.classList.add('install-hidden');
    if (this.isIos() && !this.isStandalone()) this.$('installButtonLabel').textContent = 'Instalar no iPhone';
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); this.deferredPrompt = event; button.classList.remove('install-hidden'); });
    window.addEventListener('appinstalled', () => { button.classList.add('install-hidden'); this.toast('VETTA instalado com sucesso.'); });
    if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Service worker não registrado', error)));
  },
  async install() {
    if (this.isStandalone()) return this.toast('O VETTA já está instalado.');
    if (this.isIos()) {
      this.$('iosInstallVisual').classList.remove('hidden'); this.$('retryInstallButton').classList.add('hidden'); this.$('copyInstallLink').classList.toggle('hidden', this.isSafari());
      this.$('installHelp').textContent = this.isSafari() ? 'No iPhone, a instalação é feita pelo menu Compartilhar do Safari.' : 'No iPhone, abra este endereço no Safari para instalar como app.';
      const steps = this.isSafari() ? ['Toque em Compartilhar (quadrado com seta para cima).', 'Role e toque em “Adicionar à Tela de Início”.', 'Ative “Abrir como App da Web”.', 'Toque em “Adicionar”.'] : ['Copie o link abaixo.', 'Abra o Safari e cole o endereço.', 'Use Compartilhar → Adicionar à Tela de Início.', 'Ative “Abrir como App da Web” e confirme.'];
      this.$('installSteps').innerHTML = steps.map(step => `<li>${step}</li>`).join(''); this.$('installModal').classList.remove('hidden'); return;
    }
    this.$('iosInstallVisual').classList.add('hidden'); this.$('copyInstallLink').classList.add('hidden'); this.$('retryInstallButton').classList.remove('hidden');
    if (this.deferredPrompt) { this.deferredPrompt.prompt(); await this.deferredPrompt.userChoice; this.deferredPrompt = null; return; }
    const samsung = /SamsungBrowser/i.test(navigator.userAgent), android = /Android/i.test(navigator.userAgent);
    this.$('installHelp').textContent = 'O navegador não abriu o instalador automaticamente. Use o menu:';
    const steps = samsung ? ['Toque no menu ☰.', 'Escolha “Adicionar página a”.', 'Escolha “Tela inicial”.'] : android ? ['Toque no menu ⋮.', 'Escolha “Instalar app” ou “Adicionar à tela inicial”.', 'Confirme.'] : ['Abra o menu do navegador.', 'Procure “Instalar app” ou “Adicionar à tela inicial”.', 'Confirme.'];
    this.$('installSteps').innerHTML = steps.map(step => `<li>${step}</li>`).join(''); this.$('installModal').classList.remove('hidden');
  },
  async copyInstallUrl() { try { await navigator.clipboard.writeText(location.href); this.toast('Link copiado. Abra no Safari.'); } catch { prompt('Copie este endereço e abra no Safari:', location.href); } },
  closeModal(id) { this.$(id).classList.add('hidden'); },
  toast(message) { const element = this.$('toast'); element.textContent = message; element.classList.remove('hidden'); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => element.classList.add('hidden'), 2800); }
};

(() => {
  const RELEASE = APP_RELEASE;
  const costTemplates = {
    custom: { help: 'Escolha manualmente a finalidade e a frequência.', placeholder: 'Ex.: Seguro, parcela, pneus' },
    debt: { category: 'obligation', kind: 'monthly', placeholder: 'Ex.: Parcela do carro', help: 'Uma conta mensal que precisa ser paga com o trabalho.' },
    monthly: { category: 'obligation', kind: 'monthly', placeholder: 'Ex.: Seguro ou internet', help: 'Uma despesa que se repete todos os meses.' },
    weekly: { category: 'obligation', kind: 'weekly', placeholder: 'Ex.: Aluguel semanal', help: 'O VETTA converte o valor semanal para o planejamento mensal.' },
    per_km: { category: 'reserve', kind: 'per_km', placeholder: 'Ex.: Pneus e manutenção', help: 'Esse valor cresce junto com a quilometragem rodada.' },
    reserve: { category: 'reserve', kind: 'monthly', placeholder: 'Ex.: Reserva de emergência', help: 'Dinheiro que você quer separar todos os meses.' },
    one_time: { category: 'obligation', kind: 'one_time', placeholder: 'Ex.: Conserto ou fatura', help: 'Entra somente no mês selecionado e depois sai da meta.' }
  };

  defaults.version = 4;
  defaults.closings = [];
  defaults.costs = defaults.costs.map(cost => cost.id === 'fixed-default'
    ? { ...cost, name: 'Outros custos mensais', legacySource: false }
    : cost);

  const injectUi = () => {
    if (!document.getElementById('vettaFeatureStyles')) {
      const style = document.createElement('style'); style.id = 'vettaFeatureStyles'; style.textContent = `.update-banner{position:fixed;z-index:95;left:50%;bottom:105px;transform:translateX(-50%);width:min(92vw,500px);padding:14px;border-radius:20px;background:linear-gradient(135deg,#1D4ED8,#2563EB);box-shadow:0 18px 45px rgba(37,99,235,.35);display:flex;align-items:center;justify-content:space-between;gap:12px}.update-banner.hidden{display:none}.record-metric{border-radius:16px;padding:13px;background:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.8)}.legacy-note{margin-top:9px;padding:9px 11px;border-radius:12px;background:#EFF6FF;color:#1D4ED8;font-size:10px;line-height:1.45}`; document.head.appendChild(style);
    }
    const percentRow = document.getElementById('drePercent')?.parentElement;
    if (percentRow) percentRow.remove();
    if (!document.getElementById('drePercent')) {
      const hidden = document.createElement('span'); hidden.id = 'drePercent'; hidden.className = 'hidden'; document.body.appendChild(hidden);
    }

    const costSummary = document.getElementById('costSummary');
    if (costSummary) {
      const card = costSummary.closest('.card-vetta');
      const title = card?.querySelector('.label-micro');
      const description = title?.parentElement?.querySelector('p');
      if (title) title.textContent = 'Custos e reservas';
      if (description) description.textContent = 'Diga para onde o dinheiro precisa ir. O VETTA inclui cada valor na sua meta.';
      if (!document.getElementById('upcomingCosts')) {
        const upcoming = document.createElement('div'); upcoming.id = 'upcomingCosts'; upcoming.className = 'mt-5'; card?.appendChild(upcoming);
      }
    }

    const reportButton = document.getElementById('reportButton');
    const reportCard = reportButton?.closest('.card-vetta');
    if (reportCard && !document.getElementById('personalRanking')) {
      reportCard.insertAdjacentHTML('beforebegin', `
        <div class="card-vetta p-6 bg-gradient-to-br from-amber-50 to-white"><div class="flex justify-between items-start"><div><span class="label-micro !text-amber-700">Ranking pessoal</span><h3 class="font-extrabold text-lg">Seus próprios recordes</h3><p class="text-xs text-slate-500 mt-1">Comparação somente com seu histórico neste aparelho.</p></div><i class="fas fa-trophy text-amber-500 text-xl"></i></div><div id="personalRanking" class="grid grid-cols-2 gap-3 mt-5"></div></div>
        <div class="card-vetta p-6"><div class="flex justify-between items-start gap-3"><div><span class="label-micro !text-vetta-900">Fechamento mensal</span><h3 class="font-extrabold">Guarde o retrato de cada mês</h3></div><input id="closingMonth" type="month" class="input-vetta no-mask !w-[145px]"></div><div id="closingSummary" class="mt-4"></div><button id="saveClosingButton" class="w-full mt-4 py-3 rounded-2xl bg-emerald-500 text-white text-xs font-extrabold">SALVAR FECHAMENTO</button><div id="closingList" class="space-y-3 mt-5"></div></div>`);
      reportCard.innerHTML = `<span class="label-micro !text-vetta-900">Relatório do mês</span><p class="text-xs text-slate-500 mb-4">Gere um resumo pronto para imprimir, salvar ou compartilhar.</p><div class="grid grid-cols-2 gap-3"><button id="reportButton" class="py-4 rounded-2xl bg-vetta-900 text-white text-xs font-extrabold"><i class="fas fa-file-lines mr-2"></i>Relatório</button><button id="shareSummaryButton" class="py-4 rounded-2xl bg-blue-50 text-blue-600 text-xs font-extrabold"><i class="fas fa-share-nodes mr-2"></i>Compartilhar</button></div>`;
    }

    const installCard = document.getElementById('installCardButton');
    if (installCard && !document.getElementById('appVersionLabel')) {
      const strong = installCard.querySelector('strong');
      strong?.insertAdjacentHTML('afterend', `<span id="appVersionLabel" class="block text-[10px] text-slate-400 mt-1">Versão ${RELEASE}</span>`);
    }

    const installModal = document.getElementById('installModal');
    if (installModal && !document.getElementById('updateBanner')) {
      installModal.insertAdjacentHTML('beforebegin', `<div id="updateBanner" class="update-banner hidden"><div><span class="label-micro !mb-0 !text-blue-200">Nova versão disponível</span><strong id="updateVersionText" class="block text-white">Atualização pronta</strong></div><div class="flex gap-2"><button id="updateLaterButton" class="px-3 py-2 rounded-xl bg-white/10 text-white text-[10px] font-bold">DEPOIS</button><button id="updateNowButton" class="px-3 py-2 rounded-xl bg-white text-blue-700 text-[10px] font-extrabold">ATUALIZAR</button></div></div>`);
    }

    const costModal = document.getElementById('costModal');
    if (costModal) costModal.innerHTML = `<div class="modal-sheet"><div class="flex justify-between"><div><span class="label-micro !text-blue-600">Planejamento financeiro</span><h3 id="costModalTitle" class="text-xl font-extrabold">Adicionar custo</h3></div><button type="button" id="closeCostModal" class="w-9 h-9 rounded-full bg-slate-100"><i class="fas fa-xmark"></i></button></div><input id="costId" type="hidden"><div class="space-y-4 mt-5"><div><label class="label-micro">O que você quer adicionar?</label><select id="costTemplate" class="input-vetta"><option value="custom">Escolher livremente</option><option value="debt">Parcela ou dívida</option><option value="monthly">Despesa mensal</option><option value="weekly">Despesa semanal</option><option value="per_km">Custo do veículo por km</option><option value="reserve">Reserva ou objetivo</option><option value="one_time">Despesa única deste mês</option></select><p id="costTemplateHelp" class="text-xs text-slate-500 mt-2">Escolha uma opção e o VETTA organiza a forma de cálculo.</p></div><div><label class="label-micro">Nome que aparecerá no aplicativo</label><input id="costName" class="input-vetta no-mask" placeholder="Ex.: Seguro, parcela do carro, pneus"></div><div class="grid grid-cols-2 gap-3"><div><label class="label-micro">Finalidade</label><select id="costCategory" class="input-vetta"><option value="obligation">Conta ou obrigação</option><option value="reserve">Reserva ou objetivo</option></select></div><div><label class="label-micro">Como esse valor acontece?</label><select id="costKind" class="input-vetta"><option value="monthly">Todo mês</option><option value="weekly">Toda semana</option><option value="per_km">A cada km rodado</option><option value="one_time">Somente neste mês</option></select></div></div><div><label id="costValueLabel" class="label-micro">Valor</label><div class="input-wrapper"><span id="costValuePrefix">R$</span><input id="costValue" type="number" step=".01" class="input-vetta"></div></div><div id="costDueDayWrap"><label class="label-micro">Dia do vencimento (opcional)</label><input id="costDueDay" type="number" min="1" max="31" class="input-vetta no-mask" placeholder="Ex.: 10"></div><div id="costMonthWrap" class="hidden"><label class="label-micro">Mês da despesa</label><input id="costMonth" type="month" class="input-vetta no-mask"></div><div id="costImpactPreview" class="bg-blue-50 text-blue-700 text-xs p-4 rounded-2xl">Preencha o valor para ver o impacto na meta diária.</div></div><button type="button" id="saveCostButton" class="w-full mt-5 py-4 rounded-2xl bg-blue-600 text-white font-extrabold">Salvar e recalcular a meta</button></div>`;
  };

  injectUi();

  app.normalizeState = function(value) {
    const base = this.cloneDefaults();
    const normalized = { ...base, ...value };
    normalized.fuel = { ...base.fuel, ...(value.fuel || {}) };
    normalized.compare = { ...base.compare, ...(value.compare || {}) };
    let removedPercentCosts = 0;
    const sourceCosts = Array.isArray(value.costs) ? value.costs : base.costs;
    normalized.costs = sourceCosts.filter(cost => {
      if (cost.kind === 'percent') { removedPercentCosts += 1; return false; }
      return true;
    }).map(cost => {
      const migrated = cost.id === 'fixed-migrated' || /custos fixos migrados/i.test(cost.name || '');
      const initial = cost.id === 'fixed-default' && /custos fixos iniciais/i.test(cost.name || '');
      return { ...cost, name: migrated || initial ? 'Outros custos mensais' : cost.name, legacySource: migrated || Boolean(cost.legacySource) };
    });
    if (!normalized.costs.length) normalized.costs = base.costs;
    normalized.records = Array.isArray(value.records) ? value.records : [];
    normalized.events = Array.isArray(value.events) ? value.events : [];
    normalized.closings = Array.isArray(value.closings) ? value.closings : [];
    normalized.workWeekdays = Array.isArray(value.workWeekdays) && value.workWeekdays.length ? value.workWeekdays : base.workWeekdays;
    normalized.version = 4;
    normalized.release = RELEASE;
    if (removedPercentCosts) normalized.migrationNotice = 'As taxas percentuais foram retiradas para deixar o planejamento mais simples.';
    return normalized;
  };

  app.migrateLegacy = function(legacy) {
    const base = this.cloneDefaults();
    const days = Number(legacy.daysPerWeek || legacy.days || legacy.workWeekdays?.length || 6);
    const active = legacy.activeFuel === 'gas' ? 'gasoline' : 'gnv';
    const preset = fuelPresets[active];
    const fuel = active === 'gasoline'
      ? { type: active, label: preset.label, unit: preset.unit, price: Number(legacy.gasPrice || preset.price), efficiency: Number(legacy.gasEff || preset.efficiency) }
      : { type: active, label: preset.label, unit: preset.unit, price: Number(legacy.gnvPrice || preset.price), efficiency: Number(legacy.gnvEff || preset.efficiency) };
    return this.normalizeState({ ...base, onboardingComplete: true, targetProfit: Number(legacy.targetProfit || legacy.target || 4000), workWeekdays: Array.isArray(legacy.workWeekdays) ? legacy.workWeekdays : this.weekdaysForCount(days), extraDaysOff: Number(legacy.extraDaysOff || 0), revenueKm: Number(legacy.revenueKm || 2.25), fuel, compare: { gasPrice: Number(legacy.gasPrice || 6.19), gasEff: Number(legacy.gasEff || 10.5), gnvPrice: Number(legacy.gnvPrice || 4.79), gnvEff: Number(legacy.gnvEff || 13.2), period: Number(legacy.period || 1) }, costs: [{ id: 'maintenance-migrated', name: 'Reserva de manutenção', kind: 'per_km', category: 'reserve', value: Number(legacy.maintKm || .18), active: true }, { id: 'fixed-migrated', name: 'Outros custos mensais', kind: 'monthly', category: 'obligation', value: Number(legacy.fixedMonthly || legacy.fixed || 650), active: true, legacySource: true }], records: Array.isArray(legacy.records) ? legacy.records : [], events: [], closings: [] });
  };

  app.costContext = function(reference = new Date(), sourceCosts = this.state.costs) {
    const active = sourceCosts.filter(cost => cost.active && cost.kind !== 'percent');
    let obligations = 0, reserves = 0, perKm = 0;
    active.forEach(cost => {
      if (cost.kind === 'per_km') perKm += this.number(cost.value);
      else if (cost.category === 'reserve') reserves += this.monthlyEquivalent(cost, reference);
      else obligations += this.monthlyEquivalent(cost, reference);
    });
    return { active, obligations, reserves, monthlyFixed: obligations + reserves, perKm, percent: 0 };
  };

  const baseInit = app.init;
  app.init = function() {
    baseInit.call(this);
    if (this.state.migrationNotice) {
      const notice = this.state.migrationNotice; delete this.state.migrationNotice; this.save(); setTimeout(() => this.toast(notice), 500);
    }
  };

  const baseBind = app.bind;
  app.bind = function() {
    baseBind.call(this);
    this.$('costTemplate').addEventListener('change', event => this.applyCostTemplate(event.target.value));
    ['costName', 'costCategory', 'costValue', 'costDueDay', 'costMonth'].forEach(id => this.$(id).addEventListener('input', () => this.updateCostImpactPreview()));
    this.$('shareSummaryButton').addEventListener('click', () => this.shareSummary());
    this.$('closingMonth').addEventListener('input', () => this.renderClosings());
    this.$('saveClosingButton').addEventListener('click', () => this.saveMonthlyClosing());
    this.$('updateNowButton').addEventListener('click', () => this.applyUpdate());
    this.$('updateLaterButton').addEventListener('click', () => this.$('updateBanner').classList.add('hidden'));
  };

  const baseRender = app.render;
  app.render = function() {
    baseRender.call(this);
    this.$('appVersionLabel').textContent = `Versão ${RELEASE}`;
    this.renderPersonalRanking();
    this.renderClosings();
  };

  app.renderInsights = function(c) {
    const title = this.$('insightTitle'), text = this.$('insightText'), reasons = this.$('insightReasons'); const items = [];
    if (!c.records.length) { title.textContent = 'Sua meta está pronta'; text.textContent = `Para alcançar ${this.money(this.state.targetProfit, 0)} líquidos, a estimativa é rodar ${this.integer(c.dailyKm)} km por dia.`; }
    else if (c.paceDelta < 0) { title.textContent = 'Por que sua meta diária aumentou?'; text.textContent = 'O VETTA recalculou o esforço necessário sem esconder o motivo.'; items.push(`O ritmo acumulado está ${this.money(Math.abs(c.paceDelta), 0)} abaixo do planejado.`); }
    else { title.textContent = c.earnedDays > 0 ? 'Você conquistou margem para folgar' : 'Seu ritmo está saudável'; text.textContent = c.earnedDays > 0 ? `A vantagem atual equivale a aproximadamente ${c.earnedDays} dia(s) da meta.` : 'Mantendo a eficiência atual, a projeção continua acima do objetivo.'; }
    if (this.state.extraDaysOff > 0) items.push(`${this.state.extraDaysOff} folga(s) extra(s) deixam menos dias para dividir a mesma meta.`);
    items.push(`${this.state.fuel.label} custa ${this.money(c.fuelKm)}/km e seus custos por rodagem adicionam ${this.money(c.costs.perKm)}/km.`);
    if (c.costs.monthlyFixed > 0) items.push(`Contas e reservas somam ${this.money(c.costs.monthlyFixed)} neste mês.`);
    if (c.records.length && c.avgRevenueKm > 0) items.push(`Sua receita real média está em ${this.money(c.avgRevenueKm)}/km.`);
    reasons.innerHTML = items.map(item => `<div class="flex gap-2 text-xs text-slate-600 bg-white/70 p-3 rounded-xl"><i class="fas fa-circle-info text-blue-500 mt-0.5"></i><span>${this.escape(item)}</span></div>`).join('');
  };

  app.renderCosts = function(existing = null) {
    const c = existing || this.calculations(), summary = c.costs;
    this.$('costSummary').innerHTML = `<div class="bg-red-50 rounded-2xl p-4"><span class="label-micro !text-red-700">Contas/mês</span><strong class="text-red-600">${this.money(summary.obligations)}</strong></div><div class="bg-emerald-50 rounded-2xl p-4"><span class="label-micro !text-emerald-700">Reservas/mês</span><strong class="text-emerald-600">${this.money(summary.reserves)}</strong></div><div class="bg-amber-50 rounded-2xl p-4"><span class="label-micro !text-amber-700">Custos por km</span><strong class="text-amber-600">${this.money(summary.perKm)}</strong></div><div class="bg-blue-50 rounded-2xl p-4"><span class="label-micro !text-blue-700">Itens ativos</span><strong class="text-blue-600">${summary.active.length}</strong></div>`;
    this.$('costList').innerHTML = this.state.costs.length ? this.state.costs.map(cost => `<article class="cost-row ${cost.active ? '' : 'opacity-50'}"><div class="flex justify-between gap-3"><div><div class="flex items-center gap-2"><strong>${this.escape(cost.name)}</strong><span class="cost-kind">${this.costKindLabel(cost.kind)}</span></div><span class="text-xs text-slate-500">${cost.category === 'reserve' ? 'Reserva/objetivo' : 'Conta/obrigação'} · ${this.costValueText(cost)}</span>${cost.legacySource ? '<div class="legacy-note">Valor trazido da configuração anterior. Edite o nome ou divida em custos separados quando quiser.</div>' : ''}</div><button data-cost-action="toggle" data-cost-id="${cost.id}" class="toggle ${cost.active ? 'active' : ''}" aria-label="Ativar ou desativar"></button></div><div class="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-50"><button data-cost-action="edit" data-cost-id="${cost.id}" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-extrabold">EDITAR</button><button data-cost-action="delete" data-cost-id="${cost.id}" class="px-3 py-2 rounded-xl bg-red-50 text-red-500 text-[10px] font-extrabold">EXCLUIR</button></div></article>`).join('') : '<p class="text-sm text-slate-400 text-center py-5">Nenhum custo cadastrado.</p>';
    this.renderUpcomingCosts();
  };

  app.costKindLabel = kind => ({ monthly: 'mensal', weekly: 'semanal', per_km: 'por km', one_time: 'único' })[kind] || kind;
  app.costValueText = function(cost) { if (cost.kind === 'per_km') return `${this.money(cost.value)}/km`; if (cost.kind === 'one_time') return `${this.money(cost.value)} em ${cost.month || this.monthKey()}`; const due = cost.dueDay ? ` · vence dia ${cost.dueDay}` : ''; return `${this.money(cost.value)}/${cost.kind === 'weekly' ? 'semana' : 'mês'}${due}`; };

  app.openCostModal = function(cost = null) {
    this.$('costModalTitle').textContent = cost ? 'Editar custo' : 'Adicionar custo'; this.$('costId').value = cost?.id || ''; this.$('costTemplate').value = 'custom'; this.$('costName').value = cost?.name || ''; this.$('costCategory').value = cost?.category || 'obligation'; this.$('costKind').value = cost?.kind === 'percent' ? 'monthly' : (cost?.kind || 'monthly'); this.$('costValue').value = cost?.value ?? ''; this.$('costDueDay').value = cost?.dueDay || ''; this.$('costMonth').value = cost?.month || this.monthKey(); this.syncCostModal(); this.updateCostImpactPreview(); this.$('costModal').classList.remove('hidden');
  };
  app.syncCostModal = function() { const kind = this.$('costKind').value; this.$('costMonthWrap').classList.toggle('hidden', kind !== 'one_time'); this.$('costDueDayWrap').classList.toggle('hidden', kind !== 'monthly'); this.$('costValuePrefix').textContent = 'R$'; this.$('costValueLabel').textContent = kind === 'per_km' ? 'Valor reservado por km' : 'Valor'; this.updateCostImpactPreview(); };
  app.saveCost = function() { const id = this.$('costId').value || this.uid('cost'), name = this.$('costName').value.trim(), value = this.number(this.$('costValue').value), kind = this.$('costKind').value; if (!name || value <= 0) return this.toast('Informe um nome claro e um valor maior que zero.'); const existing = this.state.costs.find(cost => cost.id === id); const cost = { id, name, category: this.$('costCategory').value, kind, value, active: existing?.active ?? true, legacySource: false, dueDay: kind === 'monthly' ? this.clamp(Math.round(this.number(this.$('costDueDay').value)), 0, 31) || undefined : undefined, month: kind === 'one_time' ? this.$('costMonth').value : undefined }; const index = this.state.costs.findIndex(item => item.id === id); if (index >= 0) this.state.costs[index] = cost; else this.state.costs.push(cost); this.save(); this.closeModal('costModal'); this.render(); this.toast(index >= 0 ? 'Custo atualizado e meta recalculada.' : 'Custo adicionado e meta recalculada.'); };

  app.applyCostTemplate = function(key) { const template = costTemplates[key] || costTemplates.custom; if (template.category) this.$('costCategory').value = template.category; if (template.kind) this.$('costKind').value = template.kind; this.$('costName').placeholder = template.placeholder; this.$('costTemplateHelp').textContent = template.help; this.syncCostModal(); };
  app.draftCostFromModal = function() { const kind = this.$('costKind').value; return { id: this.$('costId').value || 'preview', name: this.$('costName').value.trim() || 'Novo custo', category: this.$('costCategory').value, kind, value: this.number(this.$('costValue').value), active: true, dueDay: kind === 'monthly' ? this.number(this.$('costDueDay').value) || undefined : undefined, month: kind === 'one_time' ? this.$('costMonth').value : undefined }; };
  app.estimateDailyGrossWithCosts = function(costs) { const current = this.calculations(), summary = this.costContext(new Date(), costs), contributionKm = Math.max(.01, this.state.revenueKm - this.fuelCostKm() - summary.perKm), remainingContribution = Math.max(0, this.state.targetProfit + summary.monthlyFixed - current.actualContribution), dailyContribution = current.remainingDays > 0 ? remainingContribution / current.remainingDays : remainingContribution; return dailyContribution / contributionKm * this.state.revenueKm; };
  app.updateCostImpactPreview = function() { const preview = this.$('costImpactPreview'); if (!preview) return; const draft = this.draftCostFromModal(); if (draft.value <= 0) { preview.textContent = 'Preencha o valor para ver o impacto na meta diária.'; return; } const baseline = this.calculations().dailyGross, costs = this.state.costs.filter(cost => cost.id !== draft.id && cost.kind !== 'percent'); costs.push(draft); const delta = this.estimateDailyGrossWithCosts(costs) - baseline; preview.innerHTML = delta > .5 ? `Com esse item, sua meta aumenta aproximadamente <strong>${this.money(delta, 0)} por dia</strong>.` : 'Esse item tem impacto pequeno na meta atual, mas continuará registrado.'; };
  app.renderUpcomingCosts = function() { const day = new Date().getDate(), upcoming = this.state.costs.filter(cost => cost.active && cost.kind === 'monthly' && cost.category === 'obligation' && cost.dueDay).map(cost => ({ ...cost, distance: cost.dueDay >= day ? cost.dueDay - day : 31 - day + cost.dueDay })).sort((a, b) => a.distance - b.distance).slice(0, 3); this.$('upcomingCosts').innerHTML = upcoming.length ? `<div class="pt-4 border-t border-slate-100"><span class="label-micro !text-vetta-900">Próximos vencimentos</span>${upcoming.map(cost => `<div class="flex justify-between text-xs py-2"><span>${this.escape(cost.name)}</span><strong>dia ${cost.dueDay}</strong></div>`).join('')}</div>` : '<p class="text-[10px] text-slate-400">Você pode informar o dia do vencimento ao editar uma conta mensal.</p>'; };

  app.renderCharts = function(c) {
    if (typeof Chart === 'undefined') return;
    const values = [this.state.targetProfit, c.totalFuel, c.totalVariable, c.costs.monthlyFixed], labels = ['Líquido', 'Combustível', 'Por km', 'Contas/Reservas'], colors = ['#10B981', '#EF4444', '#F59E0B', '#2563EB'];
    if (this.revenueChart) this.revenueChart.destroy();
    this.revenueChart = new Chart(this.$('revenueChart'), { type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16, font: { family: 'Plus Jakarta Sans', size: 10, weight: '700' } } }, tooltip: { callbacks: { label: context => ` ${context.label}: ${this.money(context.raw)}` } } } } });
    if (this.$('compareDetails').open) this.renderCompare(c);
    const chronological = [...c.records].sort((a, b) => a.date.localeCompare(b.date));
    if (this.historyChart) this.historyChart.destroy();
    this.historyChart = new Chart(this.$('historyChart'), { type: 'line', data: { labels: chronological.map(record => this.parseDate(record.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })), datasets: [{ label: 'Líquido', data: chronological.map(record => record.net), borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,.12)', fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: '#10B981' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { grid: { color: '#F1F5F9' }, ticks: { callback: value => `R$ ${Math.round(value)}` } } }, plugins: { legend: { display: false } } } });
  };

  app.allRecordNumbers = function() { return this.state.records.map(record => this.recordNumbers(record, this.monthContext(this.parseDate(record.date)))).sort((a, b) => a.date.localeCompare(b.date)); };
  app.renderPersonalRanking = function() { const records = this.allRecordNumbers(); if (!records.length) { this.$('personalRanking').innerHTML = '<div class="col-span-2 text-center text-sm text-slate-400 py-4">Registre seus dias para criar recordes pessoais.</div>'; return; } const bestNet = [...records].sort((a, b) => b.net - a.net)[0], bestRevenue = [...records].filter(record => record.km > 0).sort((a, b) => b.revenuePerKm - a.revenuePerKm)[0] || bestNet, weeks = new Map(); records.forEach(record => { const date = this.parseDate(record.date), monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7)); const key = this.dateKey(monday); weeks.set(key, (weeks.get(key) || 0) + record.net); }); const bestWeek = [...weeks.entries()].sort((a, b) => b[1] - a[1])[0], average = records.reduce((sum, record) => sum + record.net, 0) / records.length; let current = 0, longest = 0; records.forEach(record => { current = record.net >= average ? current + 1 : 0; longest = Math.max(longest, current); }); this.$('personalRanking').innerHTML = `<div class="record-metric"><span class="label-micro !text-amber-700">Melhor dia líquido</span><strong>${this.money(bestNet.net, 0)}</strong><span class="block text-[10px] text-slate-500 mt-1">${this.parseDate(bestNet.date).toLocaleDateString('pt-BR')}</span></div><div class="record-metric"><span class="label-micro !text-amber-700">Melhor receita/km</span><strong>${this.money(bestRevenue.revenuePerKm)}</strong><span class="block text-[10px] text-slate-500 mt-1">${this.integer(bestRevenue.km)} km</span></div><div class="record-metric"><span class="label-micro !text-amber-700">Melhor semana</span><strong>${this.money(bestWeek?.[1] || 0, 0)}</strong><span class="block text-[10px] text-slate-500 mt-1">líquido acumulado</span></div><div class="record-metric"><span class="label-micro !text-amber-700">Sequência acima da média</span><strong>${longest} dia(s)</strong><span class="block text-[10px] text-slate-500 mt-1">recorde pessoal</span></div>`; };

  app.monthSummary = function(month) { const reference = this.parseDate(`${month}-15`), context = this.monthContext(reference), records = this.state.records.filter(record => record.date.startsWith(month)).map(record => this.recordNumbers(record, context)), gross = records.reduce((sum, record) => sum + record.gross, 0), km = records.reduce((sum, record) => sum + record.km, 0), net = records.reduce((sum, record) => sum + record.net, 0), best = records.length ? [...records].sort((a, b) => b.net - a.net)[0] : null; return { month, records, gross, km, net, avgRevenueKm: km > 0 ? gross / km : 0, best }; };
  app.renderClosings = function() { const input = this.$('closingMonth'); if (!input.value) { const previous = new Date(); previous.setMonth(previous.getMonth() - 1); const previousKey = this.monthKey(previous); input.value = this.state.records.some(record => record.date.startsWith(previousKey)) ? previousKey : this.monthKey(); } const summary = this.monthSummary(input.value); this.$('closingSummary').innerHTML = summary.records.length ? `<div class="grid grid-cols-3 gap-3 text-center"><div class="bg-slate-50 rounded-2xl p-3"><span class="label-micro">Dias</span><strong>${summary.records.length}</strong></div><div class="bg-emerald-50 rounded-2xl p-3"><span class="label-micro !text-emerald-700">Líquido</span><strong class="text-emerald-600">${this.money(summary.net, 0)}</strong></div><div class="bg-blue-50 rounded-2xl p-3"><span class="label-micro !text-blue-700">Média/km</span><strong class="text-blue-600">${this.money(summary.avgRevenueKm)}</strong></div></div>` : '<p class="text-sm text-slate-400 text-center py-4">Nenhum dia registrado neste mês.</p>'; const sorted = [...this.state.closings].sort((a, b) => b.month.localeCompare(a.month)); this.$('closingList').innerHTML = sorted.length ? `<div class="pt-4 border-t border-slate-100"><span class="label-micro !text-vetta-900">Fechamentos salvos</span>${sorted.slice(0, 6).map(item => `<div class="flex justify-between py-2 text-xs"><span>${this.parseDate(`${item.month}-15`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span><strong>${this.money(item.net, 0)}</strong></div>`).join('')}</div>` : ''; };
  app.saveMonthlyClosing = function() { const month = this.$('closingMonth').value, summary = this.monthSummary(month); if (!summary.records.length) return this.toast('Não há registros para fechar neste mês.'); const item = { month, savedAt: new Date().toISOString(), targetProfit: this.state.targetProfit, gross: summary.gross, km: summary.km, net: summary.net, avgRevenueKm: summary.avgRevenueKm, days: summary.records.length, bestDay: summary.best ? { date: summary.best.date, net: summary.best.net } : null }, index = this.state.closings.findIndex(closing => closing.month === month); if (index >= 0) this.state.closings[index] = item; else this.state.closings.push(item); this.save(); this.renderClosings(); this.toast(index >= 0 ? 'Fechamento atualizado.' : 'Fechamento salvo neste aparelho.'); };
  app.shareSummary = async function() { const c = this.calculations(), week = this.weekContext(c), text = `VETTA — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}\nMeta líquida: ${this.money(this.state.targetProfit, 0)}\nLíquido realizado: ${this.money(c.actualNet, 0)}\nFaturamento: ${this.money(c.actualGross, 0)}\nRodagem: ${this.integer(c.actualKm)} km\nSemana: ${this.money(week.actual, 0)} de ${this.money(week.target, 0)}`; try { if (navigator.share) await navigator.share({ title: 'Resumo VETTA', text }); else { await navigator.clipboard.writeText(text); this.toast('Resumo copiado para compartilhar.'); } } catch (error) { if (error?.name !== 'AbortError') this.toast('Não foi possível compartilhar agora.'); } };

  const baseReset = app.reset;
  app.reset = function() { const closings = this.state.closings || []; baseReset.call(this); this.state.closings = closings; this.save(); };
  app.exportData = function() { const payload = { app: 'VETTA', version: 4, release: RELEASE, exportedAt: new Date().toISOString(), data: this.state }, blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `vetta-backup-${this.todayKey()}.json`; link.click(); URL.revokeObjectURL(url); this.toast('Backup exportado.'); };

  app.updateRegistration = null;
  app.refreshingForUpdate = false;
  app.setupPwa = function() {
    const button = this.$('installButton'); if (this.isStandalone()) button.classList.add('install-hidden'); if (this.isIos() && !this.isStandalone()) this.$('installButtonLabel').textContent = 'Instalar no iPhone';
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); this.deferredPrompt = event; button.classList.remove('install-hidden'); });
    window.addEventListener('appinstalled', () => { button.classList.add('install-hidden'); this.toast('VETTA instalado com sucesso.'); });
    if ('serviceWorker' in navigator) window.addEventListener('load', async () => { try { const registration = await navigator.serviceWorker.register('./sw.js'); this.updateRegistration = registration; if (registration.waiting && navigator.serviceWorker.controller) this.showUpdateBanner(); registration.addEventListener('updatefound', () => { const worker = registration.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) this.showUpdateBanner(); }); }); navigator.serviceWorker.addEventListener('controllerchange', () => { if (this.refreshingForUpdate) return; this.refreshingForUpdate = true; location.reload(); }); } catch (error) { console.warn('Service worker não registrado', error); } });
  };
  app.showUpdateBanner = function() { this.$('updateVersionText').textContent = `VETTA ${RELEASE} está pronto`; this.$('updateBanner').classList.remove('hidden'); };
  app.applyUpdate = function() { const worker = this.updateRegistration?.waiting; if (worker) worker.postMessage({ type: 'SKIP_WAITING' }); else location.reload(); };
})();
(() => {
  const RELEASE = APP_RELEASE;
  const MONTHLY_GROSS_CEILING = 18000;

  defaults.version = 5;
  defaults.release = RELEASE;

  const injectGoalUi = () => {
    const slider = document.querySelector('input[data-model="targetProfit"]');
    if (!slider) return;

    slider.min = '0';
    slider.max = String(MONTHLY_GROSS_CEILING);
    slider.step = '100';
    slider.setAttribute('aria-label', 'Meta mensal líquida');

    if (!document.getElementById('goalBalancePanel')) {
      slider.insertAdjacentHTML('afterend', `
        <div id="goalBalancePanel" class="mt-1 mb-7 rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl bg-emerald-50 p-3">
              <span class="label-micro !text-emerald-700">Já abatido da meta</span>
              <strong id="goalAchieved" class="block text-lg text-emerald-600 tabular">R$ 0</strong>
            </div>
            <div class="rounded-xl bg-blue-50 p-3 text-right">
              <span class="label-micro !text-blue-700">Saldo líquido restante</span>
              <strong id="goalRemaining" class="block text-lg text-blue-600 tabular">R$ 0</strong>
            </div>
          </div>
          <div class="progress-track mt-4"><div id="goalNetProgress" class="progress-fill" style="width:0%"></div></div>
          <div class="flex justify-between gap-3 mt-3 text-[10px] text-slate-500">
            <span id="goalProgressCaption">Nenhum dia abatido ainda.</span>
            <strong id="goalGrossPlan" class="text-slate-700 text-right">Bruto: R$ 0</strong>
          </div>
          <p id="goalCapHelp" class="text-[10px] text-slate-400 leading-relaxed mt-3"></p>
        </div>`);
      slider.classList.remove('mb-7');
    }
  };

  injectGoalUi();

  const baseNormalizeState = app.normalizeState;
  app.normalizeState = function(value) {
    const normalized = baseNormalizeState.call(this, value);
    normalized.version = 5;
    normalized.release = RELEASE;
    return normalized;
  };

  app.grossCeilingContext = function() {
    const costs = this.costContext();
    const revenueKm = Math.max(0.01, this.number(this.state.revenueKm));
    const contributionKm = Math.max(0.01, revenueKm - this.fuelCostKm() - costs.perKm);
    const maximumContribution = MONTHLY_GROSS_CEILING * (contributionKm / revenueKm);
    const rawMaximumTarget = maximumContribution - costs.monthlyFixed;
    const maximumTarget = Math.max(0, Math.floor(rawMaximumTarget / 100) * 100);
    const costsExceedCeiling = rawMaximumTarget < 0;
    return { costs, revenueKm, contributionKm, maximumContribution, rawMaximumTarget, maximumTarget, costsExceedCeiling };
  };

  app.enforceGrossCeiling = function() {
    const slider = document.querySelector('input[data-model="targetProfit"]');
    const ceiling = this.grossCeilingContext();
    const sliderMinimum = ceiling.maximumTarget >= 500 ? 500 : 0;
    const sliderMaximum = Math.max(sliderMinimum, ceiling.maximumTarget);

    if (slider) {
      slider.min = String(sliderMinimum);
      slider.max = String(sliderMaximum);
      slider.step = '100';
    }

    if (this.state.targetProfit > ceiling.maximumTarget) {
      const previousTarget = this.state.targetProfit;
      this.state.targetProfit = ceiling.maximumTarget;
      this.save();
      const adjustmentKey = `${previousTarget}:${ceiling.maximumTarget}`;
      if (this._lastGrossCeilingAdjustment !== adjustmentKey) {
        this._lastGrossCeilingAdjustment = adjustmentKey;
        setTimeout(() => this.toast(`Meta ajustada para ${this.money(ceiling.maximumTarget, 0)} líquidos, respeitando o teto de ${this.money(MONTHLY_GROSS_CEILING, 0)} bruto.`), 80);
      }
    }

    if (this.state.targetProfit < sliderMinimum) {
      this.state.targetProfit = sliderMinimum;
      this.save();
    }

    return ceiling;
  };

  app.renderGoalBalance = function(calculation, ceiling) {
    const achieved = Math.max(0, Math.min(this.state.targetProfit, calculation.actualNet));
    const remaining = Math.max(0, this.state.targetProfit - calculation.actualNet);
    const progress = this.state.targetProfit > 0 ? this.clamp(achieved / this.state.targetProfit * 100, 0, 100) : 0;

    this.$('goalAchieved').textContent = this.money(achieved, 0);
    this.$('goalRemaining').textContent = this.money(remaining, 0);
    this.$('goalNetProgress').style.width = `${progress}%`;
    this.$('goalProgressCaption').textContent = calculation.records.length
      ? `${calculation.records.length} dia(s) registrado(s) reduziram o saldo da meta.`
      : 'Nenhum dia abatido ainda.';
    this.$('goalGrossPlan').textContent = `Bruto planejado: ${this.money(calculation.totalGross, 0)} / ${this.money(MONTHLY_GROSS_CEILING, 0)}`;

    if (ceiling.costsExceedCeiling) {
      this.$('goalCapHelp').textContent = `Seus custos atuais ultrapassam o teto de ${this.money(MONTHLY_GROSS_CEILING, 0)} bruto mesmo sem lucro. Reduza custos ou aumente a receita por km.`;
      this.$('goalCapHelp').className = 'text-[10px] text-red-500 leading-relaxed mt-3';
    } else {
      this.$('goalCapHelp').textContent = `Os dias abatem somente o líquido estimado após combustível e custos. O slider ajusta a meta líquida; com seus custos atuais, o máximo é ${this.money(ceiling.maximumTarget, 0)} líquidos para não passar de ${this.money(MONTHLY_GROSS_CEILING, 0)} bruto.`;
      this.$('goalCapHelp').className = 'text-[10px] text-slate-400 leading-relaxed mt-3';
    }

    if (calculation.records.length) {
      const existingText = this.$('monthStatusText').textContent;
      this.$('monthStatusText').textContent = `${this.money(achieved, 0)} líquidos já foram abatidos; faltam ${this.money(remaining, 0)}. ${existingText}`;
    }
  };

  const baseRender = app.render;
  app.render = function() {
    const ceiling = this.enforceGrossCeiling();
    baseRender.call(this);
    const calculation = this.calculations();
    this.renderGoalBalance(calculation, ceiling);
    if (this.$('appVersionLabel')) this.$('appVersionLabel').textContent = `Versão ${RELEASE}`;
  };

  const baseToast = app.toast;
  app.toast = function(message) {
    if (message === 'Dia salvo e meta recalculada.' || message === 'Dia atualizado.') {
      const calculation = this.calculations();
      const remaining = Math.max(0, this.state.targetProfit - calculation.actualNet);
      message = `${message === 'Dia atualizado.' ? 'Dia atualizado.' : 'Dia salvo.'} Saldo da meta: ${this.money(remaining, 0)} líquidos.`;
    }
    return baseToast.call(this, message);
  };

  app.showUpdateBanner = function() {
    this.$('updateVersionText').textContent = `VETTA ${RELEASE} está pronto`;
    this.$('updateBanner').classList.remove('hidden');
  };
})();
(() => {
  const RELEASE = APP_RELEASE;

  defaults.version = 6;
  defaults.release = RELEASE;

  const simplifyGoalUi = () => {
    const panel = document.getElementById('goalBalancePanel');
    if (!panel) return;
    const achievedLabel = panel.querySelector('#goalAchieved')?.previousElementSibling;
    const remainingLabel = panel.querySelector('#goalRemaining')?.previousElementSibling;
    if (achievedLabel) achievedLabel.textContent = 'Conquistado no mês';
    if (remainingLabel) remainingLabel.textContent = 'Falta para a meta';
    document.getElementById('goalGrossPlan')?.remove();
    document.getElementById('goalCapHelp')?.remove();
    const caption = document.getElementById('goalProgressCaption');
    if (caption) caption.parentElement.className = 'mt-3 text-[10px] text-slate-500';
  };

  simplifyGoalUi();

  const baseNormalizeState = app.normalizeState;
  app.normalizeState = function(value) {
    const normalized = baseNormalizeState.call(this, value);
    normalized.version = 6;
    normalized.release = RELEASE;
    return normalized;
  };

  app.enforceGrossCeiling = function() {
    const slider = document.querySelector('input[data-model="targetProfit"]');
    const ceiling = this.grossCeilingContext();
    const sliderMinimum = ceiling.maximumTarget >= 500 ? 500 : 0;
    const sliderMaximum = Math.max(sliderMinimum, ceiling.maximumTarget);
    if (slider) {
      slider.min = String(sliderMinimum);
      slider.max = String(sliderMaximum);
      slider.step = '100';
    }
    if (this.state.targetProfit > ceiling.maximumTarget) {
      this.state.targetProfit = ceiling.maximumTarget;
      this.save();
    }
    if (this.state.targetProfit < sliderMinimum) {
      this.state.targetProfit = sliderMinimum;
      this.save();
    }
    return ceiling;
  };

  app.renderGoalBalance = function(calculation) {
    const achieved = Math.max(0, Math.min(this.state.targetProfit, calculation.actualNet));
    const remaining = Math.max(0, this.state.targetProfit - calculation.actualNet);
    const progress = this.state.targetProfit > 0 ? this.clamp(achieved / this.state.targetProfit * 100, 0, 100) : 0;
    this.$('goalAchieved').textContent = this.money(achieved, 0);
    this.$('goalRemaining').textContent = this.money(remaining, 0);
    this.$('goalNetProgress').style.width = `${progress}%`;
    this.$('goalProgressCaption').textContent = calculation.records.length
      ? `${this.money(achieved, 0)} de ${this.money(this.state.targetProfit, 0)} líquidos conquistados em ${calculation.records.length} dia(s).`
      : `Meta mensal: ${this.money(this.state.targetProfit, 0)} líquidos.`;
    if (calculation.records.length) {
      this.$('monthStatusText').textContent = remaining > 0
        ? `Você acumulou ${this.money(achieved, 0)} líquidos no mês. Ainda faltam ${this.money(remaining, 0)} para concluir a meta.`
        : `Meta mensal concluída. Você já acumulou ${this.money(calculation.actualNet, 0)} líquidos.`;
    }
  };

  const baseToast = app.toast;
  app.toast = function(message) {
    if (message === 'Dia salvo e meta recalculada.' || message === 'Dia atualizado.' || /^Dia salvo\. Saldo da meta:/.test(message)) {
      message = message.startsWith('Dia atualizado') ? 'Dia atualizado. O progresso do mês foi recalculado.' : 'Dia salvo. O progresso do mês foi atualizado.';
    }
    return baseToast.call(this, message);
  };

  app.showUpdateBanner = function() {
    this.$('updateBanner')?.classList.add('hidden');
    this.applyUpdate();
  };

  const baseRender = app.render;
  app.render = function() {
    baseRender.call(this);
    simplifyGoalUi();
    if (this.$('appVersionLabel')) this.$('appVersionLabel').textContent = `Versão ${RELEASE}`;
  };
})();


const CURRENT_STATE_VERSION = 10;
const OBSOLETE_STORAGE_KEYS = ['vetta-driver-intelligence-v2', 'vetta-state'];

const cleanCurrentCost = cost => {
  const technicalName = /custos?\s+fixos?\s+(migrados?|iniciais?)/i.test(cost?.name || '');
  const technicalId = ['fixed-migrated', 'fixed-default'].includes(cost?.id);
  return {
    ...cost,
    name: technicalName || technicalId ? 'Outros custos mensais' : cost.name,
    legacySource: false
  };
};

const normalizeCurrentState = app.normalizeState;
app.normalizeState = function(value) {
  const normalized = normalizeCurrentState.call(this, value);
  normalized.costs = Array.isArray(normalized.costs) ? normalized.costs.map(cleanCurrentCost) : [];
  normalized.closings = Array.isArray(normalized.closings) ? normalized.closings : [];
  delete normalized.migrationNotice;
  normalized.version = CURRENT_STATE_VERSION;
  normalized.release = APP_RELEASE;
  return normalized;
};

const migrateCurrentState = app.migrateLegacy;
app.migrateLegacy = function(value) {
  return this.normalizeState(migrateCurrentState.call(this, value));
};

const renderCurrentRelease = app.render;
app.render = function() {
  renderCurrentRelease.call(this);
  const label = this.$('appVersionLabel');
  if (label) label.textContent = `Versão ${APP_RELEASE}`;
};

const initCurrentRelease = app.init;
app.init = function() {
  initCurrentRelease.call(this);
  OBSOLETE_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  this.state = this.normalizeState(this.state || this.cloneDefaults());
  this.save();
  this.render();
};

window.__vettaApp = app;
app.init();

(() => {
  const app = window.__vettaApp;
  if (!app) return;

  // Durante o refinamento esta trava fica desligada para acelerar testes.
  // No lançamento comercial, a mesma camada será ativada antes do onboarding.
  const INSTALL_GATE_ENFORCED = false;
  const DEFAULT_REVENUE_KM = 2.25;
  const DEFAULT_MAINTENANCE_KM = 0.18;

  const ENERGY_PRESETS = {
    gnv: { type: 'gnv', label: 'GNV', unit: 'm³', price: 4.79, efficiency: 13.2 },
    gasoline: { type: 'gasoline', label: 'Gasolina', unit: 'L', price: 6.19, efficiency: 10.5 },
    ethanol: { type: 'ethanol', label: 'Etanol', unit: 'L', price: 4.29, efficiency: 7.4 },
    diesel: { type: 'diesel', label: 'Diesel', unit: 'L', price: 6.09, efficiency: 11.5 },
    electric: { type: 'electric', label: 'Elétrico', unit: 'kWh', price: 2, efficiency: 6 },
    custom: { type: 'custom', label: 'Personalizado', unit: 'un.', price: 5, efficiency: 10 }
  };

  const qs = id => document.getElementById(id);
  const number = value => app.number(value);
  const weekdayName = day => ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][Number(day)] || '';

  const installElectricSupport = () => {
    const fuelType = qs('fuelType');
    if (fuelType && !fuelType.querySelector('option[value="electric"]')) {
      const option = document.createElement('option');
      option.value = 'electric';
      option.textContent = 'Elétrico';
      const custom = fuelType.querySelector('option[value="custom"]');
      fuelType.insertBefore(option, custom || null);
    }

    const baseSyncInputs = app.syncInputs;
    app.syncInputs = function(...args) {
      const result = baseSyncInputs.apply(this, args);
      if (this.state?.fuel?.type === 'electric' && fuelType) fuelType.value = 'electric';
      return result;
    };

    app.changeFuelType = function(type) {
      const preset = ENERGY_PRESETS[type] || ENERGY_PRESETS.custom;
      this.state.fuel = { ...preset };
      this.save();
      this.syncInputs();
      this.render();
    };

    app.updateFuelFromForm = function() {
      const type = this.$('fuelType').value;
      const preset = ENERGY_PRESETS[type] || ENERGY_PRESETS.custom;
      this.state.fuel = {
        type,
        label: type === 'custom' ? (this.$('fuelLabel').value.trim() || 'Personalizado') : preset.label,
        unit: preset.unit,
        price: this.number(this.$('fuelPrice').value),
        efficiency: this.number(this.$('fuelEfficiency').value)
      };
      this.save();
      this.syncFuelLabels();
      this.render();
    };

    app.syncInputs();
  };

  const setupInstallGateFoundation = () => {
    document.documentElement.dataset.faroInstallGate = INSTALL_GATE_ENFORCED ? 'obrigatorio' : 'liberado-para-testes';
    if (!INSTALL_GATE_ENFORCED || app.isStandalone()) return;

    const gate = document.createElement('div');
    gate.id = 'faroInstallGate';
    gate.className = 'modal-backdrop';
    gate.innerHTML = `
      <div class="modal-sheet">
        <div class="faro-install-mark"><img src="./faro-mark.svg" alt=""></div>
        <span class="label-micro !text-blue-600">Primeiro passo</span>
        <h2 class="text-2xl font-extrabold mt-2">Instale o FARO</h2>
        <p class="text-sm text-slate-500 mt-3 leading-relaxed">O FARO funciona como aplicativo no seu celular e continua disponível para sua rotina mesmo quando a conexão oscila.</p>
        <button id="faroInstallGateButton" class="w-full mt-6 py-4 rounded-2xl bg-blue-600 text-white font-extrabold">INSTALAR FARO</button>
        <p id="faroInstallGateHelp" class="text-xs text-slate-500 mt-4 text-center"></p>
      </div>`;
    document.body.appendChild(gate);

    const help = qs('faroInstallGateHelp');
    const button = qs('faroInstallGateButton');
    if (app.isIos()) {
      help.textContent = 'No iPhone: abra no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Depois abra o FARO pelo novo ícone.';
      button.textContent = 'COMO INSTALAR NO IPHONE';
    }

    button.addEventListener('click', async () => {
      if (app.isIos()) {
        help.classList.add('font-bold', 'text-blue-700');
        return;
      }
      await app.install();
      help.textContent = 'Quando a instalação terminar, abra o FARO pelo ícone criado no celular.';
    });
    window.addEventListener('appinstalled', () => {
      qs('faroInstallGate')?.classList.add('hidden');
      setTimeout(() => location.reload(), 250);
    });
  };

  const injectStyles = () => {
    if (qs('faroOnboardingStyles')) return;
    const style = document.createElement('style');
    style.id = 'faroOnboardingStyles';
    style.textContent = `
      #onboardingModal .onboarding-sheet{max-height:min(92dvh,780px);overflow:auto}
      #onboardingModal .faro-ob-card{border:1px solid #e2e8f0;border-radius:18px;padding:14px;background:#fff}
      #onboardingModal .faro-ob-choice{min-height:48px;border:1px solid #e2e8f0;border-radius:15px;padding:10px 12px;font-size:12px;font-weight:800;color:#475569;background:#fff}
      #onboardingModal .faro-ob-choice.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8;box-shadow:0 0 0 1px #2563eb inset}
      #onboardingModal .faro-ob-helper{font-size:11px;line-height:1.45;color:#64748b}
      #onboardingModal .faro-ob-estimate{display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:#fff7ed;color:#c2410c;padding:6px 9px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
      #onboardingModal .faro-target-number{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#0b1121;color:white;border-radius:20px;padding:16px}
      #onboardingModal .faro-target-number input{width:128px;background:transparent;color:white;font-size:26px;font-weight:900;text-align:right;outline:none}
      #onboardingModal input[type="range"]{accent-color:#2563eb}
      #onboardingModal .faro-processing-mark{width:86px;height:86px;border-radius:28px;background:#eff6ff;display:grid;place-items:center;margin:12px auto 20px;animation:faroSniff 1s ease-in-out infinite}
      #onboardingModal .faro-processing-mark img{width:64px;height:64px;object-fit:contain}
      #onboardingModal .faro-processing-dots{display:flex;justify-content:center;gap:7px;margin-top:18px}
      #onboardingModal .faro-processing-dots span{width:7px;height:7px;border-radius:50%;background:#93c5fd;animation:faroDot 1s infinite}
      #onboardingModal .faro-processing-dots span:nth-child(2){animation-delay:.15s}
      #onboardingModal .faro-processing-dots span:nth-child(3){animation-delay:.3s}
      #onboardingModal .faro-plan-hero{background:linear-gradient(145deg,#0b1121,#172554);color:white;border-radius:24px;padding:20px}
      #onboardingModal .faro-plan-value{font-size:42px;font-weight:900;letter-spacing:-.05em;line-height:1}
      #onboardingModal .faro-plan-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #onboardingModal .faro-plan-metric{background:#f8fafc;border-radius:16px;padding:13px}
      #faroInstallGate .faro-install-mark{width:70px;height:70px;border-radius:22px;background:#eff6ff;display:grid;place-items:center;margin-bottom:18px}
      #faroInstallGate .faro-install-mark img{width:54px;height:54px}
      @keyframes faroSniff{0%,100%{transform:translateY(0) rotate(0)}45%{transform:translateY(-4px) rotate(-2deg)}70%{transform:translateY(1px) rotate(2deg)}}
      @keyframes faroDot{0%,70%,100%{opacity:.35;transform:scale(.8)}35%{opacity:1;transform:scale(1.15)}}
      @media (prefers-reduced-motion:reduce){#onboardingModal .faro-processing-mark,#onboardingModal .faro-processing-dots span{animation:none}}
    `;
    document.head.appendChild(style);
  };

  installElectricSupport();
  setupInstallGateFoundation();
  injectStyles();

  const modal = qs('onboardingModal');
  if (!modal || app.state.onboardingComplete) return;

  const initialFuel = ENERGY_PRESETS[app.state.fuel?.type] || ENERGY_PRESETS.gnv;
  const initialVehicle = app.state.onboardingProfile?.vehicle || 'own';
  const draft = {
    days: app.state.workWeekdays?.length || 6,
    vehicle: initialVehicle,
    target: Number(app.state.targetProfit) || 4000,
    energy: initialFuel.type,
    energyPrice: Number(app.state.fuel?.price) || initialFuel.price,
    energyEfficiency: Number(app.state.fuel?.efficiency) || initialFuel.efficiency,
    rentalWeekly: 0,
    rentalDueWeekday: 5,
    financeMonthly: 0,
    financeDueDay: 10,
    otherMonthly: 0,
    maintenanceKm: initialVehicle === 'rented' ? 0 : DEFAULT_MAINTENANCE_KM,
    revenueKm: Number(app.state.revenueKm) || DEFAULT_REVENUE_KM,
    revenueEstimated: true,
    maintenanceEstimated: initialVehicle !== 'rented'
  };

  modal.innerHTML = `
    <div class="modal-sheet onboarding-sheet">
      <div id="faroOnboardingHeader">
        <div class="flex justify-between items-center gap-4">
          <div>
            <span class="label-micro !text-blue-600">Primeira configuração</span>
            <h3 id="faroOnboardingTitle" class="text-2xl font-extrabold">Como você trabalha?</h3>
          </div>
          <span id="faroOnboardingProgress" class="text-xs font-extrabold text-slate-400">1/5</span>
        </div>
        <div class="progress-track mt-4"><div id="faroOnboardingBar" class="progress-fill" style="width:20%"></div></div>
      </div>

      <div id="faroOnboardingBody" class="mt-6">
        <section data-faro-step="1" class="space-y-5">
          <div>
            <p class="text-sm text-slate-500 leading-relaxed">O FARO usa sua rotina real para transformar a meta do mês em uma semana possível de executar.</p>
          </div>
          <div>
            <label class="label-micro">Quantos dias por semana você pretende rodar?</label>
            <div class="grid grid-cols-3 gap-2">
              <button type="button" data-faro-days="5" class="faro-ob-choice">5 dias</button>
              <button type="button" data-faro-days="6" class="faro-ob-choice">6 dias</button>
              <button type="button" data-faro-days="7" class="faro-ob-choice">7 dias</button>
            </div>
          </div>
          <div>
            <label class="label-micro">Seu carro é...</label>
            <div class="grid grid-cols-3 gap-2">
              <button type="button" data-faro-vehicle="own" class="faro-ob-choice">Próprio</button>
              <button type="button" data-faro-vehicle="financed" class="faro-ob-choice">Financiado</button>
              <button type="button" data-faro-vehicle="rented" class="faro-ob-choice">Alugado</button>
            </div>
            <p class="faro-ob-helper mt-2">Perguntamos isso porque aluguel e parcela mudam o dinheiro que realmente precisa sair da pista.</p>
          </div>
        </section>

        <section data-faro-step="2" class="hidden space-y-5">
          <div>
            <p class="text-sm text-slate-500 leading-relaxed">Quanto você quer que <strong class="text-slate-700">sobre no seu bolso</strong> ao final do mês?</p>
          </div>
          <div class="faro-target-number">
            <div><span class="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold">Objetivo líquido</span><strong class="block mt-1">R$ por mês</strong></div>
            <input id="faroOnboardingTargetNumber" type="number" min="500" max="50000" step="100" inputmode="numeric" aria-label="Objetivo líquido mensal">
          </div>
          <input id="faroOnboardingTargetSlider" type="range" min="500" max="20000" step="100" class="w-full">
          <div class="flex justify-between text-[10px] text-slate-400 font-bold"><span>R$ 500</span><span>R$ 20 mil</span></div>
          <p class="faro-ob-helper">O slider continua sendo o jeito rápido de ajustar. O número também pode ser tocado e digitado para precisão.</p>
        </section>

        <section data-faro-step="3" class="hidden space-y-5">
          <p class="text-sm text-slate-500 leading-relaxed">Agora calculamos quanto custa gerar cada quilômetro da sua operação.</p>
          <div>
            <label class="label-micro">Energia principal do carro</label>
            <select id="faroOnboardingEnergy" class="input-vetta">
              <option value="gnv">GNV</option>
              <option value="gasoline">Gasolina</option>
              <option value="ethanol">Etanol</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Elétrico</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label id="faroEnergyPriceLabel" class="label-micro">Preço por unidade</label>
              <input id="faroOnboardingEnergyPrice" type="number" step=".01" min="0" inputmode="decimal" class="input-vetta no-mask">
              <p id="faroEnergyPriceHint" class="faro-ob-helper mt-1"></p>
            </div>
            <div>
              <label id="faroEnergyEfficiencyLabel" class="label-micro">Rendimento</label>
              <input id="faroOnboardingEnergyEfficiency" type="number" step=".1" min="0" inputmode="decimal" class="input-vetta no-mask">
              <p id="faroEnergyEfficiencyHint" class="faro-ob-helper mt-1"></p>
            </div>
          </div>
          <div id="faroEnergyCostPreview" class="faro-ob-card bg-blue-50 border-blue-100 text-blue-800 text-sm font-bold"></div>
        </section>

        <section data-faro-step="4" class="hidden space-y-5">
          <div>
            <p class="text-sm text-slate-500 leading-relaxed">Isso evita que o FARO confunda faturamento com dinheiro que realmente sobra.</p>
          </div>

          <div id="faroRentalFields" class="hidden faro-ob-card space-y-4">
            <div>
              <span class="label-micro !text-blue-600">Carro alugado</span>
              <strong class="block">Aluguel semanal</strong>
            </div>
            <div class="input-wrapper"><span>R$</span><input id="faroRentalWeekly" type="number" step=".01" min="0" inputmode="decimal" class="input-vetta"></div>
            <div>
              <label class="label-micro">Que dia normalmente vence?</label>
              <select id="faroRentalDueWeekday" class="input-vetta">
                <option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option>
                <option value="4">Quinta</option><option value="5">Sexta</option><option value="6">Sábado</option><option value="0">Domingo</option>
              </select>
            </div>
          </div>

          <div id="faroFinanceFields" class="hidden faro-ob-card space-y-4">
            <div>
              <span class="label-micro !text-blue-600">Carro financiado</span>
              <strong class="block">Parcela mensal</strong>
            </div>
            <div class="input-wrapper"><span>R$</span><input id="faroFinanceMonthly" type="number" step=".01" min="0" inputmode="decimal" class="input-vetta"></div>
            <div>
              <label class="label-micro">Dia do vencimento</label>
              <input id="faroFinanceDueDay" type="number" min="1" max="31" inputmode="numeric" class="input-vetta no-mask">
            </div>
          </div>

          <div>
            <label class="label-micro">Outros custos fixos do trabalho por mês</label>
            <div class="input-wrapper"><span>R$</span><input id="faroOtherMonthly" type="number" step=".01" min="0" inputmode="decimal" class="input-vetta"></div>
            <p class="faro-ob-helper mt-1">Seguro, internet, estacionamento ou outro compromisso da operação. Se não tiver, deixe zero. Você poderá detalhar depois.</p>
          </div>

          <div id="faroMaintenanceWrap">
            <div class="flex justify-between items-center gap-3">
              <label class="label-micro !mb-0">Reserva de manutenção por km</label>
              <span id="faroMaintenanceEstimateBadge" class="faro-ob-estimate">estimativa do FARO</span>
            </div>
            <div class="input-wrapper mt-2"><span>R$</span><input id="faroMaintenanceKm" type="number" step=".01" min="0" inputmode="decimal" class="input-vetta"></div>
            <p id="faroMaintenanceHelp" class="faro-ob-helper mt-1">Começamos com R$ 0,18/km como estimativa. Ajuste se já souber seu valor.</p>
          </div>
        </section>

        <section data-faro-step="5" class="hidden space-y-5">
          <div>
            <p class="text-sm text-slate-500 leading-relaxed">Só falta uma referência para estimar a rodagem necessária. Se você ainda não souber, tudo bem.</p>
          </div>
          <div class="flex justify-between items-center gap-3">
            <label class="label-micro !mb-0">Quanto costuma faturar por km?</label>
            <span id="faroRevenueEstimateBadge" class="faro-ob-estimate">estimativa inicial</span>
          </div>
          <div class="input-wrapper"><span>R$</span><input id="faroOnboardingRevenue" type="number" step=".01" min=".1" inputmode="decimal" class="input-vetta"></div>
          <p class="faro-ob-helper">Se mantiver a sugestão, o FARO vai deixar claro que a rodagem é uma estimativa até aprender com seus registros.</p>
          <div class="faro-ob-card bg-slate-50">
            <strong class="text-sm">O que acontece agora?</strong>
            <p class="faro-ob-helper mt-1">Vamos juntar meta, dias, energia e custos para montar seu primeiro plano. Nada disso fica escondido: depois você pode ajustar tudo em Planejar.</p>
          </div>
        </section>

        <section data-faro-step="processing" class="hidden text-center py-4">
          <div class="faro-processing-mark" data-mascot-slot="future"><img src="./faro-mark.svg" alt=""></div>
          <span class="label-micro !text-blue-600">FARO trabalhando</span>
          <h3 class="text-2xl font-extrabold mt-2">Farejando sua operação...</h3>
          <p id="faroProcessingText" class="text-sm text-slate-500 mt-3">Juntando sua meta, dias e custos.</p>
          <div class="faro-processing-dots"><span></span><span></span><span></span></div>
        </section>

        <section data-faro-step="result" class="hidden space-y-5">
          <div>
            <span id="faroPlanStatusBadge" class="faro-ob-estimate">estimativa inicial</span>
            <h3 class="text-2xl font-extrabold mt-3">Seu primeiro plano está pronto.</h3>
            <p id="faroPlanExplanation" class="text-sm text-slate-500 mt-2 leading-relaxed"></p>
          </div>
          <div class="faro-plan-hero">
            <span class="text-[10px] uppercase tracking-widest text-blue-200 font-extrabold">Faturamento necessário por dia</span>
            <strong id="faroPlanDailyGross" class="faro-plan-value block mt-2">R$ 0</strong>
            <p id="faroPlanDailyHint" class="text-xs text-slate-300 mt-3"></p>
          </div>
          <div class="faro-plan-grid">
            <div class="faro-plan-metric"><span class="label-micro">Dias planejados</span><strong id="faroPlanDays" class="text-lg">0</strong></div>
            <div class="faro-plan-metric"><span class="label-micro">Rodagem estimada/dia</span><strong id="faroPlanKm" class="text-lg">0 km</strong></div>
            <div class="faro-plan-metric"><span class="label-micro">Energia por km</span><strong id="faroPlanEnergyKm" class="text-lg">R$ 0</strong></div>
            <div class="faro-plan-metric"><span class="label-micro">Ritmo semanal</span><strong id="faroPlanWeek" class="text-lg">R$ 0</strong></div>
          </div>
          <div id="faroPlanEstimateNote" class="rounded-2xl bg-amber-50 text-amber-800 p-4 text-xs leading-relaxed"></div>
        </section>
      </div>

      <div id="faroOnboardingActions" class="grid grid-cols-2 gap-3 mt-6">
        <button id="faroOnboardingBack" type="button" class="py-4 rounded-2xl bg-slate-100 text-slate-600 font-extrabold invisible">Voltar</button>
        <button id="faroOnboardingNext" type="button" class="py-4 rounded-2xl bg-blue-600 text-white font-extrabold">Continuar</button>
      </div>
      <button id="faroOnboardingFinish" type="button" class="hidden w-full mt-5 py-4 rounded-2xl bg-blue-600 text-white font-extrabold">IR PARA O FARO</button>
    </div>`;

  app.onboardingStep = 1;

  const steps = [...modal.querySelectorAll('[data-faro-step]')];
  const title = qs('faroOnboardingTitle');
  const progress = qs('faroOnboardingProgress');
  const bar = qs('faroOnboardingBar');
  const back = qs('faroOnboardingBack');
  const next = qs('faroOnboardingNext');
  const actions = qs('faroOnboardingActions');
  const finish = qs('faroOnboardingFinish');

  const titles = [
    'Como você trabalha?',
    'Quanto quer que sobre?',
    'Como seu carro roda?',
    'Quais custos entram na conta?',
    'Só falta uma referência'
  ];

  const selectButtons = (selector, value, dataKey) => {
    modal.querySelectorAll(selector).forEach(button => {
      button.classList.toggle('active', String(button.dataset[dataKey]) === String(value));
    });
  };

  const syncTarget = value => {
    draft.target = Math.max(500, number(value) || 500);
    qs('faroOnboardingTargetNumber').value = draft.target;
    qs('faroOnboardingTargetSlider').value = Math.min(20000, draft.target);
  };

  const syncEnergy = (type, resetValues = false) => {
    const preset = ENERGY_PRESETS[type] || ENERGY_PRESETS.gnv;
    draft.energy = preset.type;
    if (resetValues) {
      draft.energyPrice = preset.price;
      draft.energyEfficiency = preset.efficiency;
    }
    qs('faroOnboardingEnergy').value = draft.energy;
    qs('faroOnboardingEnergyPrice').value = draft.energyPrice;
    qs('faroOnboardingEnergyEfficiency').value = draft.energyEfficiency;
    qs('faroEnergyPriceLabel').textContent = draft.energy === 'electric' ? 'Preço por kWh' : `Preço por ${preset.unit}`;
    qs('faroEnergyEfficiencyLabel').textContent = draft.energy === 'electric' ? 'Rendimento em km/kWh' : `Rendimento em km/${preset.unit}`;
    qs('faroEnergyPriceHint').textContent = draft.energy === 'electric' ? 'Use o preço médio que você realmente paga para recarregar.' : `Valor médio de 1 ${preset.unit}.`;
    qs('faroEnergyEfficiencyHint').textContent = draft.energy === 'electric' ? 'Quantos km o carro roda com 1 kWh.' : `Quantos km o carro roda com 1 ${preset.unit}.`;
    renderEnergyCost();
  };

  const renderEnergyCost = () => {
    draft.energyPrice = number(qs('faroOnboardingEnergyPrice')?.value);
    draft.energyEfficiency = number(qs('faroOnboardingEnergyEfficiency')?.value);
    const cost = draft.energyEfficiency > 0 ? draft.energyPrice / draft.energyEfficiency : 0;
    const preview = qs('faroEnergyCostPreview');
    if (preview) preview.textContent = cost > 0
      ? `Custo de energia estimado: ${app.money(cost)}/km.`
      : 'Preencha preço e rendimento para calcular o custo por km.';
  };

  const syncVehicleFields = () => {
    qs('faroRentalFields').classList.toggle('hidden', draft.vehicle !== 'rented');
    qs('faroFinanceFields').classList.toggle('hidden', draft.vehicle !== 'financed');
    const maintenance = qs('faroMaintenanceKm');
    const help = qs('faroMaintenanceHelp');
    const badge = qs('faroMaintenanceEstimateBadge');

    if (draft.vehicle === 'rented' && draft.maintenanceEstimated) {
      draft.maintenanceKm = 0;
      draft.maintenanceEstimated = false;
    } else if (draft.vehicle !== 'rented' && draft.maintenanceKm === 0 && !draft.maintenanceEstimated) {
      draft.maintenanceKm = DEFAULT_MAINTENANCE_KM;
      draft.maintenanceEstimated = true;
    }

    maintenance.value = draft.maintenanceKm;
    if (draft.vehicle === 'rented') {
      help.textContent = 'Se a locadora já cobre manutenção do veículo, pode deixar zero.';
      badge.classList.add('hidden');
    } else {
      help.textContent = draft.maintenanceEstimated
        ? 'Começamos com R$ 0,18/km como estimativa. Ajuste se já souber seu valor.'
        : 'Este valor será reservado a cada km rodado.';
      badge.classList.toggle('hidden', !draft.maintenanceEstimated);
    }
  };

  const renderStep = () => {
    steps.forEach(section => section.classList.toggle('hidden', section.dataset.faroStep !== String(app.onboardingStep)));
    if (app.onboardingStep >= 1 && app.onboardingStep <= 5) {
      title.textContent = titles[app.onboardingStep - 1];
      progress.textContent = `${app.onboardingStep}/5`;
      bar.style.width = `${app.onboardingStep * 20}%`;
      back.classList.toggle('invisible', app.onboardingStep === 1);
      next.textContent = app.onboardingStep === 5 ? 'Montar meu plano' : 'Continuar';
      actions.classList.remove('hidden');
      finish.classList.add('hidden');
    }
    selectButtons('[data-faro-days]', draft.days, 'faroDays');
    selectButtons('[data-faro-vehicle]', draft.vehicle, 'faroVehicle');
    syncVehicleFields();
  };

  const validateStep = () => {
    if (app.onboardingStep === 1) return draft.days >= 1 && Boolean(draft.vehicle);
    if (app.onboardingStep === 2) {
      if (draft.target < 500) {
        app.toast('Informe quanto você quer que sobre no mês.');
        return false;
      }
    }
    if (app.onboardingStep === 3) {
      renderEnergyCost();
      if (draft.energyPrice <= 0 || draft.energyEfficiency <= 0) {
        app.toast('Informe o preço e o rendimento da energia do carro.');
        return false;
      }
    }
    if (app.onboardingStep === 4) {
      draft.rentalWeekly = number(qs('faroRentalWeekly').value);
      draft.rentalDueWeekday = Number(qs('faroRentalDueWeekday').value);
      draft.financeMonthly = number(qs('faroFinanceMonthly').value);
      draft.financeDueDay = Math.min(31, Math.max(1, number(qs('faroFinanceDueDay').value) || 10));
      draft.otherMonthly = number(qs('faroOtherMonthly').value);
      draft.maintenanceKm = number(qs('faroMaintenanceKm').value);

      if (draft.vehicle === 'rented' && draft.rentalWeekly <= 0) {
        app.toast('Informe o valor semanal do aluguel.');
        return false;
      }
      if (draft.vehicle === 'financed' && draft.financeMonthly <= 0) {
        app.toast('Informe o valor mensal da parcela.');
        return false;
      }
    }
    if (app.onboardingStep === 5) {
      draft.revenueKm = number(qs('faroOnboardingRevenue').value);
      if (draft.revenueKm <= 0) {
        app.toast('Informe uma receita por km ou mantenha a estimativa sugerida.');
        return false;
      }
    }
    return true;
  };

  const buildCosts = () => {
    const costs = [];
    if (draft.vehicle === 'rented') {
      costs.push({
        id: 'rental-onboarding',
        name: 'Aluguel do carro',
        kind: 'weekly',
        category: 'obligation',
        value: draft.rentalWeekly,
        active: true,
        dueWeekday: draft.rentalDueWeekday,
        source: 'onboarding'
      });
    }
    if (draft.vehicle === 'financed') {
      costs.push({
        id: 'finance-onboarding',
        name: 'Parcela do carro',
        kind: 'monthly',
        category: 'obligation',
        value: draft.financeMonthly,
        active: true,
        dueDay: draft.financeDueDay,
        source: 'onboarding'
      });
    }
    if (draft.otherMonthly > 0) {
      costs.push({
        id: 'other-monthly-onboarding',
        name: 'Outros custos fixos da operação',
        kind: 'monthly',
        category: 'obligation',
        value: draft.otherMonthly,
        active: true,
        source: 'onboarding'
      });
    }
    if (draft.maintenanceKm > 0) {
      costs.push({
        id: 'maintenance-onboarding',
        name: 'Reserva de manutenção',
        kind: 'per_km',
        category: 'reserve',
        value: draft.maintenanceKm,
        active: true,
        estimated: draft.maintenanceEstimated,
        source: 'onboarding'
      });
    }
    return costs;
  };

  const showProcessing = () => {
    const energy = ENERGY_PRESETS[draft.energy] || ENERGY_PRESETS.gnv;
    app.state.targetProfit = draft.target;
    app.state.workWeekdays = app.weekdaysForCount(draft.days);
    app.state.fuel = {
      ...energy,
      price: draft.energyPrice,
      efficiency: draft.energyEfficiency
    };
    app.state.revenueKm = draft.revenueKm;
    app.state.costs = buildCosts();
    app.state.onboardingProfile = {
      vehicle: draft.vehicle,
      configuredAt: new Date().toISOString(),
      revenueKmEstimated: draft.revenueEstimated,
      maintenanceEstimated: draft.maintenanceEstimated,
      installGateVersion: 1
    };
    app.state.onboardingComplete = false;
    app.save();

    steps.forEach(section => section.classList.toggle('hidden', section.dataset.faroStep !== 'processing'));
    qs('faroOnboardingHeader').classList.add('hidden');
    actions.classList.add('hidden');
    const processingText = qs('faroProcessingText');
    processingText.textContent = 'Juntando sua meta, dias e custos.';

    setTimeout(() => { processingText.textContent = 'Calculando seu custo por km.'; }, 300);
    setTimeout(() => { processingText.textContent = 'Montando seu ponto de partida.'; }, 620);
    setTimeout(showResult, 950);
  };

  const showResult = () => {
    app.state.onboardingComplete = true;
    app.save();
    app.syncInputs();
    app.render();

    const c = app.calculations();
    const week = app.weekContext(c);
    const estimated = draft.revenueEstimated || draft.maintenanceEstimated;
    steps.forEach(section => section.classList.toggle('hidden', section.dataset.faroStep !== 'result'));

    qs('faroPlanStatusBadge').textContent = estimated ? 'estimativa inicial' : 'dados informados';
    qs('faroPlanStatusBadge').classList.toggle('hidden', !estimated);
    qs('faroPlanDailyGross').textContent = app.money(c.dailyGross, 0);
    qs('faroPlanDays').textContent = `${c.ctx.plannedDays} dias`;
    qs('faroPlanKm').textContent = `${app.integer(c.dailyKm)} km`;
    qs('faroPlanEnergyKm').textContent = `${app.money(c.fuelKm)}/km`;
    qs('faroPlanWeek').textContent = app.money(week.target, 0);

    const vehicleText = draft.vehicle === 'rented'
      ? ` incluindo aluguel de ${app.money(draft.rentalWeekly, 0)}/semana`
      : draft.vehicle === 'financed'
        ? ` incluindo parcela de ${app.money(draft.financeMonthly, 0)}/mês`
        : '';
    qs('faroPlanExplanation').textContent = `Para buscar ${app.money(draft.target, 0)} líquidos no mês${vehicleText}, este é o ponto de partida do seu plano.`;
    qs('faroPlanDailyHint').textContent = `Com ${draft.days} dia(s) por semana e ${app.money(draft.revenueKm)} de receita por km.`;
    qs('faroPlanEstimateNote').textContent = estimated
      ? 'Alguns valores ainda são estimativas do FARO. Conforme você registrar seus dias e ajustar seus custos, o plano fica mais fiel à sua realidade.'
      : 'Seu primeiro plano foi montado com os valores que você informou. Você poderá ajustar tudo em Planejar quando sua rotina mudar.';

    finish.classList.remove('hidden');
  };

  modal.querySelectorAll('[data-faro-days]').forEach(button => button.addEventListener('click', () => {
    draft.days = Number(button.dataset.faroDays);
    selectButtons('[data-faro-days]', draft.days, 'faroDays');
  }));

  modal.querySelectorAll('[data-faro-vehicle]').forEach(button => button.addEventListener('click', () => {
    draft.vehicle = button.dataset.faroVehicle;
    selectButtons('[data-faro-vehicle]', draft.vehicle, 'faroVehicle');
    syncVehicleFields();
  }));

  qs('faroOnboardingTargetSlider').addEventListener('input', event => syncTarget(event.target.value));
  qs('faroOnboardingTargetNumber').addEventListener('input', event => syncTarget(event.target.value));

  qs('faroOnboardingEnergy').addEventListener('change', event => syncEnergy(event.target.value, true));
  qs('faroOnboardingEnergyPrice').addEventListener('input', renderEnergyCost);
  qs('faroOnboardingEnergyEfficiency').addEventListener('input', renderEnergyCost);

  qs('faroMaintenanceKm').addEventListener('input', event => {
    draft.maintenanceKm = number(event.target.value);
    draft.maintenanceEstimated = Math.abs(draft.maintenanceKm - DEFAULT_MAINTENANCE_KM) < 0.001 && draft.vehicle !== 'rented';
    qs('faroMaintenanceEstimateBadge').classList.toggle('hidden', !draft.maintenanceEstimated || draft.vehicle === 'rented');
  });

  qs('faroOnboardingRevenue').addEventListener('input', event => {
    draft.revenueKm = number(event.target.value);
    draft.revenueEstimated = Math.abs(draft.revenueKm - DEFAULT_REVENUE_KM) < 0.001;
    qs('faroRevenueEstimateBadge').classList.toggle('hidden', !draft.revenueEstimated);
  });

  back.addEventListener('click', () => {
    if (app.onboardingStep <= 1) return;
    app.onboardingStep -= 1;
    renderStep();
  });

  next.addEventListener('click', () => {
    if (!validateStep()) return;
    if (app.onboardingStep < 5) {
      app.onboardingStep += 1;
      renderStep();
      return;
    }
    showProcessing();
  });

  finish.addEventListener('click', () => {
    modal.classList.add('hidden');
    app.navigateToPrimary('dashboard');
    app.toast('Seu FARO está pronto. Ajuste quando sua rotina mudar.');
  });

  qs('faroRentalWeekly').value = draft.rentalWeekly || '';
  qs('faroRentalDueWeekday').value = draft.rentalDueWeekday;
  qs('faroFinanceMonthly').value = draft.financeMonthly || '';
  qs('faroFinanceDueDay').value = draft.financeDueDay;
  qs('faroOtherMonthly').value = draft.otherMonthly || 0;
  qs('faroMaintenanceKm').value = draft.maintenanceKm;
  qs('faroOnboardingRevenue').value = draft.revenueKm;
  syncTarget(draft.target);
  syncEnergy(draft.energy, false);
  renderStep();

  modal.classList.remove('hidden');
})();
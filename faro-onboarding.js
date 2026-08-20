(() => {
  const app = window.__vettaApp;
  if (!app) return;
  if (window.FaroPlatform && !window.FaroPlatform.canEnterProduct()) return;

  const DRAFT_KEY = 'faro-onboarding-draft-v2';
  const DEFAULT_REVENUE_KM = 2.25;
  const ENERGY = {
    gnv: { label: 'GNV', unit: 'm³', price: 4.79, efficiency: 13.2 },
    gasoline: { label: 'Gasolina', unit: 'L', price: 6.19, efficiency: 10.5 },
    ethanol: { label: 'Etanol', unit: 'L', price: 4.29, efficiency: 7.4 },
    diesel: { label: 'Diesel', unit: 'L', price: 6.09, efficiency: 11.5 },
    electric: { label: 'Elétrico', unit: 'kWh', price: 0, efficiency: 0 }
  };

  const $ = id => document.getElementById(id);
  const n = value => app.number(value);
  const text = value => String(value || '').trim().replace(/\s+/g, ' ');
  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const clampDueDay = value => {
    const parsed = Math.round(n(value));
    return parsed >= 1 && parsed <= 31 ? parsed : null;
  };
  const weekdays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  const ensureElectricInSettings = () => {
    const fuelType = $('fuelType');
    if (fuelType && !fuelType.querySelector('option[value="electric"]')) {
      const option = document.createElement('option');
      option.value = 'electric';
      option.textContent = 'Elétrico';
      fuelType.insertBefore(option, fuelType.querySelector('option[value="custom"]') || null);
    }
  };

  const injectStyles = () => {
    if ($('faroOnboardingStyles')) return;
    const style = document.createElement('style');
    style.id = 'faroOnboardingStyles';
    style.textContent = `
      #onboardingModal .onboarding-sheet{max-height:min(92dvh,800px);overflow:auto;overscroll-behavior:contain}
      #onboardingModal .faro-card{border:1px solid #e2e8f0;border-radius:18px;padding:14px;background:#fff}
      #onboardingModal .faro-choice{min-height:48px;border:1px solid #e2e8f0;border-radius:15px;padding:10px 12px;font-size:12px;font-weight:800;color:#475569;background:#fff;transition:.16s ease}
      #onboardingModal .faro-choice.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8;box-shadow:0 0 0 1px #2563eb inset}
      #onboardingModal .faro-choice:active,#onboardingModal .faro-chip:active{transform:scale(.97)}
      #onboardingModal .faro-helper{font-size:12px;line-height:1.5;color:#64748b}
      #onboardingModal .faro-estimate{display:inline-flex;border-radius:999px;background:#fff7ed;color:#c2410c;padding:6px 9px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}
      #onboardingModal .faro-money{appearance:textfield;-moz-appearance:textfield}
      #onboardingModal .faro-money::-webkit-outer-spin-button,#onboardingModal .faro-money::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      #onboardingModal .faro-target{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#0b1121;color:#fff;border-radius:20px;padding:16px}
      #onboardingModal .faro-target input{width:140px;background:transparent;color:#fff;font-size:26px;font-weight:900;text-align:right;border:0;outline:0}
      #onboardingModal .faro-chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      #onboardingModal .faro-chip{min-height:44px;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:900;transition:.12s ease}
      #onboardingModal .faro-cost-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px 13px;border-radius:15px;background:#f8fafc;animation:faroRise .18s ease-out}
      #onboardingModal .faro-cost-actions{display:flex;gap:6px}
      #onboardingModal .faro-cost-action{min-width:42px;min-height:42px;border-radius:12px;background:#fff;border:1px solid #e2e8f0;color:#475569;font-size:11px;font-weight:900}
      #onboardingModal .faro-processing-mark{width:90px;height:90px;border-radius:30px;background:#eff6ff;display:grid;place-items:center;margin:12px auto 20px;animation:faroSniff 1.15s ease-in-out infinite}
      #onboardingModal .faro-processing-mark img{width:66px;height:66px;object-fit:contain}
      #onboardingModal .faro-processing-dots{display:flex;justify-content:center;gap:7px;margin-top:18px}
      #onboardingModal .faro-processing-dots span{width:7px;height:7px;border-radius:50%;background:#93c5fd;animation:faroDot 1s infinite}
      #onboardingModal .faro-processing-dots span:nth-child(2){animation-delay:.15s}#onboardingModal .faro-processing-dots span:nth-child(3){animation-delay:.3s}
      #onboardingModal .faro-plan-hero{background:linear-gradient(145deg,#0b1121,#172554);color:#fff;border-radius:24px;padding:20px}
      #onboardingModal .faro-plan-value{font-size:42px;font-weight:900;letter-spacing:-.05em;line-height:1}
      #onboardingModal .faro-plan-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #onboardingModal .faro-plan-metric{background:#f8fafc;border-radius:16px;padding:13px}
      #onboardingModal [data-faro-step]:not(.hidden){animation:faroStepIn .22s ease-out}
      @keyframes faroStepIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      @keyframes faroRise{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
      @keyframes faroSniff{0%,100%{transform:translateY(0) rotate(0)}45%{transform:translateY(-5px) rotate(-2deg)}70%{transform:translateY(1px) rotate(2deg)}}
      @keyframes faroDot{0%,70%,100%{opacity:.35;transform:scale(.8)}35%{opacity:1;transform:scale(1.15)}}
      @media(prefers-reduced-motion:reduce){#onboardingModal *{scroll-behavior:auto!important}#onboardingModal [data-faro-step]:not(.hidden),#onboardingModal .faro-cost-row,#onboardingModal .faro-processing-mark,#onboardingModal .faro-processing-dots span{animation:none!important}#onboardingModal .faro-choice,#onboardingModal .faro-chip{transition:none}}
    `;
    document.head.appendChild(style);
  };

  ensureElectricInSettings();
  injectStyles();

  const modal = $('onboardingModal');
  if (!modal || app.state.onboardingComplete) return;

  const initialFuel = ENERGY[app.state.fuel?.type] || ENERGY.gnv;
  const freshDraft = () => ({
    version: 2,
    stepId: 'routine',
    days: app.state.workWeekdays?.length || 6,
    vehicle: app.state.onboardingProfile?.vehicle || 'own',
    rentalWeekly: 0,
    rentalDueWeekday: '',
    financeMonthly: 0,
    financeDueDay: '',
    target: Number(app.state.targetProfit) || 4000,
    energy: app.state.fuel?.type && ENERGY[app.state.fuel.type] ? app.state.fuel.type : 'gnv',
    energyPrice: Number(app.state.fuel?.price) || initialFuel.price,
    energyEfficiency: app.state.fuel?.type === 'electric' ? 0 : (Number(app.state.fuel?.efficiency) || initialFuel.efficiency),
    batteryKwh: 0,
    rangeKm: 0,
    energyPriceEstimated: true,
    energyEfficiencyEstimated: app.state.fuel?.type !== 'electric',
    otherCosts: [],
    pendingCost: { name: '', value: '', dueDay: '' },
    editingCostIndex: null,
    reserveDraft: { name: '', value: '' },
    revenueKm: Number(app.state.revenueKm) || DEFAULT_REVENUE_KM,
    revenueEstimated: true
  });

  const loadDraft = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!saved || saved.version !== 2) return freshDraft();
      const base = freshDraft();
      return {
        ...base,
        ...saved,
        otherCosts: Array.isArray(saved.otherCosts) ? saved.otherCosts : [],
        pendingCost: { ...base.pendingCost, ...(saved.pendingCost || {}) },
        reserveDraft: { ...base.reserveDraft, ...(saved.reserveDraft || {}) }
      };
    } catch { return freshDraft(); }
  };

  const draft = loadDraft();
  const saveDraft = () => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {} };
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

  modal.innerHTML = `
    <div class="modal-sheet onboarding-sheet">
      <div id="faroOnboardingHeader">
        <div class="flex justify-between items-center gap-4">
          <div><span class="label-micro !text-blue-600">Primeira configuração</span><h3 id="faroOnboardingTitle" class="text-2xl font-extrabold">Como você trabalha?</h3></div>
          <span id="faroOnboardingProgress" class="text-xs font-extrabold text-slate-400"></span>
        </div>
        <div class="progress-track mt-4"><div id="faroOnboardingBar" class="progress-fill" style="width:10%"></div></div>
      </div>

      <div class="mt-6">
        <section data-faro-step="routine" class="space-y-5">
          <p class="text-sm text-slate-500 leading-relaxed">O mês define o destino. O FARO transforma isso em uma semana e em um dia que façam sentido na pista.</p>
          <div><label class="label-micro">Quantos dias por semana pretende rodar?</label><div class="grid grid-cols-3 gap-2"><button type="button" data-days="5" class="faro-choice">5 dias</button><button type="button" data-days="6" class="faro-choice">6 dias</button><button type="button" data-days="7" class="faro-choice">7 dias</button></div></div>
          <div><label class="label-micro">Seu carro é...</label><div class="grid grid-cols-3 gap-2"><button type="button" data-vehicle="own" class="faro-choice">Próprio</button><button type="button" data-vehicle="financed" class="faro-choice">Financiado</button><button type="button" data-vehicle="rented" class="faro-choice">Alugado</button></div><p class="faro-helper mt-2">Só perguntamos o que muda seu custo real.</p></div>
        </section>

        <section data-faro-step="rental" class="hidden space-y-5">
          <div><span class="label-micro !text-blue-600">Carro alugado</span><h3 class="text-xl font-extrabold">Seu aluguel</h3><p class="faro-helper mt-2">Aluguel costuma ser semanal. O FARO cuida da conversão para o mês sem te obrigar a fazer conta.</p></div>
          <div><label class="label-micro">Quanto você paga por semana?</label><div class="input-wrapper"><span>R$</span><input id="faroRentalWeekly" class="input-vetta faro-money" type="number" inputmode="decimal" min="0" step="10" placeholder="800"></div></div>
          <div><label class="label-micro">Que dia normalmente vence?</label><select id="faroRentalDue" class="input-vetta"><option value="">Escolha o dia</option><option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option><option value="4">Quinta</option><option value="5">Sexta</option><option value="6">Sábado</option><option value="0">Domingo</option></select></div>
          <div id="faroRentalPreview" class="faro-card bg-blue-50 border-blue-100 text-sm text-blue-800"></div>
        </section>

        <section data-faro-step="finance" class="hidden space-y-5">
          <div><span class="label-micro !text-blue-600">Carro financiado</span><h3 class="text-xl font-extrabold">Sua parcela</h3><p class="faro-helper mt-2">A parcela é uma obrigação do carro. Depois você poderá acrescentar seguro, rastreador e outros custos separadamente.</p></div>
          <div><label class="label-micro">Valor da parcela mensal</label><div class="input-wrapper"><span>R$</span><input id="faroFinanceMonthly" class="input-vetta faro-money" type="number" inputmode="decimal" min="0" step="10" placeholder="950"></div></div>
          <div><label class="label-micro">Dia do vencimento</label><input id="faroFinanceDue" class="input-vetta no-mask" type="number" inputmode="numeric" min="1" max="31" placeholder="Ex.: 10"></div>
        </section>

        <section data-faro-step="target" class="hidden space-y-5">
          <p class="text-sm text-slate-500">Quanto você quer que <strong class="text-slate-700">sobre no seu bolso</strong> ao final do mês?</p>
          <div class="faro-target"><div><span class="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold">Objetivo líquido</span><strong class="block mt-1">R$ por mês</strong></div><input id="faroTargetNumber" class="faro-money" type="number" min="500" max="50000" step="100" inputmode="numeric"></div>
          <input id="faroTargetSlider" type="range" min="500" max="20000" step="100" class="w-full" aria-label="Objetivo líquido mensal">
          <div class="faro-chips"><button type="button" data-target-add="50" class="faro-chip">+ R$50</button><button type="button" data-target-add="100" class="faro-chip">+ R$100</button><button type="button" data-target-add="500" class="faro-chip">+ R$500</button></div>
          <p class="faro-helper">Arraste para chegar rápido; use os atalhos ou digite o valor exato quando quiser precisão.</p>
        </section>

        <section data-faro-step="energy" class="hidden space-y-5">
          <p class="text-sm text-slate-500">Agora o FARO calcula o custo da energia usada para rodar.</p>
          <div><label class="label-micro">Como seu carro roda?</label><select id="faroEnergyType" class="input-vetta"><option value="gnv">GNV</option><option value="gasoline">Gasolina</option><option value="ethanol">Etanol</option><option value="diesel">Diesel</option><option value="electric">Elétrico</option></select></div>
          <div id="faroCombustionFields" class="space-y-4">
            <div class="flex justify-between gap-3"><label id="faroPriceLabel" class="label-micro !mb-0">Preço</label><span id="faroPriceEstimate" class="faro-estimate">estimativa</span></div>
            <input id="faroEnergyPrice" type="number" inputmode="decimal" min="0" step=".01" class="input-vetta faro-money">
            <div class="flex justify-between gap-3"><label id="faroEfficiencyLabel" class="label-micro !mb-0">Rendimento</label><span id="faroEfficiencyEstimate" class="faro-estimate">estimativa</span></div>
            <input id="faroEnergyEfficiency" type="number" inputmode="decimal" min="0" step=".1" class="input-vetta faro-money">
          </div>
          <div id="faroElectricFields" class="hidden space-y-4">
            <div><label class="label-micro">Preço médio da energia</label><div class="input-wrapper"><span>R$</span><input id="faroElectricPrice" type="number" inputmode="decimal" min="0" step=".01" class="input-vetta faro-money" placeholder="Ex.: 1,80"></div><p class="faro-helper mt-1">Use o valor médio que você realmente paga por kWh.</p></div>
            <div><label class="label-micro">Tamanho da bateria</label><div class="input-wrapper"><input id="faroBatteryKwh" type="number" inputmode="decimal" min="0" step=".1" class="input-vetta faro-money" placeholder="45"><span>kWh</span></div></div>
            <div><label class="label-micro">Quanto seu carro roda com uma carga?</label><div class="input-wrapper"><input id="faroRangeKm" type="number" inputmode="decimal" min="0" step="1" class="input-vetta faro-money" placeholder="280"><span>km</span></div><p class="faro-helper mt-1">Você informa bateria e autonomia. O FARO calcula sozinho o km/kWh.</p></div>
          </div>
          <div id="faroEnergyPreview" class="faro-card bg-blue-50 border-blue-100 text-sm font-bold text-blue-800"></div>
        </section>

        <section data-faro-step="costs" class="hidden space-y-5">
          <div><h3 class="text-xl font-extrabold">Outros custos fixos do trabalho</h3><p class="faro-helper mt-2">Adicione um por vez. Cada custo fica separado para o FARO lembrar, editar e usar no planejamento corretamente.</p></div>
          <div id="faroAddedCosts" class="space-y-2"></div>
          <div class="faro-card space-y-3">
            <div><label class="label-micro">Nome do custo</label><input id="faroCostName" class="input-vetta" type="text" maxlength="60" placeholder="Seguro do carro"></div>
            <div><label class="label-micro">Valor mensal</label><div class="input-wrapper"><span>R$</span><input id="faroCostValue" class="input-vetta faro-money" type="number" inputmode="decimal" min="0" step="10" placeholder="215"></div></div>
            <div><label class="label-micro">Dia do vencimento <span class="normal-case text-slate-400">(opcional)</span></label><input id="faroCostDue" class="input-vetta no-mask" type="number" inputmode="numeric" min="1" max="31" placeholder="20"><p class="faro-helper mt-1">Se não souber ou não tiver dia fixo, deixe vazio.</p></div>
            <button id="faroAddCost" type="button" class="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-extrabold">ADICIONAR CUSTO</button>
          </div>
          <div class="rounded-2xl bg-blue-50 p-4"><strong class="text-sm text-blue-800">Manutenção por km fica para depois</strong><p class="faro-helper !text-blue-700 mt-1">Depois do primeiro plano, o FARO vai te chamar para configurar uma reserva por km se isso fizer sentido para sua rotina.</p></div>
        </section>

        <section data-faro-step="reserve" class="hidden space-y-5">
          <div><h3 class="text-xl font-extrabold">Quer criar uma reserva?</h3><p class="faro-helper mt-2">É opcional. Você pode planejar uma quantia mensal para manutenção, pneus, IPVA, emergência ou outro objetivo.</p></div>
          <div class="grid grid-cols-2 gap-2"><button type="button" data-reserve-name="Manutenção" class="faro-choice">Manutenção</button><button type="button" data-reserve-name="Pneus" class="faro-choice">Pneus</button><button type="button" data-reserve-name="IPVA" class="faro-choice">IPVA</button><button type="button" data-reserve-name="Emergência" class="faro-choice">Emergência</button></div>
          <div><label class="label-micro">Nome da reserva</label><input id="faroReserveName" class="input-vetta" type="text" maxlength="60" placeholder="Troca de pneus"></div>
          <div><label class="label-micro">Quanto quer separar por mês?</label><div class="input-wrapper"><span>R$</span><input id="faroReserveValue" class="input-vetta faro-money" type="number" inputmode="decimal" min="0" step="10" placeholder="200"></div></div>
          <button id="faroSkipReserve" type="button" class="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 font-extrabold">AGORA NÃO</button>
          <p class="faro-helper">Planejar reserva não significa dinheiro já guardado. O saldo real será acompanhado separadamente quando você registrar aportes.</p>
        </section>

        <section data-faro-step="revenue" class="hidden space-y-5">
          <div><p class="text-sm text-slate-500">Só falta uma referência para estimar a rodagem necessária.</p></div>
          <div class="flex justify-between gap-3"><label class="label-micro !mb-0">Quanto costuma faturar por km?</label><span id="faroRevenueEstimate" class="faro-estimate">estimativa inicial</span></div>
          <div class="input-wrapper"><span>R$</span><input id="faroRevenueKm" class="input-vetta faro-money" type="number" inputmode="decimal" min=".1" step=".01"></div>
          <p class="faro-helper">Se você ainda não sabe, pode usar a estimativa inicial. O FARO deixa isso explícito e aprende com seus registros reais.</p>
        </section>

        <section data-faro-step="processing" class="hidden text-center py-5">
          <div class="faro-processing-mark" data-mascot-slot="future"><img src="./faro-mark.svg" alt=""></div>
          <span class="label-micro !text-blue-600">FARO trabalhando</span><h3 class="text-2xl font-extrabold mt-2">Farejando sua operação...</h3>
          <p id="faroProcessingText" class="text-sm text-slate-500 mt-3">Juntando sua rotina e seus custos...</p>
          <div class="faro-processing-dots"><span></span><span></span><span></span></div>
        </section>

        <section data-faro-step="result" class="hidden space-y-5">
          <div><span id="faroPlanStatus" class="faro-estimate">estimativa inicial</span><h3 class="text-2xl font-extrabold mt-3">Seu primeiro plano está pronto.</h3><p id="faroPlanExplanation" class="text-sm text-slate-500 mt-2 leading-relaxed"></p></div>
          <div class="faro-plan-hero"><span class="text-[10px] uppercase tracking-widest text-blue-200 font-extrabold">Faturamento necessário por dia</span><strong id="faroPlanDailyGross" class="faro-plan-value block mt-2">R$ 0</strong><p id="faroPlanDailyHint" class="text-xs text-slate-300 mt-3"></p></div>
          <div class="faro-plan-grid"><div class="faro-plan-metric"><span class="label-micro">Dias planejados</span><strong id="faroPlanDays" class="text-lg"></strong></div><div class="faro-plan-metric"><span class="label-micro">Rodagem estimada/dia</span><strong id="faroPlanKm" class="text-lg"></strong></div><div class="faro-plan-metric"><span class="label-micro">Energia por km</span><strong id="faroPlanEnergyKm" class="text-lg"></strong></div><div class="faro-plan-metric"><span class="label-micro">Ritmo semanal</span><strong id="faroPlanWeek" class="text-lg"></strong></div></div>
          <div id="faroPlanNote" class="rounded-2xl bg-amber-50 text-amber-800 p-4 text-xs leading-relaxed"></div>
        </section>
      </div>

      <div id="faroOnboardingActions" class="grid grid-cols-2 gap-3 mt-6"><button id="faroBack" type="button" class="py-4 rounded-2xl bg-slate-100 text-slate-600 font-extrabold invisible">Voltar</button><button id="faroNext" type="button" class="py-4 rounded-2xl bg-blue-600 text-white font-extrabold">Continuar</button></div>
      <button id="faroFinish" type="button" class="hidden w-full mt-5 py-4 rounded-2xl bg-blue-600 text-white font-extrabold">IR PARA O FARO</button>
    </div>`;

  const sections = [...modal.querySelectorAll('[data-faro-step]')];
  const sequence = () => ['routine', ...(draft.vehicle === 'rented' ? ['rental'] : draft.vehicle === 'financed' ? ['finance'] : []), 'target', 'energy', 'costs', 'reserve', 'revenue'];
  const titleMap = { routine:'Como você trabalha?', rental:'Seu aluguel', finance:'Sua parcela', target:'Quanto quer que sobre?', energy:'Como seu carro roda?', costs:'Seus custos fixos', reserve:'Sua reserva', revenue:'Última referência' };

  const selectButtons = (selector, value, key) => modal.querySelectorAll(selector).forEach(button => button.classList.toggle('active', String(button.dataset[key]) === String(value)));
  const syncTarget = value => {
    const parsed = Math.max(500, Math.min(50000, n(value) || 500));
    draft.target = parsed;
    $('faroTargetNumber').value = parsed;
    $('faroTargetSlider').value = Math.min(20000, parsed);
    saveDraft();
  };

  const calculateEnergy = () => {
    if (draft.energy === 'electric') {
      draft.energyPrice = n($('faroElectricPrice').value);
      draft.batteryKwh = n($('faroBatteryKwh').value);
      draft.rangeKm = n($('faroRangeKm').value);
      draft.energyEfficiency = draft.batteryKwh > 0 ? draft.rangeKm / draft.batteryKwh : 0;
    } else {
      draft.energyPrice = n($('faroEnergyPrice').value);
      draft.energyEfficiency = n($('faroEnergyEfficiency').value);
    }
    const cost = draft.energyEfficiency > 0 ? draft.energyPrice / draft.energyEfficiency : 0;
    $('faroEnergyPreview').textContent = cost > 0 ? `Custo de energia: ${app.money(cost)}/km.` : 'Preencha os dados para o FARO calcular o custo por km.';
    saveDraft();
    return cost;
  };

  const renderEnergy = (reset = false) => {
    const preset = ENERGY[draft.energy] || ENERGY.gnv;
    if (reset) {
      draft.energyPrice = preset.price;
      draft.energyEfficiency = preset.efficiency;
      draft.energyPriceEstimated = true;
      draft.energyEfficiencyEstimated = draft.energy !== 'electric';
      if (draft.energy === 'electric') { draft.batteryKwh = 0; draft.rangeKm = 0; }
    }
    $('faroEnergyType').value = draft.energy;
    const electric = draft.energy === 'electric';
    $('faroCombustionFields').classList.toggle('hidden', electric);
    $('faroElectricFields').classList.toggle('hidden', !electric);
    if (electric) {
      $('faroElectricPrice').value = draft.energyPrice || '';
      $('faroBatteryKwh').value = draft.batteryKwh || '';
      $('faroRangeKm').value = draft.rangeKm || '';
    } else {
      $('faroPriceLabel').textContent = `Preço por ${preset.unit}`;
      $('faroEfficiencyLabel').textContent = `Quantos km roda com 1 ${preset.unit}?`;
      $('faroEnergyPrice').value = draft.energyPrice || '';
      $('faroEnergyEfficiency').value = draft.energyEfficiency || '';
    }
    $('faroPriceEstimate').classList.toggle('hidden', !draft.energyPriceEstimated);
    $('faroEfficiencyEstimate').classList.toggle('hidden', !draft.energyEfficiencyEstimated || electric);
    calculateEnergy();
  };

  const capturePendingCost = () => {
    draft.pendingCost = { name: $('faroCostName').value, value: $('faroCostValue').value, dueDay: $('faroCostDue').value };
    saveDraft();
  };

  const renderCosts = () => {
    const list = $('faroAddedCosts');
    list.innerHTML = draft.otherCosts.length ? draft.otherCosts.map((item,index) => `
      <div class="faro-cost-row"><div><strong class="text-sm">${escapeHtml(item.name)}</strong><span class="block text-xs text-slate-500">${app.money(item.value)}/mês${item.dueDay ? ` · vence dia ${item.dueDay}` : ''}</span></div><div class="faro-cost-actions"><button type="button" data-cost-edit="${index}" class="faro-cost-action">Editar</button><button type="button" data-cost-delete="${index}" class="faro-cost-action">×</button></div></div>`).join('') : '<p class="faro-helper">Nenhum outro custo adicionado ainda.</p>';
    $('faroCostName').value = draft.pendingCost.name || '';
    $('faroCostValue').value = draft.pendingCost.value || '';
    $('faroCostDue').value = draft.pendingCost.dueDay || '';
    $('faroAddCost').textContent = draft.editingCostIndex === null ? 'ADICIONAR CUSTO' : 'SALVAR ALTERAÇÃO';
  };

  const savePendingCost = () => {
    capturePendingCost();
    const name = text(draft.pendingCost.name);
    const value = n(draft.pendingCost.value);
    if (!name && value <= 0 && !draft.pendingCost.dueDay) return true;
    if (!name) { app.toast('Dê um nome para este custo.'); return false; }
    if (value <= 0) { app.toast(`Informe o valor de ${name}.`); return false; }
    const item = { id: `onboarding-cost-${Date.now()}`, name, kind:'monthly', category:'obligation', value, active:true, dueDay:clampDueDay(draft.pendingCost.dueDay), source:'onboarding' };
    if (draft.editingCostIndex === null) draft.otherCosts.push(item);
    else draft.otherCosts[draft.editingCostIndex] = { ...draft.otherCosts[draft.editingCostIndex], ...item, id:draft.otherCosts[draft.editingCostIndex].id };
    draft.editingCostIndex = null;
    draft.pendingCost = { name:'', value:'', dueDay:'' };
    saveDraft();
    renderCosts();
    requestAnimationFrame(() => $('faroCostName')?.focus());
    return true;
  };

  const renderRentalPreview = () => {
    const value = n($('faroRentalWeekly').value);
    const rawDue = $('faroRentalDue').value;
    draft.rentalWeekly = value;
    draft.rentalDueWeekday = rawDue === '' ? '' : Number(rawDue);
    saveDraft();
    if (value <= 0) $('faroRentalPreview').textContent = 'Informe o valor semanal do aluguel.';
    else if (rawDue === '') $('faroRentalPreview').textContent = `${app.money(value,0)} por semana · escolha o dia do vencimento.`;
    else $('faroRentalPreview').textContent = `${app.money(value,0)} por semana · normalmente vence ${weekdays[Number(rawDue)]}.`;
  };

  const renderStep = () => {
    const seq = sequence();
    if (!seq.includes(draft.stepId)) draft.stepId = seq[0];
    sections.forEach(section => section.classList.toggle('hidden', section.dataset.faroStep !== draft.stepId));
    if (!seq.includes(draft.stepId)) return;
    const index = seq.indexOf(draft.stepId);
    $('faroOnboardingTitle').textContent = titleMap[draft.stepId];
    $('faroOnboardingProgress').textContent = `${index + 1}/${seq.length}`;
    $('faroOnboardingBar').style.width = `${((index + 1) / seq.length) * 100}%`;
    $('faroBack').classList.toggle('invisible', index === 0);
    $('faroNext').textContent = index === seq.length - 1 ? 'Montar meu plano' : 'Continuar';
    $('faroOnboardingActions').classList.remove('hidden');
    $('faroFinish').classList.add('hidden');
    selectButtons('[data-days]', draft.days, 'days');
    selectButtons('[data-vehicle]', draft.vehicle, 'vehicle');
    if (draft.stepId === 'rental') renderRentalPreview();
    if (draft.stepId === 'energy') renderEnergy(false);
    if (draft.stepId === 'costs') renderCosts();
    saveDraft();
  };

  const validateStep = () => {
    if (draft.stepId === 'rental') {
      renderRentalPreview();
      if (draft.rentalWeekly <= 0) { app.toast('Informe o valor semanal do aluguel.'); return false; }
      if ($('faroRentalDue').value === '') { app.toast('Escolha o dia em que o aluguel normalmente vence.'); return false; }
    }
    if (draft.stepId === 'finance') {
      draft.financeMonthly = n($('faroFinanceMonthly').value);
      draft.financeDueDay = clampDueDay($('faroFinanceDue').value);
      if (draft.financeMonthly <= 0) { app.toast('Informe o valor mensal da parcela.'); return false; }
      if (!draft.financeDueDay) { app.toast('Informe o dia do vencimento da parcela.'); return false; }
    }
    if (draft.stepId === 'target' && draft.target < 500) { app.toast('Informe sua meta líquida mensal.'); return false; }
    if (draft.stepId === 'energy') {
      calculateEnergy();
      if (draft.energy === 'electric' && (draft.energyPrice <= 0 || draft.batteryKwh <= 0 || draft.rangeKm <= 0)) { app.toast('Informe preço da energia, bateria e autonomia por carga.'); return false; }
      if (draft.energy !== 'electric' && (draft.energyPrice <= 0 || draft.energyEfficiency <= 0)) { app.toast('Informe preço e rendimento do combustível.'); return false; }
    }
    if (draft.stepId === 'costs') {
      capturePendingCost();
      if (text(draft.pendingCost.name) || n(draft.pendingCost.value) > 0 || draft.pendingCost.dueDay) return savePendingCost();
    }
    if (draft.stepId === 'reserve') {
      draft.reserveDraft = { name:$('faroReserveName').value, value:$('faroReserveValue').value };
      const hasName = Boolean(text(draft.reserveDraft.name));
      const hasValue = n(draft.reserveDraft.value) > 0;
      if (hasName !== hasValue) { app.toast(hasName ? 'Informe quanto quer separar para essa reserva.' : 'Dê um nome para sua reserva.'); return false; }
    }
    if (draft.stepId === 'revenue') {
      draft.revenueKm = n($('faroRevenueKm').value);
      if (draft.revenueKm <= 0) { app.toast('Informe uma receita por km ou mantenha a estimativa inicial.'); return false; }
    }
    saveDraft();
    return true;
  };

  const buildCosts = () => {
    const costs = [...draft.otherCosts.map(item => ({ ...item }))];
    if (draft.vehicle === 'rented') costs.unshift({ id:'rental-onboarding', name:'Aluguel do carro', kind:'weekly', category:'obligation', value:draft.rentalWeekly, active:true, dueWeekday:draft.rentalDueWeekday, source:'onboarding' });
    if (draft.vehicle === 'financed') costs.unshift({ id:'finance-onboarding', name:'Parcela do carro', kind:'monthly', category:'obligation', value:draft.financeMonthly, active:true, dueDay:draft.financeDueDay, source:'onboarding' });
    if (text(draft.reserveDraft.name) && n(draft.reserveDraft.value) > 0) costs.push({ id:'reserve-onboarding', name:text(draft.reserveDraft.name), kind:'monthly', category:'reserve', value:n(draft.reserveDraft.value), active:true, plannedOnly:true, source:'onboarding' });
    return costs;
  };

  const showProcessing = () => {
    const preset = ENERGY[draft.energy] || ENERGY.gnv;
    draft.stepId = 'processing';
    saveDraft();
    app.state.targetProfit = draft.target;
    app.state.workWeekdays = app.weekdaysForCount(draft.days);
    app.state.fuel = { type:draft.energy, label:preset.label, unit:preset.unit, price:draft.energyPrice, efficiency:draft.energyEfficiency };
    app.state.revenueKm = draft.revenueKm;
    app.state.costs = buildCosts();
    app.state.onboardingProfile = {
      version:2, vehicle:draft.vehicle, configuredAt:new Date().toISOString(), revenueKmEstimated:draft.revenueEstimated,
      energyPriceEstimated:draft.energyPriceEstimated, energyEfficiencyEstimated:draft.energyEfficiencyEstimated,
      electric:draft.energy === 'electric' ? { batteryCapacityKwh:draft.batteryKwh, rangePerChargeKm:draft.rangeKm } : null,
      reserveConfigured:Boolean(text(draft.reserveDraft.name) && n(draft.reserveDraft.value) > 0),
      maintenancePerKmDeferred:true, installGateVersion:1
    };
    app.state.onboardingComplete = false;
    app.save();
    sections.forEach(section => section.classList.toggle('hidden', section.dataset.faroStep !== 'processing'));
    $('faroOnboardingHeader').classList.add('hidden'); $('faroOnboardingActions').classList.add('hidden'); $('faroFinish').classList.add('hidden');
    $('faroProcessingText').textContent = 'Juntando sua rotina e seus custos...';
    setTimeout(() => { $('faroProcessingText').textContent = 'Calculando seu custo de operação...'; }, 1400);
    setTimeout(() => { $('faroProcessingText').textContent = 'Montando seu primeiro plano...'; }, 2800);
    setTimeout(showResult, 4000);
  };

  const showResult = () => {
    draft.stepId = 'result';
    saveDraft();
    app.state.onboardingComplete = false;
    app.save();
    const c = app.calculations(); const week = app.weekContext(c);
    const estimated = draft.revenueEstimated || draft.energyPriceEstimated || draft.energyEfficiencyEstimated;
    sections.forEach(section => section.classList.toggle('hidden', section.dataset.faroStep !== 'result'));
    $('faroOnboardingHeader').classList.add('hidden');
    $('faroOnboardingActions').classList.add('hidden');
    $('faroPlanStatus').classList.toggle('hidden', !estimated);
    $('faroPlanDailyGross').textContent = app.money(c.dailyGross,0);
    $('faroPlanDays').textContent = `${c.ctx.plannedDays} dias`;
    $('faroPlanKm').textContent = `${app.integer(c.dailyKm)} km`;
    $('faroPlanEnergyKm').textContent = `${app.money(c.fuelKm)}/km`;
    $('faroPlanWeek').textContent = app.money(week.target,0);
    const vehicle = draft.vehicle === 'rented' ? ` incluindo aluguel de ${app.money(draft.rentalWeekly,0)}/semana` : draft.vehicle === 'financed' ? ` incluindo parcela de ${app.money(draft.financeMonthly,0)}/mês` : '';
    $('faroPlanExplanation').textContent = `Para buscar ${app.money(draft.target,0)} líquidos no mês${vehicle}, este é o ponto de partida do seu FARO.`;
    $('faroPlanDailyHint').textContent = `Com ${draft.days} dia(s) por semana e ${app.money(draft.revenueKm)} de receita por km.`;
    $('faroPlanNote').textContent = estimated ? 'Alguns valores ainda são estimativas. Seus registros reais vão deixar o plano cada vez mais fiel.' : 'Seu primeiro plano foi montado com os valores informados e pode ser ajustado em Planejar.';
    $('faroFinish').classList.remove('hidden');
  };

  modal.querySelectorAll('[data-days]').forEach(button => button.addEventListener('click', () => { draft.days = Number(button.dataset.days); selectButtons('[data-days]', draft.days, 'days'); saveDraft(); }));
  modal.querySelectorAll('[data-vehicle]').forEach(button => button.addEventListener('click', () => { draft.vehicle = button.dataset.vehicle; selectButtons('[data-vehicle]', draft.vehicle, 'vehicle'); saveDraft(); }));
  $('faroRentalWeekly').addEventListener('input', renderRentalPreview); $('faroRentalDue').addEventListener('change', renderRentalPreview);
  $('faroFinanceMonthly').addEventListener('input', () => { draft.financeMonthly = n($('faroFinanceMonthly').value); saveDraft(); }); $('faroFinanceDue').addEventListener('input', () => { draft.financeDueDay = clampDueDay($('faroFinanceDue').value) ?? ''; saveDraft(); });
  $('faroTargetSlider').addEventListener('input', e => syncTarget(e.target.value));
  $('faroTargetNumber').addEventListener('input', e => { if (e.target.value !== '') syncTarget(e.target.value); });
  $('faroTargetNumber').addEventListener('blur', e => { if (e.target.value === '') e.target.value = draft.target; });
  modal.querySelectorAll('[data-target-add]').forEach(button => button.addEventListener('click', () => syncTarget(draft.target + Number(button.dataset.targetAdd))));
  $('faroEnergyType').addEventListener('change', e => { draft.energy = e.target.value; renderEnergy(true); });
  $('faroEnergyPrice').addEventListener('input', () => { draft.energyPriceEstimated = false; renderEnergy(false); }); $('faroEnergyEfficiency').addEventListener('input', () => { draft.energyEfficiencyEstimated = false; renderEnergy(false); });
  $('faroElectricPrice').addEventListener('input', () => { draft.energyPriceEstimated = false; calculateEnergy(); }); $('faroBatteryKwh').addEventListener('input', calculateEnergy); $('faroRangeKm').addEventListener('input', calculateEnergy);
  ['faroCostName','faroCostValue','faroCostDue'].forEach(id => $(id).addEventListener('input', capturePendingCost)); $('faroAddCost').addEventListener('click', savePendingCost);
  $('faroAddedCosts').addEventListener('click', event => {
    const edit = event.target.closest('[data-cost-edit]'); const remove = event.target.closest('[data-cost-delete]');
    if (edit) { const index = Number(edit.dataset.costEdit); const item = draft.otherCosts[index]; if (!item) return; draft.editingCostIndex=index; draft.pendingCost={name:item.name,value:String(item.value),dueDay:item.dueDay?String(item.dueDay):''}; saveDraft(); renderCosts(); }
    if (remove) { const index = Number(remove.dataset.costDelete); const item = draft.otherCosts[index]; if (!item) return; draft.otherCosts.splice(index,1); if (draft.editingCostIndex===index){draft.editingCostIndex=null;draft.pendingCost={name:'',value:'',dueDay:''};} saveDraft(); renderCosts(); app.toast(`${item.name} foi removido.`); }
  });
  modal.querySelectorAll('[data-reserve-name]').forEach(button => button.addEventListener('click', () => { draft.reserveDraft.name=button.dataset.reserveName; $('faroReserveName').value=draft.reserveDraft.name; saveDraft(); }));
  $('faroReserveName').addEventListener('input', () => { draft.reserveDraft.name=$('faroReserveName').value; saveDraft(); }); $('faroReserveValue').addEventListener('input', () => { draft.reserveDraft.value=$('faroReserveValue').value; saveDraft(); });
  $('faroSkipReserve').addEventListener('click', () => { draft.reserveDraft={name:'',value:''}; const seq=sequence(); draft.stepId=seq[Math.min(seq.indexOf('reserve')+1,seq.length-1)]; saveDraft(); renderStep(); });
  $('faroRevenueKm').addEventListener('input', e => { draft.revenueKm=n(e.target.value); draft.revenueEstimated=Math.abs(draft.revenueKm-DEFAULT_REVENUE_KM)<.001; $('faroRevenueEstimate').classList.toggle('hidden',!draft.revenueEstimated); saveDraft(); });
  $('faroBack').addEventListener('click', () => { const seq=sequence(); const index=seq.indexOf(draft.stepId); if(index<=0)return; draft.stepId=seq[index-1]; saveDraft(); renderStep(); });
  $('faroNext').addEventListener('click', () => { if(!validateStep())return; const seq=sequence(); const index=seq.indexOf(draft.stepId); if(index<seq.length-1){draft.stepId=seq[index+1];saveDraft();renderStep();}else showProcessing(); });
  let finalizing = false;
  $('faroFinish').addEventListener('click', () => {
    if (finalizing || app.state.onboardingComplete) return;
    finalizing = true;
    const finishButton = $('faroFinish');
    finishButton.disabled = true;
    app.state.onboardingComplete = true;
    try {
      app.save();
    } catch (error) {
      app.state.onboardingComplete = false;
      finalizing = false;
      finishButton.disabled = false;
      console.error('FARO onboarding: falha ao persistir conclusão', error);
      app.toast('Não foi possível concluir agora. Tente novamente.');
      return;
    }
    app.syncInputs();
    app.render();
    clearDraft();
    modal.classList.add('hidden');
    app.navigateToPrimary('dashboard');
    window.dispatchEvent(new CustomEvent('faro:onboarding-complete'));
    app.toast('Seu FARO está pronto. Ajuste quando sua rotina mudar.');
  });

  $('faroRentalWeekly').value = draft.rentalWeekly || ''; $('faroRentalDue').value = draft.rentalDueWeekday === '' ? '' : String(draft.rentalDueWeekday);
  $('faroFinanceMonthly').value = draft.financeMonthly || ''; $('faroFinanceDue').value = draft.financeDueDay || '';
  $('faroReserveName').value = draft.reserveDraft.name || ''; $('faroReserveValue').value = draft.reserveDraft.value || '';
  $('faroRevenueKm').value = draft.revenueKm; $('faroRevenueEstimate').classList.toggle('hidden',!draft.revenueEstimated);
  syncTarget(draft.target); renderEnergy(false); renderCosts();
  if (draft.stepId === 'processing') showProcessing();
  else if (draft.stepId === 'result') showResult();
  else renderStep();
  modal.classList.remove('hidden');
})();

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

  // F5 (docs/decisoes/onboarding-3-perguntas.md): 3 perguntas, o resto vira estimativa marcada.
  const DEFAULTS = Object.freeze({
    days: 6,
    target: 4000,
    rentedWeekly: 650,
    rentedDueWeekday: 1,
    financedMonthly: 1100,
    financedDueDay: 10,
    electricPrice: 0.95,
    electricBatteryKwh: 45,
    electricRangeKm: 280
  });
  const TARGET_CHOICES = [[3000, 'Rodando bem'], [4000, 'O mais comum'], [5000, 'Pé na estrada']];
  const energyKey = choice => choice === 'flex' ? 'gasoline' : choice;
  const PROFILE_CARD_KEY = 'faro-profile-card-v1';

  const injectStyles = () => {
    if ($('faroOnboardingStyles')) return;
    const style = document.createElement('style');
    style.id = 'faroOnboardingStyles';
    style.textContent = `
      #onboardingModal .onboarding-sheet{max-height:min(92dvh,800px);overflow:auto;overscroll-behavior:contain}
      #onboardingModal .faro-ob-head{display:flex;align-items:center;gap:10px}
      #onboardingModal .faro-ob-back{min-width:48px;min-height:48px;border-radius:14px;border:1px solid var(--faro-line);font-size:14px;font-weight:900;color:var(--faro-ink);background:transparent}
      #onboardingModal .faro-ob-steps{display:flex;gap:6px;flex:1}#onboardingModal .faro-ob-steps i{flex:1;height:4px;border-radius:4px;background:var(--faro-line)}#onboardingModal .faro-ob-steps i.on{background:var(--faro-amber)}
      #onboardingModal .faro-ob-count{font-size:12px;font-weight:900;color:var(--faro-muted);white-space:nowrap}
      #onboardingModal .faro-ob-q{font-size:24px;font-weight:900;line-height:1.15;margin:18px 0 14px;color:var(--faro-ink)}
      #onboardingModal .faro-choice{display:flex;width:100%;align-items:center;justify-content:space-between;gap:12px;min-height:56px;border:1px solid var(--faro-line);border-radius:16px;padding:12px 14px;font-size:16px;font-weight:800;color:var(--faro-ink);background:var(--faro-surface);text-align:left;transition:.16s ease}
      #onboardingModal .faro-choice small{display:block;font-size:12px;font-weight:600;color:var(--faro-muted);margin-top:2px}
      #onboardingModal .faro-choice:focus-visible,#onboardingModal button:focus-visible,#onboardingModal input:focus-visible{outline:3px solid var(--faro-focus);outline-offset:2px}
      #onboardingModal .faro-choice:active{transform:scale(.98)}
      #onboardingModal .faro-options{display:grid;gap:8px}
      #onboardingModal .faro-options.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
      #onboardingModal .faro-helper{font-size:12px;line-height:1.5;color:var(--faro-muted)}
      #onboardingModal .faro-estimate{display:inline-flex;border-radius:999px;background:var(--faro-amber-soft);color:var(--faro-amber-text);padding:6px 9px;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}
      #onboardingModal .faro-money{appearance:textfield;-moz-appearance:textfield}
      #onboardingModal .faro-money::-webkit-outer-spin-button,#onboardingModal .faro-money::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      #onboardingModal .faro-target{display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:20px;padding:16px}
      #onboardingModal .faro-target input{width:140px;background:transparent;color:inherit;font-size:26px;font-weight:900;text-align:right;border:0;outline:0}
      #onboardingModal .faro-card{border:1px solid var(--faro-line);border-radius:18px;padding:14px}
      #onboardingModal .faro-field + .faro-field{margin-top:18px}
      #onboardingModal .faro-stepper{display:grid;grid-template-columns:48px minmax(0,1fr) 48px;gap:8px;align-items:center;margin-top:8px}
      #onboardingModal .faro-stepper button{min-width:48px;min-height:48px;border-radius:14px;border:1px solid var(--faro-line);font-size:22px;font-weight:900;color:var(--faro-ink);background:var(--faro-surface)}
      #onboardingModal .faro-stepper button:active{transform:scale(.96)}
      #onboardingModal .faro-stepper input{min-height:48px;width:100%;border:1px solid var(--faro-line);border-radius:14px;background:var(--faro-surface);color:var(--faro-ink);font-size:20px;font-weight:900;text-align:center}
      #onboardingModal .faro-stepper input[aria-invalid="true"]{border-color:var(--faro-amber-text)}
      #onboardingModal .faro-error{min-height:18px;font-size:12px;line-height:1.5;font-weight:800;color:var(--faro-amber-text);margin-top:4px}
      #onboardingModal .faro-story{border-radius:18px;padding:14px;font-size:14px;line-height:1.55;color:var(--faro-ink)}
      #onboardingModal .faro-plan-hero{border-radius:24px;padding:20px}
      #onboardingModal .faro-plan-value{font-size:42px;font-weight:900;letter-spacing:-.05em;line-height:1}
      #onboardingModal .faro-primary-cta{width:100%;min-height:56px;border-radius:16px;font-size:16px;font-weight:900;background:var(--faro-amber);color:var(--faro-on-amber)}
      #onboardingModal [data-faro-step]:not(.hidden){animation:faroStepIn .18s ease-out}
      @keyframes faroStepIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      @media(prefers-reduced-motion:reduce){#onboardingModal [data-faro-step]:not(.hidden){animation:none!important}#onboardingModal .faro-choice{transition:none}}
      #faroCompleteProfile{border:1px solid var(--faro-line);border-radius:18px;padding:14px;margin-top:12px;background:var(--faro-surface);color:var(--faro-ink)}
      #faroCompleteProfile p{font-size:12px;line-height:1.5;color:var(--faro-muted);margin-top:4px}
      #faroCompleteProfile .faro-cp-actions{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}
      #faroCompleteProfile button{min-height:48px;border-radius:14px;padding:0 14px;font-size:14px;font-weight:900}
      #faroCompleteProfile .faro-cp-go{background:var(--faro-amber);color:var(--faro-on-amber)}
      #faroCompleteProfile .faro-cp-later{background:transparent;color:var(--faro-muted);border:1px solid var(--faro-line)}
      #faroCompleteProfile button:focus-visible{outline:3px solid var(--faro-focus);outline-offset:2px}
    `;
    document.head.appendChild(style);
  };

  ensureElectricInSettings();
  injectStyles();

  // Cartão discreto "Completar meu perfil": só aparece quando o plano usa estimativas.
  const profileNeedsCompletion = () => {
    const profile = app.state.onboardingProfile;
    if (!app.state.onboardingComplete || !profile || profile.version !== 3 || !profile.estimated) return false;
    try { if (localStorage.getItem(PROFILE_CARD_KEY) === 'dismissed') return false; } catch {}
    return Object.values(profile.estimated).some(Boolean);
  };
  const mountProfileCard = () => {
    const home = $('view-dashboard');
    const existing = $('faroCompleteProfile');
    if (!profileNeedsCompletion()) { existing?.remove(); return; }
    if (!home || existing) return;
    const card = document.createElement('section');
    card.id = 'faroCompleteProfile';
    card.setAttribute('aria-label', 'Completar meu perfil');
    card.innerHTML = `<strong class="block text-sm">Completar meu perfil</strong><p>Receita por km, preço do combustível e contas fixas ainda são estimativas. Ajuste para o lucro real ficar exato.</p><div class="faro-cp-actions"><button type="button" class="faro-cp-go" data-profile-complete>Completar meu perfil</button><button type="button" class="faro-cp-later" data-profile-later>Agora não</button></div>`;
    home.appendChild(card);
    card.querySelector('[data-profile-complete]').addEventListener('click', () => {
      app.navigateToPrimary('planning');
      setTimeout(() => { try { window.FaroPlanning?.openOperation?.(); } catch (error) { console.error('FARO perfil: falha ao abrir operação', error); } }, 60);
    });
    card.querySelector('[data-profile-later]').addEventListener('click', () => {
      try { localStorage.setItem(PROFILE_CARD_KEY, 'dismissed'); } catch {}
      card.remove();
    });
  };
  window.addEventListener('faro:onboarding-complete', () => setTimeout(mountProfileCard, 0));
  window.FaroProfileCard = Object.freeze({ mount: mountProfileCard, needsCompletion: profileNeedsCompletion });
  setTimeout(mountProfileCard, 0);

  const modal = $('onboardingModal');
  if (!modal || app.state.onboardingComplete) return;

  const freshDraft = () => ({
    version: 3,
    stepId: 'vehicle',
    days: DEFAULTS.days,
    vehicle: '',
    vehicleCost: 0,
    vehicleCostEstimated: true,
    target: Number(app.state.targetProfit) || DEFAULTS.target,
    targetChosen: false,
    energyChoice: '',
    energy: 'gnv',
    energyPrice: ENERGY.gnv.price,
    energyEfficiency: ENERGY.gnv.efficiency,
    batteryKwh: 0,
    rangeKm: 0,
    revenueKm: DEFAULT_REVENUE_KM
  });

  const loadDraft = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!saved || saved.version !== 3) return freshDraft();
      return { ...freshDraft(), ...saved };
    } catch { return freshDraft(); }
  };

  const draft = loadDraft();
  const saveDraft = () => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {} };

  modal.innerHTML = `
    <div class="modal-sheet onboarding-sheet">
      <div id="faroOnboardingHeader" class="faro-ob-head">
        <button id="faroBack" type="button" class="faro-ob-back invisible" aria-label="Voltar">‹</button>
        <div class="faro-ob-steps" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <span id="faroOnboardingProgress" class="faro-ob-count"></span>
      </div>

      <section data-faro-step="vehicle" class="hidden">
        <h3 class="faro-ob-q">Seu carro é...</h3>
        <div class="faro-options" role="radiogroup" aria-label="Seu carro é">
          <button type="button" data-vehicle="own" class="faro-choice" role="radio" aria-checked="false"><span>Próprio<small>Sem parcela nem aluguel</small></span></button>
          <button type="button" data-vehicle="financed" class="faro-choice" role="radio" aria-checked="false"><span>Financiado<small>Tem parcela todo mês</small></span></button>
          <button type="button" data-vehicle="rented" class="faro-choice" role="radio" aria-checked="false"><span>Alugado<small>Pago aluguel da locadora</small></span></button>
        </div>
        <div id="faroVehicleCostField" class="hidden mt-4">
          <div class="flex justify-between items-center gap-3"><label id="faroVehicleCostLabel" for="faroVehicleMonthly" class="label-micro !mb-0">Valor</label><span id="faroVehicleCostEstimate" class="faro-estimate">estimativa</span></div>
          <div class="input-wrapper mt-2"><span>R$</span><input id="faroVehicleMonthly" class="input-vetta faro-money" type="number" inputmode="decimal" min="0" step="10"></div>
          <p class="faro-helper mt-1">Corrija se souber o valor certo. Dá para ajustar depois em Planejar.</p>
        </div>
      </section>

      <section data-faro-step="target" class="hidden">
        <h3 class="faro-ob-q">Quanto quer sobrar por mês?</h3>
        <div class="faro-options" role="radiogroup" aria-label="Quanto quer sobrar por mês">
          <button type="button" data-target-choice="3000" class="faro-choice" role="radio" aria-checked="false"><span>R$ 3.000<small>Rodando bem</small></span></button>
          <button type="button" data-target-choice="4000" class="faro-choice" role="radio" aria-checked="false"><span>R$ 4.000<small>O mais comum</small></span></button>
          <button type="button" data-target-choice="5000" class="faro-choice" role="radio" aria-checked="false"><span>R$ 5.000<small>Pé na estrada</small></span></button>
          <button type="button" data-target-choice="other" class="faro-choice" role="radio" aria-checked="false"><span>Outro valor<small>Digite quanto quer</small></span></button>
        </div>
        <div id="faroTargetOther" class="hidden mt-4 space-y-3">
          <div class="faro-target faro-card"><div><span class="text-xs uppercase tracking-widest font-extrabold">Sobrar no mês</span><strong class="block mt-1">R$ por mês</strong></div><input id="faroTargetNumber" class="faro-money" type="number" min="500" max="50000" step="100" inputmode="numeric" aria-label="Quanto quer sobrar por mês"></div>
          <input id="faroTargetSlider" type="range" min="500" max="20000" step="100" class="w-full" aria-label="Objetivo líquido mensal">
        </div>
      </section>

      <section data-faro-step="energy" class="hidden">
        <h3 class="faro-ob-q">Qual combustível?</h3>
        <div class="faro-options cols-2" role="radiogroup" aria-label="Qual combustível">
          <button type="button" data-energy-choice="gasoline" class="faro-choice" role="radio" aria-checked="false"><span>Gasolina</span></button>
          <button type="button" data-energy-choice="ethanol" class="faro-choice" role="radio" aria-checked="false"><span>Etanol</span></button>
          <button type="button" data-energy-choice="flex" class="faro-choice" role="radio" aria-checked="false"><span>Flex</span></button>
          <button type="button" data-energy-choice="gnv" class="faro-choice" role="radio" aria-checked="false"><span>GNV</span></button>
          <button type="button" data-energy-choice="electric" class="faro-choice" role="radio" aria-checked="false"><span>Elétrico</span></button>
        </div>
        <p class="faro-helper mt-3">Usamos preço e consumo médios. Você ajusta depois.</p>
      </section>

      <section data-faro-step="consumption" class="hidden">
        <h3 class="faro-ob-q">Quanto seu carro faz?</h3>
        <div class="faro-field">
          <div class="flex justify-between items-center gap-3"><label id="faroConsumptionLabel" for="faroConsumption" class="label-micro !mb-0">Consumo</label><span id="faroConsumptionEstimate" class="faro-estimate">estimativa</span></div>
          <div class="faro-stepper"><button id="faroConsumptionMinus" type="button" aria-label="Diminuir consumo">−</button><input id="faroConsumption" class="faro-money" type="number" inputmode="decimal" min="1" max="40" step="0.1" aria-describedby="faroConsumptionError"><button id="faroConsumptionPlus" type="button" aria-label="Aumentar consumo">+</button></div>
          <p id="faroConsumptionError" class="faro-error" role="alert"></p>
        </div>
        <p class="faro-helper">Dica: veja no painel do carro ou no último abastecimento.</p>
        <button id="faroConsumptionNext" type="button" class="faro-primary-cta mt-5">Continuar</button>
      </section>

      <section data-faro-step="price" class="hidden">
        <h3 class="faro-ob-q">Quanto paga no combustível?</h3>
        <div class="faro-field">
          <div class="flex justify-between items-center gap-3"><label id="faroPriceLabel" for="faroEnergyPrice" class="label-micro !mb-0">Preço</label><span id="faroPriceEstimate" class="faro-estimate">estimativa</span></div>
          <div class="faro-stepper"><button id="faroPriceMinus" type="button" aria-label="Diminuir preço">−</button><input id="faroEnergyPrice" class="faro-money" type="number" inputmode="decimal" min="0" max="20" step="0.01" aria-describedby="faroPriceError"><button id="faroPricePlus" type="button" aria-label="Aumentar preço">+</button></div>
          <p id="faroPriceError" class="faro-error" role="alert"></p>
        </div>
        <p class="faro-helper">Dica: veja a bomba ou o último abastecimento.</p>
        <button id="faroPriceNext" type="button" class="faro-primary-cta mt-5">Continuar</button>
      </section>

      <section data-faro-step="result" class="hidden space-y-4">
        <div><span id="faroPlanStatus" class="faro-estimate">estimativa inicial</span><h3 class="text-2xl font-extrabold mt-3">Seu plano está pronto.</h3><p id="faroPlanExplanation" class="text-sm mt-2 leading-relaxed faro-helper"></p></div>
        <p id="faroPlanStory" class="faro-story faro-card"></p>
        <div class="faro-plan-hero"><span class="text-xs uppercase tracking-widest font-extrabold">Faturamento necessário por dia</span><strong id="faroPlanDailyGross" class="faro-plan-value block mt-2">R$ 0</strong><p id="faroPlanDailyHint" class="text-xs mt-3"></p></div>
        <div class="grid grid-cols-2 gap-2"><div class="faro-card"><span class="label-micro block">Bruto necessário/semana</span><strong id="faroPlanWeek" class="text-lg"></strong></div><div class="faro-card"><span class="label-micro block">Custo variável/km</span><strong id="faroPlanEnergyKm" class="text-lg"></strong></div></div>
      </section>

      <button id="faroNext" type="button" class="hidden faro-primary-cta mt-5">Continuar</button>
      <button id="faroFinish" type="button" class="hidden faro-primary-cta mt-5">Ir para o Início</button>
      <p id="faroOnboardingFoot" class="faro-helper text-center mt-3">Dá pra ajustar tudo depois.</p>
    </div>`;

  const sections = [...modal.querySelectorAll('[data-faro-step]')];
  const SEQUENCE = ['vehicle', 'target', 'energy', 'consumption', 'price', 'result'];
  const RANGE = Object.freeze({ efficiencyMin: 1, efficiencyMax: 40, priceMax: 20 });
  const progressText = id => `Passo ${SEQUENCE.indexOf(id) + 1} de ${SEQUENCE.length}`;
  const hasVehicleCost = () => draft.vehicle === 'rented' || draft.vehicle === 'financed';

  const markChoice = (selector, key, value) => modal.querySelectorAll(selector).forEach(button => {
    const on = String(button.dataset[key]) === String(value);
    button.classList.toggle('active', on);
    button.setAttribute('aria-checked', String(on));
  });

  const syncTarget = value => {
    const parsed = Math.max(500, Math.min(50000, n(value) || 500));
    draft.target = parsed;
    $('faroTargetNumber').value = parsed;
    $('faroTargetSlider').value = Math.min(20000, parsed);
    saveDraft();
  };

  const renderVehicleCost = () => {
    const show = hasVehicleCost();
    $('faroVehicleCostField').classList.toggle('hidden', !show);
    if (!show) return;
    $('faroVehicleCostLabel').textContent = draft.vehicle === 'rented' ? 'Quanto paga de aluguel por semana?' : 'Quanto paga de parcela por mês?';
    $('faroVehicleMonthly').value = draft.vehicleCost || '';
    $('faroVehicleCostEstimate').classList.toggle('hidden', !draft.vehicleCostEstimated);
  };

  const applyEnergy = choice => {
    draft.energyChoice = choice;
    draft.consumptionTouched = false;
    draft.energy = energyKey(choice);
    if (draft.energy === 'electric') {
      draft.energyPrice = DEFAULTS.electricPrice;
      draft.batteryKwh = DEFAULTS.electricBatteryKwh;
      draft.rangeKm = DEFAULTS.electricRangeKm;
      draft.energyEfficiency = draft.batteryKwh > 0 ? draft.rangeKm / draft.batteryKwh : 0;
    } else {
      const preset = ENERGY[draft.energy] || ENERGY.gnv;
      draft.energyPrice = preset.price;
      draft.energyEfficiency = preset.efficiency;
      draft.batteryKwh = 0;
      draft.rangeKm = 0;
    }
    saveDraft();
  };

  const energyName = () => draft.energy === 'gnv' ? 'GNV' : (ENERGY[draft.energy] || ENERGY.gnv).label.toLowerCase();
  const energyUnit = () => (ENERGY[draft.energy] || ENERGY.gnv).unit;
  const effUnit = () => draft.energy === 'electric' ? 'km/kWh' : `km/${energyUnit() === 'L' ? 'l' : energyUnit()}`;
  const fmt = (value, digits = 1) => Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits });
  const round = (value, digits) => Math.round(value * 10 ** digits) / 10 ** digits;

  const renderConsumption = () => {
    const unit = energyUnit();
    $('faroConsumptionLabel').textContent = `Quanto o carro faz (${effUnit()})`;
    $('faroPriceLabel').textContent = `Preço por ${unit} (${(ENERGY[draft.energy] || ENERGY.gnv).label})`;
    $('faroConsumption').value = round(draft.energyEfficiency, 1) || '';
    $('faroEnergyPrice').value = round(draft.energyPrice, 2);
    $('faroConsumptionEstimate').classList.toggle('hidden', Boolean(draft.consumptionTouched));
    $('faroPriceEstimate').classList.toggle('hidden', Boolean(draft.consumptionTouched));
    ['faroConsumption', 'faroEnergyPrice'].forEach(id => $(id).removeAttribute('aria-invalid'));
    $('faroConsumptionError').textContent = '';
    $('faroPriceError').textContent = '';
  };

  const markConsumptionTouched = () => { draft.consumptionTouched = true; $('faroConsumptionEstimate').classList.add('hidden'); $('faroPriceEstimate').classList.add('hidden'); };
  const setEfficiency = value => {
    draft.energyEfficiency = value;
    if (draft.energy === 'electric' && draft.batteryKwh > 0) draft.rangeKm = value * draft.batteryKwh;
  };
  const nudge = (id, delta, digits, min, max) => {
    const current = n($(id).value) || 0;
    const next = Math.max(min, Math.min(max, round(current + delta, digits)));
    $(id).value = next;
    markConsumptionTouched();
    saveDraft();
  };

  // Valida cada resposta na sua tela; só grava no rascunho quando está dentro da faixa.
  const confirmConsumption = () => {
    const input = $('faroConsumption');
    const efficiency = draft.consumptionTouched ? n(input.value) : draft.energyEfficiency;
    const ok = efficiency >= RANGE.efficiencyMin && efficiency <= RANGE.efficiencyMax;
    input.setAttribute('aria-invalid', String(!ok));
    $('faroConsumptionError').textContent = ok ? '' : `Informe quanto o carro faz, entre ${RANGE.efficiencyMin} e ${RANGE.efficiencyMax} ${effUnit()}.`;
    if (!ok) { input.focus({ preventScroll:true }); return false; }
    setEfficiency(efficiency);
    saveDraft();
    return true;
  };
  const confirmPrice = () => {
    const input = $('faroEnergyPrice');
    const price = draft.consumptionTouched ? n(input.value) : draft.energyPrice;
    const ok = price > 0 && price <= RANGE.priceMax;
    input.setAttribute('aria-invalid', String(!ok));
    $('faroPriceError').textContent = ok ? '' : `Informe o preço por ${energyUnit()}, maior que 0 e até ${RANGE.priceMax} reais.`;
    if (!ok) { input.focus({ preventScroll:true }); return false; }
    draft.energyPrice = price;
    saveDraft();
    return true;
  };

  const renderStep = () => {
    if (!SEQUENCE.includes(draft.stepId) || draft.stepId === 'result') draft.stepId = SEQUENCE[0];
    const index = SEQUENCE.indexOf(draft.stepId);
    sections.forEach(section => section.classList.toggle('hidden', section.dataset.faroStep !== draft.stepId));
    $('faroOnboardingHeader').classList.remove('hidden');
    $('faroOnboardingProgress').textContent = progressText(draft.stepId);
    modal.querySelectorAll('.faro-ob-steps i').forEach((bar, i) => bar.classList.toggle('on', i <= index));
    $('faroBack').classList.toggle('invisible', index === 0);
    $('faroFinish').classList.add('hidden');
    $('faroOnboardingFoot').classList.remove('hidden');
    markChoice('[data-vehicle]', 'vehicle', draft.vehicle);
    markChoice('[data-target-choice]', 'targetChoice', draft.targetChosen ? (TARGET_CHOICES.some(([v]) => v === draft.target) && !draft.targetOther ? draft.target : 'other') : '');
    markChoice('[data-energy-choice]', 'energyChoice', draft.energyChoice);
    renderVehicleCost();
    if (draft.stepId === 'consumption' || draft.stepId === 'price') renderConsumption();
    $('faroTargetOther').classList.toggle('hidden', !draft.targetOther);
    const needsNext = (draft.stepId === 'vehicle' && hasVehicleCost()) || (draft.stepId === 'target' && draft.targetOther);
    $('faroNext').classList.toggle('hidden', !needsNext);
    $('faroOnboardingFoot').classList.toggle('hidden', draft.stepId === 'consumption' || draft.stepId === 'price');
    saveDraft();
  };

  const goTo = stepId => { draft.stepId = stepId; saveDraft(); renderStep(); };

  const buildCosts = () => {
    const costs = [];
    if (draft.vehicle === 'rented') costs.push({ id:'rental-onboarding', name:'Aluguel do carro', kind:'weekly', category:'obligation', value:draft.vehicleCost, active:true, dueWeekday:DEFAULTS.rentedDueWeekday, source:'onboarding' });
    if (draft.vehicle === 'financed') costs.push({ id:'finance-onboarding', name:'Parcela do carro', kind:'monthly', category:'obligation', value:draft.vehicleCost, active:true, dueDay:clampDueDay(DEFAULTS.financedDueDay), source:'onboarding' });
    return costs;
  };

  // Grava o núcleo (mesmos campos de antes) sem concluir: o gesto final é do faro-onboarding-commit.js.
  const commitDraftToState = () => {
    const preset = ENERGY[draft.energy] || ENERGY.gnv;
    if (draft.energy === 'electric' && (draft.energyPrice <= 0 || draft.batteryKwh <= 0 || draft.rangeKm <= 0)) applyEnergy('electric');
    if (draft.energy !== 'electric' && (draft.energyPrice <= 0 || draft.energyEfficiency <= 0)) applyEnergy(draft.energyChoice || 'gnv');
    app.state.targetProfit = draft.target;
    app.state.workWeekdays = app.weekdaysForCount(draft.days);
    app.state.fuel = { type:draft.energy, label:preset.label, unit:preset.unit, price:draft.energyPrice, efficiency:draft.energyEfficiency };
    app.state.revenueKm = draft.revenueKm;
    app.state.costs = buildCosts();
    app.state.onboardingProfile = {
      version:3, vehicle:draft.vehicle, energyChoice:draft.energyChoice, configuredAt:new Date().toISOString(),
      revenueKmEstimated:true, energyPriceEstimated:!draft.consumptionTouched, energyEfficiencyEstimated:!draft.consumptionTouched,
      electric:draft.energy === 'electric' ? { batteryCapacityKwh:draft.batteryKwh, rangePerChargeKm:draft.rangeKm } : null,
      reserveConfigured:false, maintenancePerKmDeferred:true, installGateVersion:1,
      estimated:{ workDays:true, revenueKm:true, energyPrice:!draft.consumptionTouched, energyEfficiency:!draft.consumptionTouched, fixedCosts:true, reserve:true, maintenancePerKm:true, vehicleCost:hasVehicleCost() && draft.vehicleCostEstimated, vehicleDueDate:hasVehicleCost() }
    };
    app.state.onboardingComplete = false;
    app.save();
  };

  const showResult = () => {
    draft.stepId = 'result';
    saveDraft();
    app.state.onboardingComplete = false;
    app.save();
    const c = app.calculations();
    sections.forEach(section => section.classList.toggle('hidden', section.dataset.faroStep !== 'result'));
    $('faroOnboardingHeader').classList.remove('hidden');
    $('faroOnboardingProgress').textContent = progressText('result');
    modal.querySelectorAll('.faro-ob-steps i').forEach(bar => bar.classList.add('on'));
    $('faroBack').classList.remove('invisible');
    $('faroNext').classList.add('hidden');
    $('faroOnboardingFoot').classList.add('hidden');
    $('faroPlanDailyGross').textContent = app.money(c.dailyGross, 0);
    const vehicle = draft.vehicle === 'rented' ? ` com aluguel de ${app.money(draft.vehicleCost, 0)}/semana` : draft.vehicle === 'financed' ? ` com parcela de ${app.money(draft.vehicleCost, 0)}/mês` : '';
    $('faroPlanExplanation').textContent = `Para sobrar ${app.money(draft.target, 0)} no mês${vehicle}. Preço do combustível, receita por km e contas fixas são estimativas até você completar o perfil.`;
    const week = app.weekContext(c);
    $('faroPlanDailyHint').textContent = `${draft.days} dias por semana · ${app.integer(c.dailyKm)} km por dia`;
    $('faroPlanEnergyKm').textContent = `${app.money(c.fuelKm)}/km`;
    $('faroPlanWeek').textContent = app.money(week.target, 0);
    const per100 = app.money(c.fuelKm * 100);
    const weekKm = app.integer(c.dailyKm * draft.days);
    $('faroPlanStory').textContent = `Com seu carro fazendo ${fmt(draft.energyEfficiency)} ${effUnit()} e ${energyName()} a ${app.money(draft.energyPrice)}/${energyUnit()}, cada 100 km custa ${per100} de combustível. Para sobrar ${app.money(draft.target, 0)} por mês você precisa faturar ~${app.money(week.target, 0)} por semana e rodar ~${weekKm} km por semana.`;
    $('faroFinish').classList.remove('hidden');
  };

  const finishQuestions = () => {
    commitDraftToState();
    showResult();
  };

  modal.querySelectorAll('[data-vehicle]').forEach(button => button.addEventListener('click', () => {
    const vehicle = button.dataset.vehicle;
    if (draft.vehicle !== vehicle) {
      draft.vehicleCost = vehicle === 'rented' ? DEFAULTS.rentedWeekly : vehicle === 'financed' ? DEFAULTS.financedMonthly : 0;
      draft.vehicleCostEstimated = true;
    }
    draft.vehicle = vehicle;
    saveDraft();
    if (hasVehicleCost()) { renderStep(); requestAnimationFrame(() => $('faroVehicleMonthly')?.focus({ preventScroll:true })); }
    else goTo('target');
  }));
  $('faroVehicleMonthly').addEventListener('input', e => { draft.vehicleCost = n(e.target.value); draft.vehicleCostEstimated = false; $('faroVehicleCostEstimate').classList.add('hidden'); saveDraft(); });

  modal.querySelectorAll('[data-target-choice]').forEach(button => button.addEventListener('click', () => {
    draft.targetChosen = true;
    if (button.dataset.targetChoice === 'other') { draft.targetOther = true; syncTarget(draft.target); renderStep(); requestAnimationFrame(() => $('faroTargetNumber')?.focus({ preventScroll:true })); return; }
    draft.targetOther = false;
    syncTarget(Number(button.dataset.targetChoice));
    goTo('energy');
  }));
  $('faroTargetSlider').addEventListener('input', e => syncTarget(e.target.value));
  $('faroTargetNumber').addEventListener('input', e => { if (e.target.value !== '') syncTarget(e.target.value); });
  $('faroTargetNumber').addEventListener('blur', e => { if (e.target.value === '') e.target.value = draft.target; });

  modal.querySelectorAll('[data-energy-choice]').forEach(button => button.addEventListener('click', () => {
    applyEnergy(button.dataset.energyChoice);
    markChoice('[data-energy-choice]', 'energyChoice', draft.energyChoice);
    goTo('consumption');
    requestAnimationFrame(() => $('faroConsumption')?.focus({ preventScroll:true }));
  }));

  $('faroConsumptionMinus').addEventListener('click', () => nudge('faroConsumption', -0.5, 1, RANGE.efficiencyMin, RANGE.efficiencyMax));
  $('faroConsumptionPlus').addEventListener('click', () => nudge('faroConsumption', 0.5, 1, RANGE.efficiencyMin, RANGE.efficiencyMax));
  $('faroPriceMinus').addEventListener('click', () => nudge('faroEnergyPrice', -0.1, 2, 0.01, RANGE.priceMax));
  $('faroPricePlus').addEventListener('click', () => nudge('faroEnergyPrice', 0.1, 2, 0.01, RANGE.priceMax));
  ['faroConsumption', 'faroEnergyPrice'].forEach(id => $(id).addEventListener('input', e => {
    markConsumptionTouched();
    e.target.removeAttribute('aria-invalid');
    $(id === 'faroConsumption' ? 'faroConsumptionError' : 'faroPriceError').textContent = '';
    const value = n(e.target.value);
    if (id === 'faroConsumption' && value >= RANGE.efficiencyMin && value <= RANGE.efficiencyMax) setEfficiency(value);
    if (id === 'faroEnergyPrice' && value > 0 && value <= RANGE.priceMax) draft.energyPrice = value;
    saveDraft();
  }));
  $('faroConsumptionNext').addEventListener('click', () => { if (confirmConsumption()) { goTo('price'); requestAnimationFrame(() => $('faroEnergyPrice')?.focus({ preventScroll:true })); } });
  $('faroPriceNext').addEventListener('click', () => { if (confirmPrice()) finishQuestions(); });

  $('faroNext').addEventListener('click', () => {
    if (draft.stepId === 'vehicle') {
      draft.vehicleCost = n($('faroVehicleMonthly').value);
      if (draft.vehicleCost <= 0) { app.toast(draft.vehicle === 'rented' ? 'Informe quanto paga de aluguel por semana.' : 'Informe quanto paga de parcela por mês.'); return; }
      goTo('target');
    } else if (draft.stepId === 'target') {
      syncTarget($('faroTargetNumber').value || draft.target);
      goTo('energy');
    }
  });
  $('faroBack').addEventListener('click', () => {
    if (draft.stepId === 'result') { goTo('price'); return; }
    const index = SEQUENCE.indexOf(draft.stepId);
    if (index > 0) goTo(SEQUENCE[index - 1]);
  });

  syncTarget(draft.target);
  if (draft.stepId === 'result') showResult();
  else renderStep();
  modal.classList.remove('hidden');
})();

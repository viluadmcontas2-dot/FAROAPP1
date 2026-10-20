// FARO — tela "Plano" (mockup aprovado 6). Regras puras + interface da seção de assinatura.
// Quem busca dados (sessão, assinatura, trial) é o faro-account.js; aqui só se decide e se mostra.
// Nada aqui liga a cobrança: com billingEnabled=false o botão de assinar fica "Em breve".
(root => {
  if (root.FaroPlans) return;

  const PRICE = { monthly: 22.99, promo: 14.9, promoMonths: 5, trialDays: 7, warnDay: 6, chooseDay: 8 };
  const PROMO_CODE = 'PRAGAS';
  const PROMO_KEY = 'faro-promo-code-v1';
  const DAY = 86400000;
  const PAID = new Set(['active', 'trialing', 'past_due']);

  const brl = value => 'R$ ' + value.toFixed(2).replace('.', ',');
  const savings = () => Math.round((PRICE.monthly - PRICE.promo) * PRICE.promoMonths * 100) / 100;
  const normalizeCode = raw => String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  const knownCode = code => normalizeCode(code) === PROMO_CODE;

  // Estado único da tela a partir dos fatos da conta.
  const computeState = ({ signedIn = false, anonymous = false, trialEndsAt = null, subscription = null, now = Date.now() } = {}) => {
    if (!signedIn || anonymous) return { kind: 'anon' };
    const status = subscription?.status || 'inactive';
    const periodEnd = subscription?.current_period_end ? Date.parse(subscription.current_period_end) : null;
    if (PAID.has(status) && (!periodEnd || periodEnd > now)) return { kind: 'subscriber', status, portal: Boolean(subscription?.stripe_customer_id) };
    const ends = trialEndsAt ? Date.parse(trialEndsAt) : NaN;
    if (Number.isFinite(ends)) {
      const daysLeft = Math.ceil((ends - now) / DAY);
      if (daysLeft <= 0) return { kind: 'expired', portal: Boolean(subscription?.stripe_customer_id) };
      return { kind: daysLeft <= 2 ? 'trial-ending' : 'trial', daysLeft, endsAt: new Date(ends).toISOString() };
    }
    // Conta sem trial registrado (anterior ao trial do servidor): oferece assinar, sem travar nada.
    return { kind: 'no-trial', portal: Boolean(subscription?.stripe_customer_id) };
  };

  const daysText = n => n === 1 ? 'Falta 1 dia' : `Faltam ${n} dias`;

  // Textos por estado: [título, texto, ação do botão principal].
  const copyFor = (state, billingEnabled) => {
    const soon = 'Em breve';
    const pay = billingEnabled ? 'Assinar FARO' : soon;
    switch (state.kind) {
      case 'anon': return { title: 'Um plano. Tudo liberado.', text: `Teste ${PRICE.trialDays} dias sem colocar cartão. Crie sua conta com e-mail para começar.`, badge: '', action: 'signup', label: `Testar ${PRICE.trialDays} dias grátis` };
      case 'trial': return { title: 'Teste grátis ativo', text: 'Tudo liberado. Nada é cobrado sozinho.', badge: daysText(state.daysLeft), action: 'checkout', label: pay };
      case 'trial-ending': return { title: state.daysLeft === 1 ? 'Seu teste acaba amanhã' : `Seu teste acaba em ${state.daysLeft} dias`, text: billingEnabled ? 'Assine para continuar salvando na nuvem. Seus dados ficam com você.' : 'A assinatura ainda não abriu. Seus dados continuam salvos.', badge: daysText(state.daysLeft), action: 'checkout', label: pay };
      case 'expired': return { title: 'Seu teste acabou', text: billingEnabled ? 'Seus dados continuam aqui: dá para ver e exportar. Assine para voltar a registrar.' : 'A assinatura ainda não abriu. Nada muda por enquanto e seus dados continuam salvos.', badge: 'Teste encerrado', action: 'checkout', label: pay };
      case 'subscriber': return { title: state.status === 'past_due' ? 'Pagamento precisa de atenção' : 'Assinatura ativa', text: state.status === 'past_due' ? 'Seus dados continuam salvos. Atualize o pagamento quando puder.' : 'Tudo liberado. Cancele quando quiser.', badge: 'Assinante', action: 'portal', label: billingEnabled ? 'Gerenciar assinatura' : soon };
      default: return { title: 'Um plano. Tudo liberado.', text: 'Assine quando quiser. Seus dados continuam salvos.', badge: '', action: state.portal ? 'portal' : 'checkout', label: billingEnabled ? (state.portal ? 'Gerenciar assinatura' : 'Assinar FARO') : soon };
    }
  };

  const readCode = () => { try { return normalizeCode(root.localStorage?.getItem(PROMO_KEY)); } catch { return ''; } };
  const writeCode = code => { try { code ? root.localStorage.setItem(PROMO_KEY, code) : root.localStorage.removeItem(PROMO_KEY); } catch {} };

  // Interface: montada uma vez; update() só troca textos e visibilidade (os ouvintes do faro-account.js continuam ligados).
  const mount = container => {
    const doc = container.ownerDocument;
    if (doc.getElementById('faroPlan')) return doc.getElementById('faroPlan');
    const plan = doc.createElement('div');
    plan.id = 'faroPlan';
    plan.dataset.state = 'anon';
    plan.innerHTML = `
      <div class="faro-plan-head"><span class="label-micro">Plano</span><span id="faroPlanBadge" class="faro-plan-badge" hidden></span></div>
      <strong id="faroSubscriptionTitle" class="faro-plan-title">Um plano. Tudo liberado.</strong>
      <p id="faroSubscriptionText" class="faro-plan-text">Teste 7 dias sem colocar cartão.</p>
      <div id="faroPlanReadOnly" class="faro-plan-alert" role="status" hidden>Modo leitura: seus dados estão aqui para ver e exportar.</div>
      <div class="faro-plan-price">
        <span id="faroPlanCodeTag" class="faro-plan-tag" hidden>Cupom PRAGAS no pagamento</span>
        <div class="faro-plan-amount"><span id="faroPlanAmount">R$ 22,99</span><span>/mês</span></div>
        <p id="faroPlanThen" class="faro-plan-small">Sem fidelidade. Cancele quando quiser.</p>
        <p id="faroPlanSave" class="faro-plan-save" hidden><span>Você economiza em 5 meses</span><b>R$ 40,45</b></p>
      </div>
      <ol id="faroPlanTimeline" class="faro-plan-timeline">
        <li><i>1</i><span><b>Hoje: teste grátis começa</b><small>Sem cartão. Acesso a tudo.</small></span></li>
        <li><i>6</i><span><b>Dia 6: a gente avisa</b><small>Nada é cobrado sozinho.</small></span></li>
        <li><i>8</i><span><b>Dia 8: você escolhe</b><small>Assinar ou sair. Seus dados ficam com você.</small></span></li>
      </ol>
      <div class="faro-plan-actions">
        <button id="faroSubscriptionAction" type="button" class="faro-plan-primary">Testar 7 dias grátis</button>
        <button id="faroPlanExport" type="button" class="faro-plan-secondary" hidden>Exportar meus dados</button>
        <button id="faroPlanCodeToggle" type="button" class="faro-plan-link" aria-expanded="false" aria-controls="faroPlanCodeBox">Tenho um código</button>
      </div>
      <div id="faroPlanCodeBox" class="faro-plan-code" hidden>
        <label for="faroPlanCode">Código promocional</label>
        <div class="faro-plan-code-row"><input id="faroPlanCode" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="24" inputmode="text"><button id="faroPlanCodeSave" type="button">Usar código</button></div>
        <p id="faroPlanCodeHelp" class="faro-plan-small" role="status">Digite o código que você recebeu. Ele é aplicado na tela de pagamento.</p>
      </div>`;
    container.appendChild(plan);
    if (!doc.getElementById('faroPlanStyle')) {
      const style = doc.createElement('style');
      style.id = 'faroPlanStyle';
      style.textContent = `#faroPlan{display:grid;gap:12px}
        #faroPlan .faro-plan-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
        #faroPlan .faro-plan-badge{font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px;background:var(--faro-amber-soft);color:var(--faro-amber-text)}
        #faroPlan .faro-plan-badge[data-tone="attention"]{background:var(--faro-loss-soft);color:var(--faro-loss)}
        #faroPlan .faro-plan-title{display:block;font-size:20px;font-weight:800;line-height:1.2}
        #faroPlan .faro-plan-text,#faroPlan .faro-plan-small{font-size:13px;color:var(--faro-muted);margin:0}
        #faroPlan .faro-plan-alert{font-size:13px;font-weight:700;padding:12px;border-radius:14px;background:var(--faro-amber-soft);color:var(--faro-amber-text)}
        #faroPlan .faro-plan-price{border:1px solid var(--faro-line);border-radius:18px;padding:16px;display:grid;gap:6px;background:var(--faro-surface-soft)}
        #faroPlan .faro-plan-tag{justify-self:start;font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px;background:var(--faro-amber);color:var(--faro-on-amber)}
        #faroPlan .faro-plan-amount{display:flex;align-items:baseline;gap:4px;font-size:14px;color:var(--faro-muted)}
        #faroPlan #faroPlanAmount{font-size:32px;font-weight:800;color:var(--faro-ink);font-variant-numeric:tabular-nums}
        #faroPlan .faro-plan-save{display:flex;justify-content:space-between;gap:8px;font-size:13px;margin:4px 0 0;padding-top:8px;border-top:1px dashed var(--faro-line)}
        #faroPlan .faro-plan-save b{color:var(--faro-profit)}
        #faroPlan .faro-plan-timeline{list-style:none;margin:0;padding:0;display:grid;gap:10px}
        #faroPlan .faro-plan-timeline li{display:flex;gap:12px;align-items:flex-start}
        #faroPlan .faro-plan-timeline i{flex:none;width:28px;height:28px;border-radius:999px;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:13px;background:var(--faro-black);color:var(--faro-amber)}
        #faroPlan .faro-plan-timeline b{display:block;font-size:14px}#faroPlan .faro-plan-timeline small{display:block;font-size:12px;color:var(--faro-muted)}
        #faroPlan .faro-plan-actions{display:grid;gap:8px}
        #faroPlan button{min-height:48px;border-radius:16px;font-weight:800;font-size:14px;touch-action:manipulation}
        #faroPlan .faro-plan-primary{background:var(--faro-amber);color:var(--faro-on-amber)}
        #faroPlan .faro-plan-primary:disabled{background:var(--faro-surface-2);color:var(--faro-muted)}
        #faroPlan .faro-plan-secondary{background:var(--faro-black);color:var(--faro-paper)}
        #faroPlan .faro-plan-link{background:transparent;color:var(--faro-amber-text);text-decoration:underline}
        #faroPlan .faro-plan-code{display:grid;gap:8px}#faroPlan .faro-plan-code label{font-size:13px;font-weight:700}
        #faroPlan .faro-plan-code-row{display:flex;gap:8px}
        #faroPlan .faro-plan-code-row input{flex:1;min-width:0;min-height:48px;font-size:16px;text-transform:uppercase;padding:0 12px;border-radius:14px;border:1px solid var(--faro-line);background:var(--faro-surface);color:var(--faro-ink)}
        #faroPlan .faro-plan-code-row button{padding:0 16px;background:var(--faro-black);color:var(--faro-paper)}
        #faroPlan :focus-visible{outline:2px solid var(--faro-focus);outline-offset:2px}`;
      doc.head.appendChild(style);
    }
    const $ = id => doc.getElementById(id);
    const openBox = () => { $('faroPlanCodeBox').hidden = false; $('faroPlanCodeToggle').setAttribute('aria-expanded', 'true'); $('faroPlanCode').value = readCode(); $('faroPlanCode').focus(); };
    $('faroPlanCodeToggle').addEventListener('click', () => $('faroPlanCodeBox').hidden ? openBox() : ($('faroPlanCodeBox').hidden = true, $('faroPlanCodeToggle').setAttribute('aria-expanded', 'false')));
    const save = () => {
      const code = normalizeCode($('faroPlanCode').value);
      if (!code) { writeCode(''); $('faroPlanCodeHelp').textContent = 'Código removido. Preço normal.'; renderPrice(plan); return; }
      if (!/^[A-Z0-9]{3,24}$/.test(code)) { $('faroPlanCodeHelp').textContent = 'Use só letras e números, sem espaço.'; return; }
      writeCode(code);
      $('faroPlanCodeBox').hidden = true;
      $('faroPlanCodeToggle').setAttribute('aria-expanded', 'false');
      renderPrice(plan);
    };
    $('faroPlanCodeSave').addEventListener('click', save);
    $('faroPlanCode').addEventListener('keydown', event => { if (event.key === 'Enter') save(); });
    renderPrice(plan);
    return plan;
  };

  const renderPrice = plan => {
    const doc = plan.ownerDocument;
    const $ = id => doc.getElementById(id);
    const code = readCode();
    const promo = knownCode(code);
    $('faroPlanAmount').textContent = brl(promo ? PRICE.promo : PRICE.monthly);
    $('faroPlanThen').textContent = promo
      ? `nos 5 primeiros meses. Depois, R$ 22,99/mês.`
      : code ? `Código ${code} guardado. O desconto aparece na tela de pagamento.` : 'Sem fidelidade. Cancele quando quiser.';
    $('faroPlanSave').hidden = !promo;
    $('faroPlanCodeTag').hidden = !code;
    $('faroPlanCodeTag').textContent = `Cupom ${code} no pagamento`;
    $('faroPlanCodeToggle').textContent = code ? 'Trocar cupom' : 'Tenho um código';
    $('faroPlanCodeHelp').textContent = code
      ? `No pagamento, toque em "Adicionar código promocional" e digite ${code}.`
      : 'Digite o código que você recebeu. Ele é aplicado na tela de pagamento.';
  };

  const update = (plan, state, { billingEnabled = false } = {}) => {
    const doc = plan.ownerDocument;
    const $ = id => doc.getElementById(id);
    const copy = copyFor(state, billingEnabled);
    plan.dataset.state = state.kind;
    $('faroSubscriptionTitle').textContent = copy.title;
    $('faroSubscriptionText').textContent = copy.text;
    $('faroPlanBadge').hidden = !copy.badge;
    $('faroPlanBadge').textContent = copy.badge;
    $('faroPlanBadge').dataset.tone = state.kind === 'trial' ? 'calm' : 'attention';
    const button = $('faroSubscriptionAction');
    button.textContent = copy.label;
    button.dataset.action = copy.action;
    button.dataset.portal = copy.action === 'portal' ? 'true' : 'false';
    button.disabled = copy.action !== 'signup' && !billingEnabled;
    // Modo leitura só vale com a cobrança ligada (sem venda aberta, ninguém perde nada).
    const readOnly = billingEnabled && state.kind === 'expired';
    $('faroPlanReadOnly').hidden = !readOnly;
    $('faroPlanExport').hidden = state.kind !== 'expired';
    $('faroPlanTimeline').hidden = !(state.kind === 'anon' || state.kind === 'trial');
    if (readOnly) doc.documentElement.dataset.faroReadOnly = 'on';
    else delete doc.documentElement.dataset.faroReadOnly;
    renderPrice(plan);
    try { root.dispatchEvent?.(new root.CustomEvent('faro:plan-state', { detail: { kind: state.kind, readOnly } })); } catch {}
    return copy;
  };

  root.FaroPlans = Object.freeze({ PRICE, PROMO_CODE, brl, savings, normalizeCode, computeState, copyFor, mount, update });
})(typeof window !== 'undefined' ? window : globalThis);

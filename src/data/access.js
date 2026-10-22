// Acesso ao app: decide se o motorista usa o Faro, precisa entrar ou precisa assinar. Puro: sem rede, sem tela.
// Com a cobrança desligada (`billingEnabled=false`) o app é sempre liberado e sem login. Nenhum caso apaga dado local.

export const ACCESS = Object.freeze({ LIBERADO: 'liberado', ENTRAR: 'precisa_entrar', ASSINAR: 'precisa_assinar', TRIAL_ACABANDO: 'trial_acabando' });
export const TRIAL_WARN_DAYS = 3;
const DAY_MS = 86400000;

// direito = assinatura ativa ou em teste, com período ainda válido (sem data = vale)
export const periodValid = (sub, now) => {
  if (!sub || !sub.currentPeriodEnd) return true;
  const end = Date.parse(sub.currentPeriodEnd);
  return Number.isNaN(end) ? false : end > now;
};
export const hasEntitlement = (sub, now = Date.now()) => !!sub && (sub.status === 'active' || sub.status === 'trialing') && periodValid(sub, now);

// dias que faltam (arredonda para cima; nunca negativo); null se não há data
export const daysLeft = (sub, now = Date.now()) => {
  if (!sub || !sub.currentPeriodEnd) return null;
  const end = Date.parse(sub.currentPeriodEnd);
  return Number.isNaN(end) ? null : Math.max(0, Math.ceil((end - now) / DAY_MS));
};

export function decideAccess({ billingEnabled = false, user = null, subscription = null, now = Date.now() } = {}) {
  if (billingEnabled !== true) return { state: ACCESS.LIBERADO, reason: 'cobranca_desligada', daysLeft: null };
  if (!user) return { state: ACCESS.ENTRAR, reason: 'sem_sessao', daysLeft: null };
  if (!hasEntitlement(subscription, now)) return { state: ACCESS.ASSINAR, reason: subscription && subscription.status ? `assinatura_${subscription.status}` : 'sem_assinatura', daysLeft: null };
  const left = subscription.status === 'trialing' ? daysLeft(subscription, now) : null;
  if (left !== null && left <= TRIAL_WARN_DAYS) return { state: ACCESS.TRIAL_ACABANDO, reason: 'teste_acabando', daysLeft: left };
  return { state: ACCESS.LIBERADO, reason: 'assinatura_valida', daysLeft: left };
}

// o app bloqueia só nestes dois; trial_acabando continua liberado (só avisa)
export const isBlocked = decision => decision.state === ACCESS.ENTRAR || decision.state === ACCESS.ASSINAR;

// Texto da tela bloqueada. Quem nunca teve assinatura começa o teste; quem já teve (cancelada ao fim do teste sem cartão, por
// exemplo) assina de novo, porque o teste vale uma vez por pessoa (ADR 0009). `inactive` = cliente criado no começo do checkout, sem assinatura.
export function blockedIntro(decision) {
  const salvos = 'Seus dados continuam salvos neste aparelho.';
  if (decision.state === ACCESS.ENTRAR) return 'Entre ou crie sua conta para usar o Faro. Seus dados ficam salvos neste aparelho.';
  if (decision.reason === 'sem_assinatura' || decision.reason === 'assinatura_inactive') return `Comece o teste grátis para usar o Faro. ${salvos}`;
  if (decision.reason === 'assinatura_past_due' || decision.reason === 'assinatura_unpaid') return `Atualize o pagamento para voltar a usar o Faro. ${salvos}`;
  return `Assine para voltar a usar o Faro. ${salvos}`;
}

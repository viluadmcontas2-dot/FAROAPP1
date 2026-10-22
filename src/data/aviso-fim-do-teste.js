// Aviso de fim do teste grátis. Puro: sem rede, sem tela, sem relógio próprio (o "agora" entra por parâmetro).
// Textos de docs/legal/aviso-fim-do-teste.md (rascunho: se o texto mudar lá, troque em TEXTOS abaixo; os níveis e as datas não mudam).
// Regra: só aparece com a cobrança ligada. Dia = calendário de São Paulo (o motorista vive nele), nunca UTC.

export const FUSO_PADRAO = 'America/Sao_Paulo';
export const VALOR_PADRAO = 'R$ 22,99';
export const JANELA_COBRADO_DIAS = 2; // depois da cobrança, o aviso fica por 2 dias
const DIA_MS = 86400000;
const BOTAO_TESTE = 'Adicionar cartão';
const BOTAO_COBRADO = 'Gerenciar assinatura';

// {data} = dia da cobrança (dd/mm); {valor} = valor da mensalidade
const TEXTOS = {
  tres_dias: { titulo: ({ dias }) => `Seu teste termina em ${dias} dias`, texto: ({ data, valor }) => `Seu teste grátis do Faro termina em ${data}. Para continuar, adicione um cartão antes. Com cartão, cobramos ${valor} nesse dia. Sem cartão, o teste só termina e você não paga nada.` },
  um_dia: { titulo: () => 'Amanhã o teste termina', texto: ({ data, valor }) => `Amanhã, ${data}, o teste termina. Quer continuar? Adicione um cartão hoje: a cobrança de ${valor} começa amanhã. Prefere parar? Não precisa fazer nada e não paga nada.` },
  hoje: { titulo: () => 'Seu teste termina hoje', texto: ({ valor }) => `Hoje o teste termina. Para continuar usando o Faro, adicione um cartão: ${valor} por mês. Você pode cancelar quando quiser.` },
  cobrado: { titulo: ({ valor }) => `Cobrança feita: ${valor}`, texto: ({ proxima }) => `Sua assinatura do Faro está ativa.${proxima ? ` Próxima cobrança em ${proxima}.` : ''} Foi cobrado e se arrependeu? Você tem 7 dias para pedir o dinheiro de volta.` },
};

const ms = v => { if (v == null || v === '') return null; const t = typeof v === 'number' ? v : Date.parse(v); return Number.isNaN(t) ? null : t; };

// "AAAA-MM-DD" do instante no fuso pedido
const diaLocal = (t, timeZone) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
const diasEntre = (de, ate) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / DIA_MS);
const ddmm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// sub: { status, currentPeriodEnd, trialEnd?, cancelAtPeriodEnd? } (o que backend.fetchSubscription devolve).
// Durante o teste, `trialEnd` (se vier) ou `currentPeriodEnd` é o dia da primeira cobrança.
// Devolve null ou { nivel: 'tres_dias'|'um_dia'|'hoje'|'cobrado', titulo, texto, botao }.
export function avisoFimDoTeste({ sub = null, billingEnabled = false, now = Date.now(), timeZone = FUSO_PADRAO, valor = VALOR_PADRAO } = {}) {
  if (billingEnabled !== true || !sub || typeof sub !== 'object' || sub.error) return null;
  const agora = ms(now);
  if (agora === null) return null;
  const monta = (nivel, dados) => ({ nivel, titulo: TEXTOS[nivel].titulo({ valor, ...dados }), texto: TEXTOS[nivel].texto({ valor, ...dados }), botao: nivel === 'cobrado' ? BOTAO_COBRADO : BOTAO_TESTE });
  try {
    const fim = ms(sub.trialEnd) ?? (sub.status === 'trialing' ? ms(sub.currentPeriodEnd) : null);
    if (fim === null) return null;
    const dFim = diaLocal(fim, timeZone), dHoje = diaLocal(agora, timeZone);
    const dias = diasEntre(dHoje, dFim);

    if (sub.status === 'active') { // teste acabou e a cobrança rodou
      if (ms(sub.trialEnd) === null || dias > 0 || -dias > JANELA_COBRADO_DIAS) return null;
      const prox = ms(sub.currentPeriodEnd);
      return monta('cobrado', { proxima: prox === null ? '' : ddmm(diaLocal(prox, timeZone)) });
    }
    if (sub.status !== 'trialing' || sub.cancelAtPeriodEnd === true) return null; // cancelada/atrasada: nada; teste já cancelado não será cobrado
    const data = ddmm(dFim);
    if (dias <= 0) return monta('hoje', { data });
    if (dias === 1) return monta('um_dia', { data });
    if (dias <= 3) return monta('tres_dias', { data, dias });
    return null;
  } catch { return null; } // fuso inválido etc.: o aviso nunca derruba o app
}

# 0008 — Landing de venda e instalar só depois de assinar
**Decisão (22/10/2026, do dono):** a primeira tela fora do app instalado deixa de ser "Instalar o Faro" e vira uma landing de venda de uma tela: promessa ("Veja o lucro de verdade do seu dia"), preço ("7 dias de teste, depois R$ 22,99/mês. Cancele quando quiser."), "Assinar e começar" e "Já tenho conta". Os passos de instalar só aparecem depois de uma assinatura ativa ou em teste.
**Fluxo:** criar conta ou entrar (e-mail e senha, o mesmo backend da tela Conta) -> checkout do Stripe (URL validada por `safeStripeUrl`; o campo de cupom é do próprio Stripe) -> volta com `?faro_cobranca=retorno` -> confere a assinatura -> "Assinatura ativa" -> instalar. `?faro_cobranca=cancelada` volta à landing com "Pagamento cancelado. Você pode tentar de novo.".
**Decisões de detalhe:**
- Só `active` e `trialing` liberam o instalar. `past_due`, `unpaid`, `paused`, `canceled` e `inactive` não liberam.
- A conferência na volta repete a cada 1,5 s por até 20 s (o aviso do Stripe demora). Se estourar, mostra "Ainda não recebemos a confirmação do pagamento" e o botão "Verificar de novo"; nunca libera o instalar por tempo.
- Antes de abrir o checkout, a landing confere se a conta já assina, para não cobrar duas vezes.
- Cobrança desligada: o preço aparece, o botão principal fica desativado ("A assinatura abre em breve"), "Já tenho conta" some e nada de rede é chamado.
- Trocar de conta zera tudo da anterior (assinatura, mensagens, repetição em curso). A landing não toca nos dados do aparelho (sem store nem sync).
- O formulário de entrada é um componente à parte (`src/ui/landing-auth.js`) com uma lista de métodos. Hoje só e-mail e senha; "e-mail + código de 6 dígitos" e "Entrar pelo WhatsApp" entram depois como novos métodos, sem mexer na landing. Não foram implementados agora.
- Depois de assinar, o bloco de instalar tem "Enviar link do Faro para meu WhatsApp": abre `https://wa.me/?text=` com o endereço do app (`location.origin`) codificado. Sem API, sem custo, sem número fixo.
- A dica "Tem cupom? Digite na tela de pagamento." fica na landing.
**Limite honesto:** nenhum PWA impede a instalação em si (o menu do navegador sempre oferece). O que se controla é a landing mostrar os passos só a quem assinou; "só usa depois de pagar" de verdade é a tela de assinatura dentro do app instalado (tarefa seguinte). No iPhone, o app instalado não compartilha a sessão do Safari: a pessoa entra de novo com o mesmo e-mail.
**Consequência:** `detectInstall`, `readInstallEnv`, `createInstallPrompt` e `installCopy` seguem iguais e são reaproveitados no bloco de instalar. Os testes de instalação passaram a simular a assinatura com a nuvem falsa; a landing tem `tests/app-landing-e2e.test.mjs`.

# INC-0003 — Automação remota sem burlar a instalação obrigatória

**Tipo:** aprendizado preventivo  
**Estado:** confirmado  
**Data:** 2026-08-03  
**Alcance:** CalculaAê específico; PWA reutilizável; aplicação web reutilizável

## Sintoma ou necessidade

O projeto precisava permitir que um agente digitasse senha, preenchesse formulários e testasse navegação no site publicado, sem remover a regra de que o usuário comum deve instalar o PWA antes de usar a interface interna.

## Risco

Um atalho de teste mal desenhado poderia criar uma porta pública para entrar no aplicativo pelo navegador, invalidar a instalação obrigatória ou produzir um teste verde que nunca verificasse a barreira real.

## Causa estrutural

Teste de uso interno e prova de instalação são responsabilidades diferentes:

- um navegador automatizado precisa acessar o app para testar interações;
- uma máquina virtual não reproduz de forma confiável a instalação física do sistema operacional;
- tratar as duas provas como uma só levaria a automação pesada, instável ou enganosa.

## Decisão correta

A mesma execução econômica separa as provas:

1. abre o site como navegador comum usando `forceBrowser=1`;
2. confirma senha obrigatória, arquivos técnicos públicos e tela de instalação sem interface interna;
3. abre novamente sem `forceBrowser`;
4. somente `navigator.webdriver` permite o redirecionamento para `app-shell.html`;
5. testa digitação, navegação, botão voltar e preservação de formulário.

## Prevenção permanente

- não usar `localStorage`, query pública isolada ou elemento escondido para liberar o aplicativo;
- exigir simultaneamente característica inequívoca de automação e prova da barreira comum;
- guardar senha apenas em segredo de ambiente;
- manter instalação física no celular como prova separada;
- executar o navegador remoto somente sob demanda, em um Chromium, sem vídeo e com evidência apenas em falha.

## Prova criada

- `playwright.config.js`: modo remoto econômico ativado por `VETTA_TEST_BASE_URL`;
- `tests/e2e-remote/usage-gate.spec.js`: cenário contínuo de barreira e uso interno;
- `.github/workflows/test-usage-manual.yml`: execução manual de até oito minutos;
- `tests/README.md`: operação, custo e limites;
- `PWA_RULES.md`: regra obrigatória reutilizável.

## Limitação atual

O workflow está preparado na branch `netlify/teste-fechado`, mas o botão manual do GitHub só fica ativo quando o workflow também existe na branch padrão. `main` não foi alterada porque exige autorização expressa separada.

A senha também precisa ser cadastrada no GitHub como segredo `VETTA_TEST_PASSWORD`; o conector atual não oferece operação para criar segredos.

## Validação física

Não necessária para este bloco documental e de infraestrutura, pois nenhum comportamento do PWA foi alterado. Mudanças futuras no fluxo real de instalação continuam exigindo celular físico.

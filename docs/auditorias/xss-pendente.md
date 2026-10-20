# Mapear escape pendente

Base local: `394aa02`, branch `claude/escape-html-central`. Os quatro módulos abaixo permanecem intocados. Linhas referem-se a essa base; não são alegações de exploração confirmada.

| Arquivo:linha | Ponto e tratamento para a trilha responsável |
| --- | --- |
| faro-register.js:44 | `earningsSection.innerHTML`: raiz do template de ganhos. |
| faro-register.js:49 | Composição `earningsSources.map(...)`: preservar HTML somente após escapar os dados dos filhos. |
| faro-register.js:50 | `source.key` em `data-faro-earning-card`. |
| faro-register.js:51 | `source.key` em `data-faro-earning-toggle`. |
| faro-register.js:52 | `source.asset` em src e `source.label` em alt; composição do ícone. Os assets atuais são caminhos constantes locais; escape HTML não valida protocolo de URL. |
| faro-register.js:54 | `source.label` como texto HTML. |
| faro-register.js:55 | `source.key` em `data-faro-platform-state`. |
| faro-register.js:59 | `source.key` em `data-faro-earning-field`. |
| faro-register.js:60 | `source.key` em `for`. |
| faro-register.js:61 | `source.key` em id e `data-faro-earning-source`. |
| faro-register.js:65 | `app.money(0)` como texto HTML. |
| faro-register.js:322 | `note.innerHTML`: HTML estático, sem dado interpolado. |
| faro-register.js:346 | `conflict.innerHTML`: HTML estático, sem dado interpolado. |
| faro-register.js:424 | `button.innerHTML`: HTML estático, sem dado interpolado. |
| faro-register.js:486 | `saved.innerHTML`: HTML estático; lucro/data são preenchidos por textContent. |
| faro-home-r2.js:50 | `attention.innerHTML`: HTML estático; nome de custo entra por textContent em :121. |
| faro-register-earnings.js:11 | Interpolação só em mensagem de Error; nenhum innerHTML/insertAdjacentHTML encontrado. Não precisa de escape HTML. |
| faro-brand-r2.js:34 | Título via document.title; nenhum innerHTML/insertAdjacentHTML encontrado no módulo. :79 é texto de compartilhamento, :103 é nome de download. Não precisam de escape HTML. |

`earningsSources` (faro-register.js:15) é uma lista constante local; os pontos de interpolação acima são pendências de adoção do contrato central, não prova de entrada hostil atual.

## Limites adicionais fora do escopo

- `app.js:527`, `app.js:800`: `cost.id` interpolado em atributos no núcleo imutável; `app.js:587`: `event.id` e categoria. Não foram alterados. Backup com IDs hostis exige revisão separada desse núcleo; não afirmar proteção XSS global.
- Esta versão não apresenta nome de perfil pessoal: `faro-account.js` mostra e-mail via textContent. O teste semeia `state.profile.name`, mas isso não prova uma tela de nome que não existe.
- Outros módulos fora da lista autorizada não receberam certificação nesta tarefa.

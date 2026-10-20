# Escape pendente: zerado

Os quatro módulos que ficaram de fora (faro-register.js, faro-register-earnings.js, faro-home-r2.js, faro-brand-r2.js) agora estão no contrato `tests/xss-escape-contract.test.mjs` e todo innerHTML com interpolação passa por `FaroSafe.esc`/`html`. O teste de navegador cobre o valor monetário na lista de ganhos do Registro.

## Allowlist (o que ficou sem escape e por quê)

- `earningsSources` (Uber, 99, inDrive, Extras): lista constante local, sem dado do usuário. Mesmo assim chave, rótulo e asset são escapados.
- Blocos `chipsMarkup`, `keypadMarkup`, `storeMarkup`, `brandMark(source)` entram via `raw`: composição de templates cujos filhos já escapam.
- faro-register-earnings.js: interpolação só em mensagem de Error. faro-brand-r2.js: só document.title, texto de compartilhamento e nome de download. faro-home-r2.js: HTML estático; nomes entram por textContent.
- innerHTML com HTML estático (sem interpolação) em faro-register.js e faro-home-r2.js.

## Limites que continuam fora do escopo

- `app.js` (imutável): `cost.id` interpolado em atributos e `event.id`/categoria. Backup com IDs hostis exige revisão separada; não afirmar proteção XSS global.
- Esta versão não mostra nome de perfil pessoal (faro-account.js usa e-mail via textContent).
- Módulos fora da lista autorizada não receberam certificação.

# Escape nos 4 módulos restantes

- faro-register.js: toda interpolação em innerHTML passa por `FaroSafe.esc`. Os blocos de chips, teclado e campos ocultos viraram constantes (`chipsMarkup`, `keypadMarkup`, `storeMarkup`) e entram com `raw`, aceitas no contrato como composições revisadas (os filhos já escapam). A lista de ganhos usa uma só raiz de template (`rows` + total), sem concatenar.
- faro-register-earnings.js, faro-brand-r2.js, faro-home-r2.js: sem interpolação em HTML (só texto estático ou textContent). Entram no contrato como vigias: qualquer interpolação nova sem escape falha.
- Allowlist: `earningsSources` (Uber, 99, inDrive, Extras) é lista constante local; chave, rótulo e caminho de ícone são escapados mesmo assim. `source.asset` é escapado como atributo, mas escape HTML não valida protocolo de URL; os caminhos são constantes locais.
- RED real: contrato falhou no sink `used.map(...) + HTML`; teste de navegador falhou com `app.money` devolvendo `<img onerror>`. Para home-r2/brand-r2/register-earnings não havia o que falhar (já sem interpolação), então o contrato é só proteção futura.
- Alvo de toque: `summary` de "Detalhes e últimos aportes" ganhou `display:flex; min-height:44px` em faro-r3b.js.
- Bolhas decorativas do cartão no Início: o cartão legado já tinha overflow hidden; foi adicionado `overflow:clip; contain:paint` em `#faroHomeDetails .overflow-hidden` (visual idêntico). A medição por getBoundingClientRect continua vendo os retângulos, mas sem rolagem horizontal.
- CORE_CACHE subiu para faro-v1-core-26 (arquivos pré-cacheados mudaram).

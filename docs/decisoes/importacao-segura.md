# Importação, restauração e sincronização seguras

Decisão: como `app.js` é imutável e interpola `cost.id`/`event.id` em HTML, o saneamento acontece na entrada, em `faro-state.js` (camada mais externa de `normalizeState`, usada por importação, nuvem e carga local).

- Todo `id` de custo, evento, registro, aporte e reserva vira `[A-Za-z0-9_-]{1,64}`. Ids inválidos são regenerados de forma determinística (hash FNV do valor original); referências (`costId`, `reserveId`, chaves de `reserveProfiles`, id de ocorrência `custo:data`) seguem o mapa e continuam coerentes. Ids válidos não mudam.
- `category`, `kind`, tipo de combustível: só `[A-Za-z0-9_-]`. Datas inválidas descartam o item.
- Strings até 200 caracteres; limites de itens (5000 registros, 200 custos, 2000 eventos); profundidade máxima 8.
- Números finitos: `Infinity` some, texto numérico vira número, lixo vira o padrão (ou 0 em dinheiro; snapshots inválidos são removidos para manter o fallback legado).
- `__proto__`, `constructor`, `prototype` são descartados em qualquer nível.
- Importação: arquivo > 512 KB (igual ao CHECK do servidor) recusado ("Esse arquivo é grande demais para ser um backup do FARO."); não-JSON ou `app` diferente de FARO: "Esse arquivo não parece um backup do FARO."
- Backup válido sai idêntico (teste de ida e volta). CORE_CACHE: faro-v1-core-27.
Limite: texto de nome/título continua livre (até 200 chars); a proteção final contra HTML nesses campos é o escape de FaroSafe nos módulos e a revisão futura de `app.js`.

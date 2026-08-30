import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const r3b = await readFile('faro-r3b.js','utf8');
const routing = await readFile('faro-r3-routing.js','utf8');
const interactions = await readFile('faro-interactions.js','utf8');
const planning = await readFile('faro-planning.js','utf8');
const shell = await readFile('app-shell.html','utf8');
const app = await readFile('app.js','utf8');

// Ownership: R3-B.2 continua apresentação/view-model. Escrita financeira segue canônica.
assert.match(r3b, /window\.FaroPlanning/);
assert.match(r3b, /window\.FaroInteractions/);
assert.doesNotMatch(r3b, /localStorage|STORAGE_KEY/);
assert.doesNotMatch(r3b, /app\.state\.[A-Za-z0-9_]+\s*=/, 'R3-B.2 não pode virar writer financeiro');
assert.match(planning, /window\.FaroFinance\?\.markPaid/);
assert.match(planning, /clickHiddenReserveAction/);
assert.match(app, /this\.\$\('extraDaysOffBadge'\)\.textContent/);

// Identidade FARO e cockpit preservados.
assert.match(r3b, /Plus Jakarta Sans/);
assert.doesNotMatch(r3b, /font-weight\s*:\s*900/);
assert.match(r3b, /#0B1121/);
assert.match(r3b, /#2563EB/);
assert.match(r3b, /faro-mark\.svg/);
assert.match(r3b, /root\.insertBefore\(hero, firstGrid\)/);
for (const copy of ['Meta do mês','Dias na pista','Custo para rodar','Compromissos']) assert.match(r3b,new RegExp(copy));

// Radar: intenção humana antes do CRUD.
assert.match(r3b, /const moneyViewModel =/);
assert.match(r3b, /ROTA TRANQUILA/);
assert.match(r3b, /DE OLHO NA ROTA/);
assert.match(r3b, /PRECISA DE VOCÊ/);
assert.match(r3b, /FORA DA ROTA/);
assert.match(r3b, /overdueAmount/);
assert.match(r3b, /attentionAmount/);
assert.match(r3b, /next7Amount/);
assert.match(r3b, /reserveBalance/);
assert.match(r3b, /obligationMonthly/);
assert.match(r3b, /já comprometidos no seu plano mensal/);
assert.match(r3b, /já estão protegidos/);
assert.match(r3b, /Nenhuma conta exige sua atenção agora/);

// Tabs informativas: estado antes do toque.
assert.match(r3b, /faro-r3b2-tab-label/);
assert.match(r3b, /faro-r3b2-tab-value/);
assert.match(r3b, /faro-r3b2-tab-meta/);
assert.match(r3b, /pendente/);
assert.match(r3b, /protegidos/);
assert.match(r3b, /faroR3B2Panel/);

// Contas viram timeline por urgência, com Action Peek contextual.
for (const group of ['Precisa de você','Próximos dias','Mais adiante','Resolvidas']) assert.match(r3b,new RegExp(group));
assert.match(r3b, /faro-r3b2-bill/);
assert.match(r3b, /dueDateLabel/);
assert.match(r3b, /occurrenceWhen/);
assert.match(r3b, /faro-r3b2-peek/);
assert.match(r3b, /Marcar como paga/);
assert.match(r3b, /Editar conta/);
assert.match(r3b, /Recorrência mensal|Recorrência semanal/);
assert.match(r3b, /data-r3-undo/);
assert.match(r3b, /moneyUndo/);
assert.match(routing, /faro-r3b2-undo-bar/);
assert.match(routing, /FaroFinance\?\.undoPaid/);

// Empty states falam de decisão, não de painel administrativo.
assert.match(r3b, /Pista livre por aqui/);
assert.match(r3b, /Seu plano ainda não conhece suas contas/);
assert.match(r3b, /proteger esse dinheiro antes de chamá-lo de lucro/);
assert.match(r3b, /Nenhum dinheiro protegido ainda/);
assert.doesNotMatch(r3b, /Gerenciar contas cadastradas/);
assert.match(r3b, /Todas as contas e recorrências/);

// Reservas são proteção real: saldo, meta, progresso e aporte.
assert.match(r3b, /faro-r3b2-reserve/);
assert.match(r3b, /balanceFor/);
assert.match(r3b, /contributionsFor/);
assert.match(r3b, /protegidos/);
assert.match(r3b, /faro-r3b2-progress/);
assert.match(r3b, /\+ Aportar/);
assert.match(r3b, /Definir objetivo/);
assert.match(r3b, /Detalhes e últimos aportes/);
assert.match(r3b, /data-r3-reserve-remove/);

// Continuidade R3-B.3: ações financeiras aprofundam dentro do mesmo Radar.
assert.match(routing, /mode:'single-workspace-depth'/);
assert.match(routing, /faroMoneyInlineFlow/);
assert.match(routing, /data-r3b2-edit-cost/);
assert.match(routing, /data-r3-reserve-contribute/);
assert.match(routing, /data-r3-reserve-goal/);
assert.doesNotMatch(routing, /reopenAfterLegacy|afterMoneyClose|afterWorkspaceClose/);
assert.doesNotMatch(routing, /app\.openCostModal\(/);

// A camada R3-B.2 mantém seus helpers de retorno como compatibilidade interna,
// mas o roteamento ativo R3-B.3 intercepta as ações antes do handoff legado.
assert.match(r3b, /returnAfterLegacy/);
assert.match(r3b, /faroReserveModal/);
assert.match(r3b, /scrollIntoView/);
assert.match(r3b, /restore|focusSelector|faroOpenMoney/);

// C0-C10: o código contém os estados necessários para zero, urgência, atraso,
// múltiplos itens, reservas sem/com meta, pagamento, aporte e textos longos.
assert.match(r3b, /model\.obligations\.length > 0/); // C0/C1
assert.match(r3b, /item\.days === 1/);               // C2
assert.match(r3b, /item\.days < 0/);                 // C3
assert.match(r3b, /filter\(item => item\.days >= 0 && item\.days <= 7\)/); // C4
assert.match(r3b, /goal > 0/);                        // C5/C6
assert.match(r3b, /reserveRules\.map/);               // C7
assert.match(r3b, /status === 'paid'/);               // C8
assert.match(r3b, /data-r3-reserve-contribute/);      // C9
assert.match(r3b, /text-overflow:ellipsis/);           // C10

// Motion é causal, curto e respeita redução de movimento.
assert.match(r3b, /faroR3B2Panel/);
assert.match(r3b, /faroR3B2Peek/);
assert.match(r3b, /faro-r3b2-progress>span/);
assert.match(r3b, /prefers-reduced-motion:reduce/);
assert.doesNotMatch(r3b, /animation[^;]*(infinite|linear infinite)/);
assert.match(interactions, /restoreFocus/);
assert.match(interactions, /prefers-reduced-motion:reduce/);

// Regressão física do prefixo R$ continua protegida.
assert.match(r3b, /#faroMetaDialog #faroTargetExact\{padding-left:40px!important\}/);
assert.match(r3b, /#faroMetaDialog \.input-wrapper>span\{z-index:1\}/);

// Nenhuma terceira camada visual e nenhum rebranding paralelo.
assert.doesNotMatch(shell, /faro-r3c/i);
assert.match(r3b, /mode:'financial-radar'/);

console.log('FARO UX-R3-B.3: radar financeiro operacional e navegação em profundidade única protegidos — ok');
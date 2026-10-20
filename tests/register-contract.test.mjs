import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const register = await readFile('faro-register.js', 'utf8');
const helper = await readFile('faro-register-earnings.js', 'utf8');
const shell = await readFile('app-shell.html', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const build = await readFile('scripts/build-static-site.mjs', 'utf8');

const contains = (source, snippet, label) => {
  assert.equal(source.includes(snippet), true, label);
};

contains(shell, 'faro-register-earnings.js?v=1', 'Shell precisa carregar helper de ganhos por origem');
contains(shell, 'faro-register.js?v=4', 'Shell precisa carregar Registro premium por plataforma');
contains(sw, 'faro-register-earnings.js?v=1', 'PWA precisa armazenar helper de ganhos por origem');
contains(sw, 'faro-register.js?v=4', 'PWA precisa armazenar Registro premium por plataforma');
contains(build, "'faro-register-earnings.js'", 'Build precisa copiar helper de ganhos por origem');
contains(build, "'faro-register.js'", 'Build precisa copiar Registro');
contains(register, "const DRAFT_KEY = 'faro-record-draft-v1'", 'Registro precisa ter rascunho próprio');

// F3: "+5/+10/+50 km" saiu (pouco útil para quem roda 180 km); o km vem do último dia com "Igual a ontem".
contains(register, 'Igual a ontem', 'Km precisa oferecer "Igual a ontem"');
for (const chip of ['+ R$50', '+ R$100', '+ R$200']) {
  contains(register, chip, `Atalho ausente: ${chip}`);
}

contains(register, 'De onde veio seu faturamento?', 'Registro precisa explicar a origem do faturamento');
contains(register, 'Total do dia', 'Registro precisa mostrar soma automática');
contains(register, 'Detalhar por aplicativo', 'Registro legado precisa oferecer opt-in de detalhamento');
contains(register, 'earningsBySource', 'Registro detalhado precisa persistir breakdown no mesmo draft');
contains(register, 'const baseRecordDraft = app.recordDraft', 'Registro precisa estender o draft canônico');
contains(helper, "['uber', 'ninetyNine', 'indrive', 'extras']", 'Helper precisa reconhecer as quatro origens aprovadas');
contains(register, 'current + increment', 'Atalhos precisam somar ao valor digitado');
contains(register, 'localStorage.setItem(DRAFT_KEY', 'Rascunho precisa ser persistido localmente');
contains(register, 'visibilitychange', 'Interrupção precisa preservar rascunho');
contains(register, 'editingExisting', 'Edição do Histórico não pode ser sobrescrita pelo rascunho');
contains(register, 'if (saving) return', 'Salvar precisa rejeitar toque duplicado');
contains(register, 'aria-busy', 'Salvar precisa comunicar estado ocupado');
// F2 (2026-10-20): o fechamento virou um retorno único com o lucro do dia; a frase que misturava
// bruto da semana e líquido do mês saiu (ver docs/decisoes/registro-sem-perda.md).
contains(register, 'Lucro de hoje', 'Fechamento precisa dizer o lucro do dia');
contains(register, "setAttribute('inputmode', 'decimal')", 'Campos numéricos precisam abrir teclado decimal');
contains(register, "$('clearDayButton')?.addEventListener('click'", 'Limpar formulário precisa ter integração FARO');
contains(register, 'clearDraft();', 'Limpar formulário ou salvar precisa apagar o rascunho persistido');

assert.ok(shell.indexOf('faro-register-earnings.js?v=1') < shell.indexOf('faro-register.js?v=4'), 'Helper deve carregar antes do owner Registro');
assert.doesNotMatch(register, /brutos|líquidos para o ritmo planejado/, 'Fechamento não mistura bruto e líquido');
assert.doesNotMatch(register, /state\.records\.(push|splice)/, 'Camada de UX não pode criar segundo motor de registros');
assert.doesNotMatch(register, /dailyGross\s*=|dailyNet\s*=/, 'Registro UX não cria motor financeiro paralelo');

console.log('FARO: Registro premium por plataforma com soma canônica, retorno único de lucro e proteção de save — ok');

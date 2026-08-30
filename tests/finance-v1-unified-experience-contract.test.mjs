import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [navigation, home, register, planning, historyCentral, onboarding, tour] = await Promise.all([
  readFile('faro-navigation.js','utf8'),
  readFile('faro-home-r2.js','utf8'),
  readFile('faro-register.js','utf8'),
  readFile('faro-planning.js','utf8'),
  readFile('faro-r2-polish.js','utf8'),
  readFile('faro-onboarding.js','utf8'),
  readFile('faro-tour.js','utf8')
]);

const canonicalNavigation = {
  dashboard:'Hoje',
  day:'Registrar',
  history:'Histórico',
  settings:'Planejar',
  more:'Central'
};
for (const [view,label] of Object.entries(canonicalNavigation)) {
  assert.match(navigation, new RegExp(`${view}:\\s*'${label}'`),
    `N3 exige nome canônico ${label} para a view ${view}`);
}
assert.doesNotMatch(navigation,/dashboard:\s*'Início'/,
  'N3 aposentou “Início”: a superfície diária canônica chama Hoje');

assert.match(home,/monthCard\.setAttribute\('aria-label',\s*'Ver ou ajustar meta do mês'\)/,
  'Home precisa tornar a meta mensal uma unidade acionável');
assert.match(home,/navigateToPrimary\('planning'\)/,
  'Home → Planejar precisa existir em uma ação');
assert.match(home,/Registrar meu dia/,
  'Hoje precisa manter Registrar como ação dominante quando o dia está aberto');

assert.match(register,/De onde veio seu faturamento\?/,
  'Registrar precisa falar em origem de faturamento, não em estrutura técnica');
assert.match(register,/Total do dia/,
  'Registrar precisa apresentar o total automaticamente');

assert.match(planning,/Quero que sobre/,
  'Planejar precisa começar pela intenção líquida do motorista');
assert.match(planning,/id=\"faroPreviewDaily\"/,
  'Planejar precisa expor a consequência operacional diária da meta');
assert.match(planning,/(Precisa por dia|Faturamento\/dia)/,
  'Planejar precisa nomear a consequência diária em linguagem operacional compreensível');

assert.match(historyCentral,/Histórico|history/i,
  'Histórico precisa ter uma composição própria e legível');
assert.match(historyCentral,/Central|central/i,
  'Central precisa ser a casa das ações ocasionais, não da rotina diária');

assert.match(onboarding,/onboarding/i,
  'Onboarding continua existindo como configuração inicial única');
assert.match(tour,/faroTour|tour/i,
  'Tour contextual continua separado da autoridade de conclusão do onboarding');

for (const source of [navigation,home,register,planning,historyCentral,onboarding,tour]) {
  assert.doesNotMatch(source,/\bTESTE NETLIFY OF\b/i,
    'N3 não pode expor nome de ambiente/experimento ao motorista');
}

console.log('FARO_FINANCE_V1 N3: Hoje/Registrar/Planejar/Histórico/Central compartilham intenção e navegação canônicas — ok');

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const polish = await readFile('faro-r2-polish.js','utf8');
const navigation = await readFile('faro-navigation.js','utf8');
const css = await readFile('styles.css','utf8');

assert.match(polish,/faroHistoryAnalytics/,'Histórico precisa manter analytics recolhível');
assert.match(polish,/<summary>Ver evolução do líquido<\/summary>/,'Gráfico deve continuar como apoio, não protagonista');
assert.match(polish,/chartCard\.classList\.add\('faro-state-card'\)/,'Bloco analítico precisa consumir State Card');
assert.match(polish,/label\.className = 'px-1 pt-2 faro-card-eyebrow'/,'Grupos da Central precisam usar microcontexto da gramática premium');
assert.match(polish,/dataset\.faroCentralItem = 'true'/,'Itens da Central precisam ser explicitamente marcados como unidades do ecossistema');
for (const group of ['Conta e dados','Ferramentas','Aplicativo','Ajuda','Segurança']) assert.match(polish,new RegExp(group),`Grupo da Central ausente: ${group}`);
assert.match(polish,/centralIntro\?\.remove\(\)/,'Central não deve manter card explicativo redundante');
assert.match(navigation,/if \(this\.currentView !== 'history'\) return/,'Histórico precisa continuar renderizando sob demanda');
assert.match(css,/\.history-row[^\{]*\{[^}]*var\(--faro-radius-row\)/s,'Dias registrados precisam consumir Detail Row visual');
assert.match(css,/\[data-faro-central-item="true"\]/,'Central precisa ter acabamento comum sem criar outro componente');
assert.doesNotMatch(polish,/app\.state\.[A-Za-z0-9_]+\s*=/,'Polish não pode virar writer');
assert.doesNotMatch(polish,/navigateToPrimary\s*=|openSecondary\s*=/,'Polish não pode virar router');

console.log('FARO R2/HIST: Histórico e Central priorizam intenção, lista e hierarquia premium — ok');

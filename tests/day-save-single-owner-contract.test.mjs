import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// F1 + F2: o Registro (faro-register.js) é o único dono do retorno de "salvar dia" e da edição segura.
const register = await readFile('faro-register.js', 'utf8');
const brand = await readFile('faro-brand-r2.js', 'utf8');
const navigation = await readFile('faro-navigation.js', 'utf8');
const modules = ['faro-brand-r2.js', 'faro-home-r2.js', 'faro-navigation.js', 'faro-r2-polish.js', 'faro-tour.js', 'faro-planning.js', 'faro-r3-routing.js'];

assert.doesNotMatch(brand, /app\.saveDay\s*=/, 'Marca não pode embrulhar saveDay: o Registro é o único dono do retorno');
assert.doesNotMatch(brand, /faroDailyResult/, 'Modal de resultado bloqueante saiu: o retorno é um aviso único do Registro');
for (const file of modules) {
  const source = await readFile(file, 'utf8');
  assert.doesNotMatch(source, /faroResultMessage|faroResultDelta/, `${file} não pode escrever na frase de resultado do dia`);
}
assert.doesNotMatch(register, /MutationObserver/, 'Registro não pode reescrever texto de outro módulo por observador');
assert.doesNotMatch(register, /brutos/, 'Retorno do dia fala de lucro líquido, nunca de bruto');
assert.match(register, /Lucro de hoje/, 'Retorno precisa dizer o lucro do dia');
assert.match(register, />Editar dia</, 'Retorno precisa oferecer "Editar dia"');
assert.match(register, />Ver Início</, 'Retorno precisa oferecer "Ver Início" quando o motorista não está no Início');
assert.match(register, /id = 'faroDaySaved'/, 'Retorno único tem um só elemento');
assert.match(register, /role', 'status'/, 'Retorno precisa ser anunciado a leitores de tela sem bloquear');

// Navegação continua só com a regra de para onde voltar.
assert.match(navigation, /returnToHistory/, 'Navegação mantém a regra de voltar ao Histórico');

// F1: edição sem perda.
assert.match(register, /Esse dia já tem registro\. Abrir e editar\?/, 'Troca para data já registrada precisa perguntar antes');
assert.match(register, /loadedDate/, 'Registro precisa saber de qual dia salvo o formulário foi carregado');
assert.match(register, /fillFromRecord/, 'Abrir um dia salvo precisa preencher o formulário com os valores salvos');
assert.match(register, /hasConflict\(\)/, 'Salvar precisa recusar sobrescrever um dia que não foi aberto');

console.log('FARO: salvar dia com um só dono, um só retorno (lucro) e edição sem perda — ok');

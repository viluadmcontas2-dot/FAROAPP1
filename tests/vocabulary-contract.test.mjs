import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
const { find, isShouting } = createRequire(import.meta.url)('./helpers/vocabulary.cjs');
const read = file => readFile(file, 'utf8');

await access('docs/decisoes/vocabulario.md');
const doc = await read('docs/decisoes/vocabulario.md');
for (const term of ['Registrar dia', 'Salvar dia', 'Lucro real de hoje', 'Meta de <mês>', 'Reserva', 'Conta a pagar', 'Guardar aporte', 'FaroCopy'])
  assert.ok(doc.includes(term), `vocabulario.md precisa definir "${term}"`);

// Mapa único de cópia: mora em faro-brand-r2.js, carregado pelo shell e pelo cache offline.
const brand = await read('faro-brand-r2.js');
assert.match(brand, /window\.FaroCopy\s*=/, 'faro-brand-r2.js precisa expor window.FaroCopy');
for (const [from, to] of [['Editar custo', 'Editar conta a pagar'], ['Adicionar custo', 'Adicionar conta a pagar'], ['META', 'Ver meta'], ['DESFAZER', 'Desfazer pagamento'], ['CONCLUIR', 'Concluir cadastro']])
  assert.ok(brand.includes(`'${from}'`) && brand.includes(`'${to}'`), `FaroCopy precisa mapear ${from} -> ${to}`);
const shell = await read('app-shell.html'), sw = await read('sw.js');
assert.match(shell, /faro-brand-r2\.js\?v=3/); assert.match(sw, /faro-brand-r2\.js\?v=3/);

// CSS: botões não gritam; só rótulos de seção ficam em caixa alta.
const theme = await read('faro-theme.css');
assert.match(theme, /button[^{]*\{[^}]*text-transform:\s*none\s*!important/s, 'faro-theme.css precisa neutralizar uppercase em botões');

// Textos de UI escritos nos módulos (fora de app.js/legacy-shell.html, imutáveis) não usam termos proibidos nem botões em caixa alta.
const modules = ['faro-account.js','faro-finance.js','faro-navigation.js','faro-planning.js','faro-reserves.js','faro-tour.js','faro-platform.js','faro-home-r2.js','faro-register.js','faro-r3b.js','faro-onboarding.js','faro-interactions.js','faro-update.js'];
const bad = [];
for (const file of modules) {
  const src = (await read(file)).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  for (const m of src.matchAll(/>([^<>{}\n]{3,80})<\/button/g)) {
    if (isShouting(m[1])) bad.push(`${file}: botão "${m[1].trim()}" em CAIXA ALTA`);
  }
}
assert.deepEqual(bad, [], bad.join('\n'));

// O próprio vocabulário canônico não pode conter termo proibido.
for (const text of ['Registrar dia', 'Salvar dia', 'Lucro real de hoje', 'Meta de outubro', 'Conta a pagar', 'Guardar aporte', 'Custo por km'])
  assert.deepEqual(find(text), [], `"${text}" é canônico`);
console.log('vocabulário: contrato OK');

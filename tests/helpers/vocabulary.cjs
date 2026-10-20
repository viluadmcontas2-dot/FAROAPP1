// Lista única de termos proibidos na interface (fonte: docs/decisoes/vocabulario.md).
// Usada pelo contrato estático e pelo teste de navegador. Cada item: [regex, termo canônico].
const allowedCost = /custo (por km|estimado)|custo do veículo por km|custo variável/gi;
const forbidden = [
  [/\bcustos?\b/i, 'conta a pagar (ou "custo por km" para o carro)'],
  [/\bregistros?\b/i, 'dia (ou "dia registrado")'],
  [/líquid[oa]s?\b/i, 'lucro'],
  [/meta do mês|meta de faturamento|meta líquida|objetivo( mensal)?( líquido)?\b/i, 'Meta de <mês> / Meta de hoje / Meta da reserva'],
  [/protegid[oa]s?|proteger/i, 'guardado / guardar'],
  [/obriga[cç]/i, 'conta a pagar'],
  [/fechamento diário|fechamento rápido|fim do dia|fechar e salvar|prévia do fechamento|fechamento concluído/i, 'dia / Salvar dia'],
  [/aportar|registrar aporte/i, 'Guardar aporte'],
  [/operação/i, 'custo por km']
];
const find = text => {
  const clean = String(text).replace(allowedCost, '');
  return forbidden.filter(([re]) => re.test(clean)).map(([re]) => String(re.exec(clean)[0]));
};
// Botão em CAIXA ALTA: 4+ letras, todas maiúsculas.
const isShouting = text => {
  const letters = String(text).replace(/[^A-Za-zÀ-ÿ]/g, '');
  return letters.length >= 4 && letters === letters.toUpperCase();
};
module.exports = { forbidden, find, isShouting };

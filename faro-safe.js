// Escape para texto e atributos HTML entre aspas. Não usar para URLs, CSS ou código JS.
(() => {
  'use strict';
  const trusted = new WeakSet();
  const entities = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => entities[char]);
  // Apenas marcação construída pelo código; nunca dados do usuário/backup/provider.
  const raw = value => {
    const text = String(value ?? '');
    const fragment = Object.freeze({ toString: () => text });
    trusted.add(fragment);
    return fragment;
  };
  const html = (strings, ...values) => strings.reduce((result, part, index) => {
    const value = values[index];
    return result + part + (index < values.length ? (trusted.has(value) ? String(value) : esc(value)) : '');
  }, '');
  window.FaroSafe = Object.freeze({ esc, html, raw });
})();

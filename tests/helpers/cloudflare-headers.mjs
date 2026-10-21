// Le o _site/_headers (formato Cloudflare) gerado pelo build a partir de src/pwa/headers.mjs.
// parseHeaders: { '/*': { 'Content-Security-Policy': '...', ... }, ... }
export function parseHeaders(text) {
  const out = {};
  let cur;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = line.trim(); out[cur] = {}; continue; }
    const i = line.indexOf(':');
    out[cur][line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

// Regra Cloudflare -> regex: '*' vira qualquer sufixo, o resto e literal.
export const pathToRegex = (p) => new RegExp('^' + p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');

// Cabecalhos que um caminho recebe: todas as regras que casam, na ordem (a ultima vence por chave).
export function headersFor(parsed, path) {
  const h = {};
  for (const [src, hdrs] of Object.entries(parsed)) if (pathToRegex(src).test(path)) Object.assign(h, hdrs);
  return h;
}

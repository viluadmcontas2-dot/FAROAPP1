// Leitura de corpo com limite REAL de bytes (nao so o cabecalho Content-Length, que pode faltar em Transfer-Encoding: chunked).
// Devolve { ok: true, text } ou { ok: false } (corpo maior que o limite: a leitura e cancelada na hora, sem bufferizar o resto).
export async function readTextLimited(req, maxBytes) {
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > maxBytes) return { ok: false };
  if (!req.body) return { ok: true, text: '' };
  const reader = req.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch { /* ja encerrado */ }
      return { ok: false };
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.byteLength; }
  return { ok: true, text: new TextDecoder().decode(all) };
}

// Monta o app real com a nuvem falsa (conta-harness-entry.js) e serve com a mesma CSP estrita de produção.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '../..');
const { build } = createRequire(import.meta.url)(join(root, 'node_modules/esbuild'));

export async function buildHarness() {
  const out = mkdtempSync(join(tmpdir(), 'faro-conta-'));
  await build({
    entryPoints: { app: join(root, 'tests/helpers/conta-harness-entry.js') }, outdir: out, bundle: true, minify: true, format: 'esm', target: 'es2020', logLevel: 'warning',
    define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.woff2': 'file', '.svg': 'file', '.png': 'file' }, assetNames: 'assets/fonts/[name]',
  });
  writeFileSync(join(out, 'index.html'), '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>FARO</title><link rel="icon" href="data:,"><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><script type="module" src="app.js"></script></body></html>');
  return out;
}

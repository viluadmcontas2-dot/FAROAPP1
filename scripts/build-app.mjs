// Empacota a interface nova (src/ui) em _site/ (ou FARO_APP_OUT): JS+CSS minificados, fontes locais,
// index.html sem script inline (permite CSP script-src 'self'). Service worker fica para outra fase.
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.env.FARO_APP_OUT || join(root, '_site'));
const exists = (p) => access(p).then(() => true, () => false);

// 1) view.gen.js sempre em dia com o design
execFileSync(process.execPath, [join(root, 'tools/compile-template.mjs')], { cwd: root, stdio: 'pipe' });

// 2) bundle
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const result = await build({
  entryPoints: { app: join(root, 'src/ui/main.js') },
  outdir: out,
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2020',
  sourcemap: false,
  metafile: true,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.woff2': 'file', '.svg': 'file', '.png': 'file' },
  assetNames: 'assets/fonts/[name]',
  logLevel: 'warning',
});

// 3) estaticos: assets (logos), icones e manifest
for (const dir of ['assets']) if (await exists(join(root, dir))) await cp(join(root, dir), join(out, dir), { recursive: true, filter: (s) => !s.includes('/assets/fonts') }); // fontes ja saem do bundle do esbuild
for (const f of ['icon.svg', 'icon-192.png', 'icon-512.png', 'faro-mark.svg']) {
  if (await exists(join(root, f))) await cp(join(root, f), join(out, f));
}
const manifest = JSON.parse(await readFile(join(root, 'manifest.webmanifest'), 'utf8'));
manifest.start_url = './';
manifest.id = './';
manifest.background_color = '#07090F';
manifest.theme_color = '#07090F';
await writeFile(join(out, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');

// 4) index.html minimo e semantico, sem script inline
await writeFile(join(out, 'index.html'), `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#07090F">
<meta name="description" content="FARO: o app de finanças do motorista de aplicativo.">
<title>FARO</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-192.png">
<link rel="stylesheet" href="app.css">
</head>
<body>
<div id="root"></div>
<noscript>O FARO precisa do JavaScript ligado para funcionar.</noscript>
<script type="module" src="app.js"></script>
</body>
</html>
`);

const sizes = Object.entries(result.metafile.outputs).filter(([k]) => /\.(js|css)$/.test(k))
  .map(([k, v]) => `${k.split('/').pop()} ${(v.bytes / 1024).toFixed(1)} KiB`);
console.log(`build-app: ${out} -> ${sizes.join(', ')}`);

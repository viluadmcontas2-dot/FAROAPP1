import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export function buildTo(dir = mkdtempSync(join(tmpdir(), 'faro-site-'))) {
  execFileSync(process.execPath, [join(root, 'scripts/build-app.mjs')], { cwd: root, env: { ...process.env, FARO_APP_OUT: dir }, stdio: 'pipe' });
  return dir;
}
export function listFiles(dir) {
  const out = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : out.push(relative(dir, p).split('\\').join('/')); } };
  walk(dir);
  return out.sort();
}

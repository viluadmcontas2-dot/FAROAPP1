// Regrava o campo "headers" do vercel.json a partir de src/pwa/headers.mjs (fonte unica).
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toVercel } from '../src/pwa/headers.mjs';
const p = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'vercel.json');
const v = JSON.parse(await readFile(p, 'utf8'));
v.headers = toVercel();
await writeFile(p, JSON.stringify(v, null, 2) + '\n');
console.log('vercel.json atualizado');

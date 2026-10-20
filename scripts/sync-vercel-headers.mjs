// Reescreve "headers" do vercel.json a partir de scripts/csp.mjs (fonte única). Uso: npm run headers:sync
import { readFile, writeFile } from 'node:fs/promises';
import { buildVercelHeaders } from './csp.mjs';

const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
vercel.headers = buildVercelHeaders();
await writeFile('vercel.json', `${JSON.stringify(vercel, null, 2)}\n`);
console.log('vercel.json headers sincronizados com scripts/csp.mjs');

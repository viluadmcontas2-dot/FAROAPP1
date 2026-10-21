// SÓ PARA TESTES: abre o app real (boot.js) com uma nuvem falsa em memória. Nada disto vai para o build de produção.
import { boot } from '../../src/ui/boot.js';
import { makeServer, makeFakeCreateClient } from '../backend-helpers.mjs';

const T = window.__FARO_TEST__ || {};
const server = makeServer();
server.autoConfirm = false;
for (const [email, u] of Object.entries(T.users || {})) server.users.set(email, { ...u });
for (const [uid, row] of Object.entries(T.states || {})) server.states.set(uid, row);
for (const [uid, row] of Object.entries(T.subs || {})) server.subs.set(uid, row);
Object.assign(server.invoke, T.invoke || {});
window.__server = server;
window.__redirects = [];
window.__boot = boot({
  root: document.getElementById('root'),
  config: { supabaseUrl: 'https://abc.supabase.co', supabasePublishableKey: 'sb_publishable_x', billingEnabled: T.billing === true, pushEnabled: false },
  createClient: makeFakeCreateClient(server),
  version: '9.9.9',
  redirect: url => window.__redirects.push(url), // a URL de checkout falsa NUNCA navega: só fica registrada
});

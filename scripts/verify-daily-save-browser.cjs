// Browser regression for the real FARO runtime: local-only demo data.
// Run after npm run build: node scripts/verify-daily-save-browser.cjs
// Uses Node 22+ native WebSocket, an installed Chrome and no paid service.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(process.argv[2] || '_site');
const candidates = process.platform === 'win32'
  ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
     'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe']
  : process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'];
const chromeBinary = process.env.FARO_CHROME_BIN || candidates.find(fs.existsSync);
if (!chromeBinary) throw new Error('Chrome unavailable; set FARO_CHROME_BIN to its executable path.');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json' };
const server = http.createServer((req, res) => {
  const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const filename = path.resolve(root, '.' + requested);
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(filename, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type':types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control':'no-store' }).end(data);
  });
});

let browser, socket;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const profile = await fsp.mkdtemp(path.join(os.tmpdir(), 'faro-browser-smoke-'));
  browser = spawn(chromeBinary, [
    '--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run',
    '--no-default-browser-check', '--no-sandbox', '--disable-background-networking',
    '--remote-debugging-port=0', '--window-size=390,844', '--user-data-dir=' + profile,
    'http://127.0.0.1:' + port + '/app-shell.html'
  ], { stdio:'ignore' });
  let debugPort;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { debugPort = Number((await fsp.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
    catch { await sleep(250); }
  }
  assert.ok(debugPort, 'Chrome DevTools did not start');
  let tab;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const tabs = await (await fetch('http://127.0.0.1:' + debugPort + '/json/list')).json();
    tab = tabs.find(item => item.type === 'page' && item.url.includes('/app-shell.html'));
    if (tab) break;
    await sleep(150);
  }
  assert.ok(tab, 'Chrome FARO target did not open');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const pending = new Map();
  let sequence = 1;
  socket.onmessage = event => {
    const reply = JSON.parse(event.data);
    const promise = pending.get(reply.id);
    if (!promise) return;
    pending.delete(reply.id);
    reply.error ? promise.reject(Error(JSON.stringify(reply.error))) : promise.resolve(reply.result);
  };
  const command = (method, params) => new Promise((resolve, reject) => {
    const id = sequence++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await command('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
    if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    ready = await evaluate("Boolean(window.__vettaApp && window.FaroRegisterEarnings && document.getElementById('recordGross'))");
    if (ready) break;
    await sleep(250);
  }
  assert.ok(ready, 'FARO main runtime and platform register were not ready');
  const draft = await evaluate(`(() => {
    const app = window.__vettaApp;
    app.state.onboardingComplete = true;
    app.save();
    app.showView('day');
    const date = app.todayKey();
    const input = (id, value) => {
      const element = document.getElementById(id);
      if (!element) throw Error('Missing input: ' + id);
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles:true }));
    };
    for (const [name, value] of Object.entries({ uber:180, ninetyNine:120, indrive:70, extras:40 })) {
      document.querySelector('[data-faro-earning-toggle="' + name + '"]')?.click();
      const element = document.querySelector('[data-faro-earning-source="' + name + '"]');
      if (!element) throw Error('Missing platform: ' + name);
      element.value = String(value);
      element.dispatchEvent(new Event('input', { bubbles:true }));
    }
    input('recordDate', date);
    input('recordKm', '80');
    const snapshot = app.recordDraft();
    return { date, gross:snapshot.gross, km:snapshot.km, breakdown:snapshot.earningsBySource };
  })()`);
  assert.equal(draft.gross, 410, 'The daily gross must be the sum of the four earnings sources');
  assert.equal(draft.km, 80);
  assert.deepEqual(JSON.parse(JSON.stringify(draft.breakdown)), { uber:180, ninetyNine:120, indrive:70, extras:40 });
  const result = await evaluate(`(() => {
    const app = window.__vettaApp;
    let error = null;
    try { app.saveDay(); } catch (cause) { error = String(cause.stack || cause); }
    const date = app.todayKey();
    const record = app.state.records.find(item => item.date === date);
    return {
      error, records:app.state.records.length,
      record:record ? { date:record.date, gross:record.gross, km:record.km, breakdown:record.earningsBySource } : null,
      savedToLocalStorage:localStorage.getItem('faro-app-finance-v1') !== null,
      resultDialogExists:document.getElementById('faroDailyResult') !== null,
      savedFeedback:(() => { const el = document.getElementById('faroDaySaved'); return el && !el.classList.contains('hidden') ? el.textContent : ''; })()
    };
  })()`);
  assert.equal(result.error, null, 'Saving must finish without a rendering exception');
  assert.equal(result.records, 1);
  assert.equal(result.record?.date, draft.date);
  assert.equal(result.record?.gross, 410);
  assert.equal(result.record?.km, 80);
  assert.deepEqual(JSON.parse(JSON.stringify(result.record?.breakdown)), { uber:180, ninetyNine:120, indrive:70, extras:40 });
  assert.equal(result.savedToLocalStorage, true);
  assert.equal(result.resultDialogExists, false, 'O modal bloqueante de resultado saiu (F2): o retorno é um aviso único');
  assert.match(result.savedFeedback, /Dia salvo\. Lucro de hoje/, 'Salvar precisa responder com o lucro do dia num único aviso');
  console.log('PASS FARO daily save browser regression: ', JSON.stringify({ date:draft.date, gross:410, km:80, platformSources:4, records:1 }));
})().catch(error => {
  console.error('FAIL FARO daily save browser regression:', error);
  process.exitCode = 1;
}).finally(async () => {
  try { socket?.close(); } catch {}
  try { browser?.kill(); } catch {}
  await new Promise(resolve => server.close(resolve));
});

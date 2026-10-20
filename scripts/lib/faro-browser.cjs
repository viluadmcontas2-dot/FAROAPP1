// Harness mínimo de navegador real (Chrome headless + DevTools Protocol) para o runtime FARO.
// Sem dependências: usa WebSocket nativo do Node 22+. Dados só locais (localStorage do perfil temporário).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const findChrome = () => {
  const candidates = process.platform === 'win32'
    ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
       'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe']
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
         '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'];
  return process.env.FARO_CHROME_BIN || candidates.find(fs.existsSync) || null;
};

const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json', '.webmanifest':'application/manifest+json' };

async function openFaro(rootDir) {
  const root = path.resolve(rootDir);
  const chromeBinary = findChrome();
  if (!chromeBinary) throw new Error('Chrome indisponível; defina FARO_CHROME_BIN com o caminho do executável.');
  const server = http.createServer((req, res) => {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, '.' + requested);
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(filename, (error, data) => {
      if (error) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type':types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control':'no-store' }).end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const profile = await fsp.mkdtemp(path.join(os.tmpdir(), 'faro-browser-'));
  const browser = spawn(chromeBinary, [
    '--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run',
    '--no-default-browser-check', '--no-sandbox', '--disable-background-networking',
    '--remote-debugging-port=0', '--window-size=390,844', '--user-data-dir=' + profile,
    'http://127.0.0.1:' + port + '/app-shell.html'
  ], { stdio:'ignore' });
  let socket;
  const close = async () => {
    try { socket?.close(); } catch {}
    try { browser.kill(); } catch {}
    await new Promise(resolve => server.close(resolve));
    await fsp.rm(profile, { recursive:true, force:true }).catch(() => {});
  };
  try {
    let debugPort;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try { debugPort = Number((await fsp.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
      catch { await sleep(250); }
    }
    assert.ok(debugPort, 'Chrome DevTools não iniciou');
    let tab;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const tabs = await (await fetch('http://127.0.0.1:' + debugPort + '/json/list')).json();
      tab = tabs.find(item => item.type === 'page' && item.url.includes('/app-shell.html'));
      if (tab) break;
      await sleep(150);
    }
    assert.ok(tab, 'Aba do FARO não abriu no Chrome');
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
      ready = await evaluate("Boolean(window.__vettaApp && window.FaroRegisterEarnings && window.FaroRegister && document.getElementById('recordGross'))");
      if (ready) break;
      await sleep(250);
    }
    assert.ok(ready, 'Runtime do FARO e Registro não ficaram prontos');
    return { evaluate, command, close, sleep };
  } catch (error) {
    await close();
    throw error;
  }
}

module.exports = { openFaro, findChrome, sleep };

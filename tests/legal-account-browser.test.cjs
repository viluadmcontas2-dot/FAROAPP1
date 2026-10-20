// Chrome real com SDK falso: prova o cliente sem excluir contas nem chamar provedores.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { openFaro } = require('../scripts/lib/faro-browser.cjs');
(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'faro-legal-'));
  let browser;
  try {
    for (const item of await fs.readdir('.')) {
      if (item.startsWith('.') || item === '_site') continue;
      await fs.symlink(path.resolve(item), path.join(root, item));
    }
    await fs.unlink(path.join(root, 'faro-account.js'));
    await fs.writeFile(path.join(root, 'faro-account.js'), (await fs.readFile('faro-account.js', 'utf8')).replace("'./vendor/supabase-js-2.112.3.mjs'", "'./fake-sdk.js'"));
    await fs.writeFile(path.join(root, 'fake-sdk.js'), `
      export const createClient = () => {
        const session = localStorage.getItem('test-deleted') ? null : { user:{ id:'teste',email:'teste@example.test' } };
        const query = table => ({ select(){return this},eq(){return this},upsert(){return this},
          then(resolve){resolve({data:null,error:null})},
          async maybeSingle(){return {data:table==='faro_state'?{state:window.__vettaApp.state,revision:1}:null}},
          async single(){return {data:{revision:1}}} });
        return { from:query, auth:{ async getSession(){return {data:{session}}},onAuthStateChange(){},
          async signOut(){localStorage.setItem('test-deleted','1');return {error:null}} },
          functions:{ invoke:async(name,options)=>{
            window.testInvocations=(window.testInvocations||0)+1;
            window.testRequest={name,options};
            return new Promise(resolve=>{window.testResolveDeletion=resolve});
          }} };
      };
    `);
    browser = await openFaro(root);
    const run = body => browser.evaluate(`(async()=>{const app=window.__vettaApp;const el=id=>document.getElementById(id);${body}})()`);
    await browser.sleep(500);
    assert.equal(await run(`return el('faroAccountBadge').textContent;`), 'CONTA');
    await run(`window.nativeConfirms=0;window.confirm=()=>{window.nativeConfirms++;return true};`);
    assert.equal(await run(`const hrefs=[...document.querySelectorAll('#view-more a')].map(a=>a.getAttribute('href'));return hrefs.includes('termos.html')&&hrefs.includes('privacidade.html')&&!!el('faroExportData')&&!!el('faroDeleteAccount');`), true);
    assert.equal(await run(`let n=0;const o=app.exportData;app.exportData=function(){n++};el('faroExportData').click();app.exportData=o;return n===1;`), true);
    await run(`app.state.records=[{date:'2026-10-19',gross:123,km:10,hours:1}];app.state.onboardingComplete=true;app.save();app.showView('more');el('faroDeleteAccount').click();`);
    assert.equal(await run(`return el('faroDeleteDialog').open && !el('faroDeleteStepOne').hidden && el('faroDeleteStepTwo').hidden && !window.testInvocations;`), true);
    await run(`el('faroDeleteCancel').click();`);
    assert.equal(await run(`return !el('faroDeleteDialog').open && app.state.records.length===1;`), true);
    await run(`el('faroDeleteAccount').click();el('faroDeleteContinue').click();el('faroDeleteWord').value='EXCLUIR';el('faroDeleteWord').dispatchEvent(new Event('input'));el('faroDeleteConfirm').click();`);
    await browser.sleep(100);
    assert.equal(await run(`return window.testInvocations===1 && app.state.records[0].gross===123 && el('faroDeleteConfirm').disabled;`), true);
    await run(`window.testResolveDeletion({error:{message:'falha'}});`);
    await browser.sleep(100);
    assert.equal(await run(`return app.state.records[0].gross===123 && el('faroDeleteNotice').textContent.includes('não confirmada');`), true);
    await run(`el('faroDeleteConfirm').click();`);
    await browser.sleep(100);
    assert.equal(await run(`return JSON.parse(localStorage.getItem('faro-deleted-account-backup-v1')).records[0].gross===123 && app.state.records.length===1;`), true);
    // Resposta sem erro, mas sem deleted:true, também não autoriza limpar.
    await run(`window.testResolveDeletion({data:{deleted:false}});`);
    await browser.sleep(100);
    assert.equal(await run(`return app.state.records.length;`), 1);
    await run(`el('faroDeleteConfirm').click();`);
    await browser.sleep(100);
    assert.equal(await run(`return window.nativeConfirms===0 && window.testRequest.name==='excluir-conta-faro';`), true);
    await run(`window.testResolveDeletion({data:{deleted:true}});`);
    await browser.sleep(1000);
    assert.equal(await run(`return app.state.records.length===0 && !el('faroDeletedBackup').classList.contains('hidden');`), true);
    // O mesmo exportador recebe a cópia, sem restaurá-la ao estado ativo.
    assert.equal(await run(`let gross;app.exportData=function(){gross=this.state.records[0]?.gross};el('faroExportDeleted').click();return gross===123 && app.state.records.length===0;`), true);
    await run(`el('faroRemoveDeleted').click();`);
    assert.equal(await run(`return localStorage.getItem('faro-deleted-account-backup-v1')===null;`), true);
    console.log('PASS Chrome: duas etapas, cancelamento, falhas, confirmação do servidor, limpeza e exportação da cópia.');
  } finally { await browser?.close(); await fs.rm(root,{recursive:true,force:true}); }
})().catch(error=>{console.error(error);process.exitCode=1});

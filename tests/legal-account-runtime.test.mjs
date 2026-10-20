import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const tick = () => new Promise(resolve => setImmediate(resolve));
async function harness() {
  const elements = new Map();
  class Element {
    constructor(id) { this.id=id; this.listeners={}; this.hidden=false; this.disabled=false; this.value=''; this.dataset={}; this.textContent=''; this.classes=new Set(); this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),contains:c=>this.classes.has(c),toggle:(c,v)=>v?this.classes.add(c):this.classes.delete(c)}; }
    set innerHTML(html) { for (const match of html.matchAll(/<[^>]+id="([^"]+)"[^>]*>/g)) { const el = new Element(match[1]); el.hidden=/\shidden(?:[\s>])/.test(match[0]); el.disabled=/\sdisabled(?:[\s>])/.test(match[0]); if (/class="[^"]*hidden/.test(match[0])) el.classes.add('hidden'); elements.set(el.id,el); } }
    appendChild(el){elements.set(el.id,el)} prepend(el){elements.set(el.id,el)} setAttribute(){} focus(){} showModal(){this.open=true} close(){this.open=false} addEventListener(name,fn){this.listeners[name]=fn}
    click(){if(!this.disabled)return this.listeners.click?.()}
  }
  const storage = new Map();
  const app = {state:{records:[{gross:123}]},save(){storage.set('faro-app-finance-v1',JSON.stringify(this.state))},cloneDefaults:()=>({records:[]}),syncInputs(){},render(){},toast(){},exportData(){sandbox.exported=this.state}};
  const query = {select(){return this},eq(){return this},upsert(){return this},then(resolve){resolve({error:null})},async maybeSingle(){return {data:{state:app.state,revision:1}}},async single(){return {data:{revision:1}}}};
  let calls=0, resolveRequest;
  const client={from:()=>query,auth:{getSession:async()=>({data:{session:{user:{id:'user'}}}}),onAuthStateChange(){},signOut:async()=>({error:null})},functions:{invoke:()=>{calls++;return new Promise(resolve=>{resolveRequest=resolve})}}};
  elements.set('view-more',new Element('view-more'));
  const sandbox = { console,crypto:{randomUUID:()=> 'id'},setTimeout:()=>1,clearTimeout(){},navigator:{onLine:true},location:{reload(){sandbox.reloaded=true}},URL,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{getElementById:id=>elements.get(id),createElement:()=>new Element(),body:new Element(),head:new Element()},
    createClient:()=>client };
  sandbox.window={__vettaApp:app,FARO_CONFIG:{supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'public'},addEventListener(){}};
  vm.runInNewContext(readFileSync('faro-account.js','utf8').replace('await import(SDK_URL)', '({ createClient: globalThis.createClient })'),sandbox);
  await tick();
  const el=id=>elements.get(id);
  const start=()=>{el('faroDeleteAccount').click();el('faroDeleteContinue').click();el('faroDeleteWord').value='EXCLUIR';el('faroDeleteWord').listeners.input();return el('faroDeleteConfirm').click()};
  return {app,storage,sandbox,el,start,calls:()=>calls,resolve:value=>resolveRequest(value)};
}
test('Cliente confirma duas etapas e preserva dados até sucesso explícito', async()=>{
  const h=await harness();
  h.el('faroDeleteAccount').click(); assert.equal(h.calls(),0); assert.equal(h.el('faroDeleteStepTwo').hidden,true);
  h.el('faroDeleteCancel').click(); assert.equal(h.el('faroDeleteDialog').open,false);
  let pending=h.start(); assert.equal(h.calls(),1); assert.equal(h.app.state.records[0].gross,123);
  h.el('faroDeleteConfirm').click(); assert.equal(h.calls(),1);
  h.resolve({error:{message:'erro'}});await pending;
  assert.equal(h.app.state.records[0].gross,123);assert.equal(h.sandbox.reloaded,undefined);
  pending=h.start();h.resolve({data:{deleted:false}});await pending;assert.equal(h.app.state.records.length,1);
  pending=h.start();h.resolve({data:{deleted:true}});await pending;
  assert.equal(h.app.state.records.length,0);assert.equal(h.sandbox.reloaded,true);
  assert.equal(JSON.parse(h.storage.get('faro-deleted-account-backup-v1')).records[0].gross,123);
  h.el('faroExportDeleted').click();assert.equal(h.sandbox.exported.records[0].gross,123);assert.equal(h.app.state.records.length,0);
  h.el('faroRemoveDeleted').click();assert.equal(h.storage.has('faro-deleted-account-backup-v1'),false);
});
test('Cliente não chama servidor offline nem sobrescreve cópia anterior', async()=>{
  const h=await harness();h.sandbox.navigator.onLine=false;await h.start();assert.equal(h.calls(),0);
  h.storage.set('faro-deleted-account-backup-v1','copia anterior');h.el('faroDeleteDialog').close();h.el('faroDeleteAccount').click();
  assert.equal(h.el('faroDeleteDialog').open,false);assert.equal(h.storage.get('faro-deleted-account-backup-v1'),'copia anterior');
});

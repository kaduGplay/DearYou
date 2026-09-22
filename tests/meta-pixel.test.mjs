import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code = ts.transpileModule(fs.readFileSync('src/lib/meta-pixel.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function setup(storage = new Map(), ready = true) {
  const calls = [], window = {}, exports = {};
  if (ready) window.fbq = (...args) => calls.push(args);
  vm.runInNewContext(code, { exports, window, localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) } });
  return { api: exports, calls, window, storage };
}
const paid = { id: 'test-order', plan: 'dia', amountCents: 1990, status: 'paid', provider: 'voidpay' };
test('Purchase requires a paid real order and a valid amount', () => {
  const {api, calls} = setup();
  for (const status of ['pending', 'failed', 'expired']) api.trackPurchase({...paid, status});
  api.trackPurchase({...paid, provider:'mock'});
  api.trackPurchase({...paid, amountCents:NaN});
  api.trackPurchase({...paid, amountCents:0});
  assert.equal(calls.length,0);
  api.trackPurchase(paid);
  assert.equal(calls.length,1);
  assert.equal(calls[0][1],'27993934270289164');
  assert.equal(calls[0][2],'Purchase');
  assert.equal(calls[0][3].value,19.9);
  assert.equal(calls[0][3].currency,'BRL');
  assert.equal(calls[0][4].eventID,'purchase:test-order');
});
test('Late script load queues events and deduplicates the same order', () => {
  const {api, calls, window} = setup(new Map(),false);
  api.trackPurchase(paid);api.trackPurchase(paid);
  assert.equal(calls.length,0);
  window.fbq=(...args)=>calls.push(args);api.flushMetaEvents();
  assert.equal(calls.length,1);
  api.trackPurchase(paid);assert.equal(calls.length,1);
});
test('Reloads share the order marker; a different purchase is recorded', () => {
  const first=setup();first.api.trackPurchase(paid);
  const second=setup(first.storage);second.api.trackPurchase(paid);
  assert.equal(second.calls.length,0);
  second.api.trackPurchase({...paid,id:'second-order',plan:'eterno',amountCents:3490});
  assert.equal(second.calls.length,1);assert.equal(second.calls[0][3].value,34.9);
});
test('Tracking failures never interrupt the customer flow', () => {
  const {api,window}=setup();window.fbq=()=>{throw new Error('blocked')};
  assert.doesNotThrow(()=>api.trackPurchase(paid));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, require, Buffer, process, URL, Date });
  return exports;
}
const { providerStatus, transactionData, safeTokenEqual } = load('src/lib/payments/voidpay-status.ts');
const { metaConversionPayload, captureMetaAttribution } = load('src/lib/meta-conversion-payload.ts');

test('Only a matching authenticated transaction and amount can confirm payment', () => {
  assert.equal(providerStatus({ id:'t1', amount:19.9, status:'COMPLETED' },'t1',1990),'paid');
  assert.equal(providerStatus({ id:'t1', amount:19.9, status:'PENDING' },'t1',1990),'pending');
  assert.equal(providerStatus({ id:'t1', amount:19.9, status:'OK' },'t1',1990),'pending');
  assert.throws(()=>providerStatus({ id:'other', amount:19.9, status:'PAID' },'t1',1990));
  assert.throws(()=>providerStatus({ id:'t1', amount:1, status:'PAID' },'t1',1990));
  assert.equal(providerStatus({ id:'t1', amount:19.9, status:'REFUNDED', payedAt:'2026-01-01' },'t1',1990),'pending');
});
test('Nested payloads work; non-ASCII tokens cannot crash the comparison', () => {
  assert.equal(transactionData({data:{transaction:{id:'t1'}}}).id,'t1');
  assert.equal(safeTokenEqual('ab','éa'),false);
  assert.equal(safeTokenEqual('abc','abc'),true);
});
test('Generated PIX and paid sale have distinct stable IDs, times and correct BRL values', () => {
  const order={id:'o1',userId:'u1',plan:'dia',status:'pending',provider:'voidpay',amountCents:1990,pixCode:'test',pixGeneratedAt:new Date('2026-09-22T12:00:00Z'),paidAt:null,metaAttribution:{fbp:'fb.1.123.456'},user:{email:' CUSTOMER@EXAMPLE.COM '}};
  assert.equal(metaConversionPayload(order,'Purchase','https://example.com'),null);
  const generated=metaConversionPayload(order,'PIXGenerated','https://example.com');
  assert.equal(generated.event_id,'pix-generated:o1');
  assert.match(generated.user_data.em[0],/^[a-f0-9]{64}$/);
  assert.equal(generated.user_data.fbp,'fb.1.123.456');
  const paid=metaConversionPayload({...order,status:'paid',paidAt:new Date('2026-09-22T12:05:00Z')},'Purchase','https://example.com');
  assert.equal(paid.event_id,'purchase:o1');assert.equal(paid.custom_data.value,19.9);assert.equal(paid.custom_data.currency,'BRL');
  assert.equal(paid.event_time-generated.event_time,300);
  assert.equal(metaConversionPayload({...order,provider:'mock'},'PIXGenerated','https://example.com'),null);
});
test('Attribution uses customer checkout cookies, not the webhook sender', () => {
  const req=new Request('https://example.com/api/checkout',{headers:{cookie:'_fbp=fb.1.123.456; _fbc=fb.1.123.abc; private=secret','user-agent':'test browser','x-forwarded-for':'203.0.113.10'}});
  const data=captureMetaAttribution(req);
  assert.equal(data.fbp,'fb.1.123.456');assert.equal(data.client_user_agent,'test browser');assert.equal(data.private,undefined);
});

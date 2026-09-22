import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import ts from "typescript";
import { createRequire } from "node:module";
// Requires a disposable schema named dearyou_test_<number>. All external HTTP calls are mocked.
const root=process.cwd(),baseRequire=createRequire(root+'/package.json'),cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const loadedModule={exports:{}};cache.set(file,loadedModule);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;function resolve(name){if(name.startsWith('@/')||name.startsWith('.')){let f=name.startsWith('@/')?path.join(root,'src',name.slice(2)):path.resolve(path.dirname(file),name);if(fs.existsSync(f+'.ts'))f+='.ts';else if(fs.existsSync(path.join(f,'index.ts')))f=path.join(f,'index.ts');return load(f)}return baseRequire(name)}vm.runInThisContext('(function(exports,require,module,__filename,__dirname){'+code+'\n})',{filename:file})(loadedModule.exports,resolve,loadedModule,file,path.dirname(file));return loadedModule.exports;}
assert.match(process.env.PAYMENT_TEST_SCHEMA||'',/^dearyou_test_\d+$/);assert.equal(new URL(process.env.DATABASE_URL).searchParams.get('schema'),process.env.PAYMENT_TEST_SCHEMA);
process.env.PAYMENT_PROVIDER='voidpay';delete process.env.META_CAPI_ACCESS_TOKEN;
const {db}=load(root+'/src/lib/db.ts');const hook=load(root+'/src/app/api/webhooks/voidpay/route.ts');const payments=load(root+'/src/lib/payments/index.ts');const meta=load(root+'/src/lib/meta-conversions.ts');
let testUserId;
let remoteStatus='PENDING',remoteAmount=19.9,remoteError=false,metaError=false;const metaRequests=[];
global.fetch=async(url,init)=>{const u=new URL(url);if(u.hostname==='graph.facebook.com'){const body=JSON.parse(init.body);metaRequests.push(body);return Response.json(metaError?{error:{code:2}}:{events_received:body.data.length},{status:metaError?500:200});}if(u.pathname==='/api/v1/gateway/transactions'){if(remoteError)return Response.json({error:'temporary'},{status:503});return Response.json({id:u.searchParams.get('id'),amount:remoteAmount,status:remoteStatus});}throw new Error('Unexpected network call: '+u.hostname)};
(async()=>{try{
 const user=await db.user.create({data:{name:'Test',email:'test@example.com',passwordHash:'test'}});
 testUserId=user.id;
 const page=await db.page.create({data:{userId:user.id,slug:'webhook-test',title:'Test',recipient:'Test',startDate:new Date('2024-01-01')}});
 const order=await db.order.create({data:{userId:user.id,pageId:page.id,provider:'voidpay',providerRef:'ref-test',plan:'dia',amountCents:1990,webhookToken:'token-test',pixCode:'TEST',pixGeneratedAt:new Date()}});
 const call=(body,token)=>hook.POST(new Request('https://example.com/api/webhooks/voidpay',{method:'POST',headers:{'Content-Type':'application/json',...(token?{'x-webhook-token':token}:{})},body:JSON.stringify(body)}));
 await db.$transaction(tx=>meta.queueMetaConversion(tx,order.id,'PIXGenerated'));
 assert.equal(await db.metaConversion.count({where:{name:'PIXGenerated'}}),1);
 let r=await call({transactionId:order.providerRef,status:'PAID'});assert.equal(r.status,503);assert.equal((await db.order.findUnique({where:{id:order.id}})).status,'pending');assert.equal(await db.metaConversion.count({where:{name:'Purchase'}}),0);console.log('PASS forged PAID with gateway PENDING cannot publish');
 r=await call({transactionId:order.providerRef},'éxxxxxxxx');assert.equal(r.status,401);console.log('PASS bad/non-ASCII token rejected');
 remoteError=true;r=await call({transactionId:order.providerRef},'token-test');assert.equal(r.status,503);remoteError=false;
 remoteStatus='COMPLETED';remoteAmount=1;r=await call({transactionId:order.providerRef},'token-test');assert.equal(r.status,503);remoteAmount=19.9;console.log('PASS gateway error and wrong amount do not publish');
 const replies=await Promise.all(Array.from({length:4},()=>call({data:{transaction:{id:order.providerRef,status:'PAID'}}},'token-test')));assert.ok(replies.every(r=>r.status===200));
 const paid=await db.order.findUnique({where:{id:order.id}}),published=await db.page.findUnique({where:{id:page.id}});assert.equal(paid.status,'paid');assert.equal(published.status,'published');assert.equal(await db.metaConversion.count({where:{name:'Purchase'}}),1);console.log('PASS concurrent webhooks publish once and queue one Purchase');
 remoteStatus='FAILED';await call({transactionId:order.providerRef,status:'FAILED'},'token-test');await payments.failOrder(order.id);
 const after=await db.page.findUnique({where:{id:page.id}});assert.equal(after.publishedAt.getTime(),published.publishedAt.getTime());assert.equal(after.expiresAt.getTime(),published.expiresAt.getTime());assert.equal((await db.order.findUnique({where:{id:order.id}})).status,'paid');console.log('PASS late failure and duplicates preserve paid state and expiration');
 assert.equal(metaRequests.length,0);await meta.flushMetaConversions();assert.equal(metaRequests.length,0);console.log('PASS missing Meta token retains queue without claiming delivery');
 process.env.META_CAPI_ACCESS_TOKEN='fake-test-token';metaError=true;await meta.flushMetaConversions();assert.equal(await db.metaConversion.count({where:{status:'sent'}}),0);assert.equal((await db.order.findUnique({where:{id:order.id}})).status,'paid');
 const first=metaRequests[0];await db.metaConversion.updateMany({data:{nextAttemptAt:new Date(0)}});metaError=false;await meta.flushMetaConversions();assert.equal(await db.metaConversion.count({where:{status:'sent'}}),2);assert.deepEqual(metaRequests[1].data.map(e=>e.event_id),first.data.map(e=>e.event_id));assert.deepEqual(metaRequests[1].data.map(e=>e.event_time),first.data.map(e=>e.event_time));console.log('PASS Meta failure retries stable event IDs/timestamps without undoing payment');
 await meta.flushMetaConversions();assert.equal(metaRequests.length,2);console.log('PASS acknowledged Meta events are not resent');
 const cron=load(root+'/src/app/api/cron/payments/route.ts');assert.equal((await cron.GET(new Request('https://example.com/api/cron/payments'))).status,401);console.log('PASS recovery endpoint requires secret');
 console.log('All integration tests passed. Gateway and Meta were mocked; isolated schema only.');
}finally{if(testUserId)await db.user.delete({where:{id:testUserId}});await db.$disconnect()}})().catch(e=>{console.error(e);process.exitCode=1});

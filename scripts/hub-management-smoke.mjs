import assert from "node:assert/strict";
import {createHmac,randomUUID} from "node:crypto";
assert.equal(process.env.HUB_MANAGEMENT_TEST_ALLOW_MUTATIONS,"isolated-only");
assert.equal(new URL(process.env.DATABASE_URL).hostname,"onlyfood-test-db");
const base="http://127.0.0.1:3000",path="/api/integrations/nanolabs/management",actor="isolated-qa",key=process.env.HUB_MANAGEMENT_TOKEN;
let assertions=0;const check=(v,label)=>{assert.ok(v,label);assertions++;};
function signed(method,suffix,body){const timestamp=String(Date.now());return {"Content-Type":"application/json",Authorization:"Bearer "+key,"X-NanoLabs-Actor":actor,"X-NanoLabs-Timestamp":timestamp,"X-NanoLabs-Signature":createHmac("sha256",key).update([timestamp,method,path+suffix,actor,body].join("\n")).digest("hex")};}
async function read(resource,extra={}){const suffix="?"+new URLSearchParams({resource,...extra}),r=await fetch(base+path+suffix,{headers:signed("GET",suffix,"")}),j=await r.json();assert.equal(r.status,200,resource+":"+j.code);check(j.product==="onlyfood"&&j.contract==="nanolabs.saas.management.v1","contract");return j.data;}
const command=(operation,input)=>({requestId:randomUUID(),actor,operation,input});
async function send(c,expected=200){const body=JSON.stringify(c),r=await fetch(base+path,{method:"POST",headers:signed("POST","",body),body}),j=await r.json();assert.equal(r.status,expected,c.operation+":"+j.code);assertions++;if(expected===200)check(j.requestId===c.requestId&&j.success,"receipt contract");return j;}
async function update(operation,tenantId,extra,expected=200){const t=await read("tenant",{tenantId});return send(command(operation,{tenantId,version:t.version,...extra}),expected);}
check((await fetch(base+"/api/health")).status===200,"health");check((await fetch(base+path)).status===401,"anonymous");
const catalog=await read("catalog");check(catalog.operations.length===12&&catalog.destructiveDelete===false&&catalog.paymentLifecycle,"catalog");
const modules=Object.fromEntries(catalog.modules.map(k=>[k,true])),limits={maxLocations:3,maxProducts:100};
const plan={code:"ISOLATED_QA",name:"QA plan",description:"",priceCents:10000,currency:"ARS",active:true,modules,limits};
const planId=(await send(command("plan.create",plan))).data.entityId;
const start=new Date(Date.now()-60000).toISOString(),end=new Date(Date.now()+30*86400000).toISOString();
const input=s=>({name:"QA company "+s,slug:"qa-"+s,planId,ownerName:"QA owner "+s,ownerEmail:"qa-"+s+"@example.invalid",password:"Initial-fixture-password-2026",status:"TRIAL",start,end});
await send(command("tenant.create",{...input("expired"),start:"2020-01-01T00:00:00.000Z",end:"2020-02-01T00:00:00.000Z"}),422);
await send(command("tenant.create",{...input("reserved"),slug:"onlyerp"}),422);
const ca=command("tenant.create",input("a")),first=await send(ca),replay=await send(ca);assert.deepEqual(first.data,replay.data);assertions++;
await send({...ca,input:{...ca.input,name:"Another name"}},409);
const cb=command("tenant.create",input("b")),[b1,b2]=await Promise.all([send(cb),send(cb)]);check(b1.data.entityId===b2.data.entityId,"concurrent create once");
const a=first.data.entityId,b=b1.data.entityId;let ta=await read("tenant",{tenantId:a}),tb=await read("tenant",{tenantId:b});
check(ta.admins[0].role==="OWNER"&&ta.access.enabled,"native owner and access");const initialVersion=ta.version;
await send(command("tenant.update",{tenantId:a,version:initialVersion,name:"QA renamed",slug:ta.slug}));
await send(command("tenant.status",{tenantId:a,version:initialVersion,status:"SUSPENDED"}),409);
await update("admin.update",a,{userId:tb.admins[0].id,name:"Wrong tenant",email:"wrong@example.invalid"},404);
check((await read("tenant",{tenantId:b})).admins[0].email===tb.admins[0].email,"cross tenant account untouched");
await update("module.set",a,{key:"orders",enabled:false,limit:null});check((await read("tenant",{tenantId:a})).modules.orders.enabled===false,"forced disabled");
await update("module.set",a,{key:"unknown",enabled:true,limit:null},422);
await update("subscription.update",a,{planId,start,end,status:"ACTIVE",trialEndsAt:null});check((await read("tenant",{tenantId:a})).modules.orders.override===false,"plan preserves overrides");
await update("module.set",a,{key:"orders",enabled:null,limit:null});check((await read("tenant",{tenantId:a})).modules.orders.enabled===true,"inheritance restored");
await update("tenant.update",a,{name:"QA renamed",slug:"qa-renamed"});ta=await read("tenant",{tenantId:a});check(ta.domains.some(d=>d.hostname==="qa-a.fixture.invalid")&&ta.domains.some(d=>d.hostname==="qa-renamed.fixture.invalid"&&d.primary),"rename preserves old domain alias");
await update("subscription.update",a,{planId,start:"2020-01-01T00:00:00.000Z",end:"2020-02-01T00:00:00.000Z",status:"SUSPENDED",trialEndsAt:null});
check((await read("tenant",{tenantId:a})).access.enabled===false,"expired blocked");await update("tenant.status",a,{status:"ACTIVE"},422);
const renewal=command("subscription.renew",{tenantId:a,version:(await read("tenant",{tenantId:a})).version,days:30});
const [r1,r2]=await Promise.all([send(renewal),send(renewal)]);assert.deepEqual(r1.data,r2.data);assertions++;
ta=await read("tenant",{tenantId:a});check(ta.status==="ACTIVE"&&ta.access.enabled,"explicit renewal activates");
const pay=command("payment.record",{tenantId:a,version:ta.version,amountCents:12345,currency:"ARS",status:"PENDING",method:"transfer",reference:"ISOLATED-REF-1",notes:"Synthetic fixture only",start,end,dueAt:end,paidAt:null});
const paid=await send(pay),paidAgain=await send(pay);assert.deepEqual(paid.data,paidAgain.data);assertions++;
ta=await read("tenant",{tenantId:a});check(ta.payments.length===1&&ta.payments[0].status==="PENDING"&&ta.payments[0].amountCents===12345,"one pending payment");
await send(command("payment.record",{...pay.input,version:ta.version}),409);
await update("payment.status",b,{paymentId:paid.data.entityId,status:"PAID",paidAt:start},404);
for(const status of ["PAID","OVERDUE","REFUNDED","VOID"]){await update("payment.status",a,{paymentId:paid.data.entityId,status,paidAt:start});ta=await read("tenant",{tenantId:a});check(ta.payments[0].status===status,"payment lifecycle "+status);if(status==="OVERDUE")check(ta.status==="PAST_DUE"&&!ta.access.enabled,"overdue blocks access");}
await update("subscription.renew",a,{days:1});
ta=await read("tenant",{tenantId:a});await update("admin.update",a,{userId:ta.admins[0].id,name:"Updated owner",email:"updated-owner@example.invalid",password:"Changed-fixture-password-2026"});
ta=await read("tenant",{tenantId:a});check(ta.admins[0].email==="updated-owner@example.invalid","native credentials updated");await update("admin.revoke",a,{userId:ta.admins[0].id});
let p=(await read("plans")).items.find(p=>p.id===planId);const planEdit={...plan};delete planEdit.code;await send(command("plan.update",{...planEdit,planId,version:p.version,name:"QA retired",active:false}));
await send(command("tenant.create",input("inactive")),422);check((await read("tenant",{tenantId:a})).plan.active===false,"inactive plan retained");
await update("subscription.update",b,{planId,start,end,status:"TRIAL",trialEndsAt:end});
const audit=await read("audit",{tenantId:a});check(audit.items.length>0&&audit.items.every(e=>e.tenantId===a),"scoped audit");
const wire=JSON.stringify([audit,ta]);check(!wire.includes(key)&&!wire.includes("Changed-fixture-password-2026"),"no secrets in responses");
const v1=await(await fetch(base+"/api/integrations/nanolabs/tenants",{headers:{Authorization:"Bearer "+process.env.HUB_INTEGRATION_TOKEN}})).json();check(v1.tenants.length===2&&v1.capabilities.tenantWrite===false&&v1.capabilities.moduleWrite===false,"legacy read contract");
check((await fetch(base+path,{method:"DELETE",headers:signed("DELETE","","")})).status===405,"no destructive delete");
console.log(JSON.stringify({product:"onlyfood",assertions,result:"ISOLATED_MANAGEMENT_SMOKE_PASS",fixtures:2}));

import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import {createHmac,randomUUID} from "node:crypto";
assert.equal(process.env.HUB_MANAGEMENT_TEST_ALLOW_MUTATIONS,"isolated-only");assert.equal(new URL(process.env.DATABASE_URL).hostname,"onlyfood-test-db");
const path="/api/integrations/nanolabs/management",key=process.env.HUB_MANAGEMENT_TOKEN,actor="isolated-qa";
function signed(method,suffix,body){const time=String(Date.now());return {"Content-Type":"application/json",Authorization:"Bearer "+key,"X-NanoLabs-Actor":actor,"X-NanoLabs-Timestamp":time,"X-NanoLabs-Signature":createHmac("sha256",key).update([time,method,path+suffix,actor,body].join("\n")).digest("hex")};}
const listing=await(await fetch("http://127.0.0.1:3000/api/integrations/nanolabs/tenants",{headers:{Authorization:"Bearer "+process.env.HUB_INTEGRATION_TOKEN}})).json();
const t=listing.tenants.find(t=>t.name==="QA renamed");assert.ok(t);
const suffix="?"+new URLSearchParams({resource:"tenant",tenantId:t.id});
const tenant=(await(await fetch("http://127.0.0.1:3000"+path+suffix,{headers:signed("GET",suffix,"")})).json()).data;
const host=tenant.slug+".fixture.invalid";
function request(method,body="",extra={}){return new Promise((resolve,reject)=>{const req=http.request({hostname:"127.0.0.1",port:3000,path:"/admin/settings",method,headers:{Host:host,...extra,...(body?{"Content-Length":Buffer.byteLength(body)}:{})}},res=>{let text="";res.on("data",c=>text+=c);res.on("end",()=>resolve({status:res.statusCode,headers:res.headers,text}));});req.on("error",reject);req.end(body);});}
const manifest=JSON.parse(fs.readFileSync("/app/.next/server/server-reference-manifest.json","utf8"));
const action=Object.entries(manifest.node).find(([,v])=>v.filename==="app/actions/admin-auth.ts"&&v.exportedName==="loginAdmin")?.[0];assert.ok(action);
const login=await request("POST",JSON.stringify(["updated-owner@example.invalid","Changed-fixture-password-2026"]),{"Next-Action":action,Accept:"text/x-component","Content-Type":"text/plain;charset=UTF-8",Origin:"http://"+host});
assert.equal(login.status,200);const setCookies=login.headers["set-cookie"]||[];assert.ok(setCookies.length>0,"native login did not create session");
const cookie=setCookies.map(c=>c.split(";")[0]).join("; ");
const page=await request("GET","",{Cookie:cookie});assert.equal(page.status,200);assert.ok(!page.text.includes("Acceso Restringido"));
const body=JSON.stringify({requestId:randomUUID(),actor,operation:"admin.revoke",input:{tenantId:tenant.id,version:tenant.version,userId:tenant.admins[0].id}});
assert.equal((await fetch("http://127.0.0.1:3000"+path,{method:"POST",headers:signed("POST","",body),body})).status,200);
const denied=await request("GET","",{Cookie:cookie});assert.ok(denied.text.includes("Acceso Restringido"));
console.log(JSON.stringify({product:"onlyfood",result:"NATIVE_LOGIN_AND_SESSION_REVOCATION_PASS"}));

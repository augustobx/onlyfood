import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";

assert.equal(process.env.USABILITY_TEST_ALLOW_MUTATIONS, "isolated-only");
const database = new URL(process.env.DATABASE_URL);
assert.equal(database.hostname, "onlyfood-test-db");
assert.ok(database.pathname.endsWith("_test"));
const manifest = JSON.parse(fs.readFileSync("/app/.next/server/server-reference-manifest.json", "utf8"));
const actionId = (filename, name) => {
  const entry = Object.entries(manifest.node).find(([, value]) => value.filename === filename && value.exportedName === name);
  assert.ok(entry, `Action ${name} is present`); return entry[0];
};
const host = "usability.localhost";
function request(path, method = "GET", body = "", headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({hostname:"127.0.0.1",port:3000,path,method,headers:{Host:host,...headers,...(body && {"Content-Length":Buffer.byteLength(body)})}}, res => {
      let text = ""; res.on("data", chunk => text += chunk); res.on("end", () => resolve({status:res.statusCode,headers:res.headers,text}));
    }); req.on("error", reject); req.end(body);
  });
}
const loginId = actionId("app/actions/admin-auth.ts", "loginAdmin");
let checks = 0, ownerCookie;
for (const [role, home] of [["OWNER","/admin/live"],["MANAGER","/admin/live"],["KITCHEN","/admin/live"],["CASHIER","/admin/cash"],["DELIVERY","/admin/calendar"],["STAFF","/admin/live"]]) {
  const response = await request("/admin", "POST", JSON.stringify([role.toLowerCase()+"@usability.invalid","Usability-Fixture-2026!"]), {"Next-Action":loginId,Accept:"text/x-component","Content-Type":"text/plain;charset=UTF-8",Origin:"http://"+host});
  const cookie = (response.headers["set-cookie"] || []).map(item => item.split(";")[0]).join("; ");
  assert.ok(cookie, `${role} logs in`); checks++;
  const redirect = await request("/admin","GET","",{Cookie:cookie});
  assert.equal(redirect.headers.location, home, `${role} home`); checks++;
  const page = await request(home,"GET","",{Cookie:cookie});
  assert.equal(page.status,200,`${role} can open home`); checks++;
  const settingsLink = /<a\b[^>]*href="\/admin\/settings"/.test(page.text);
  assert.equal(settingsLink,["OWNER","MANAGER"].includes(role),`${role} navigation`); checks++;
  if (role === "OWNER") ownerCookie = cookie;
}
const history = await request("/admin/history","POST",JSON.stringify([{search:"Sentinela antigua"}]),{"Next-Action":actionId("app/actions/admin-history.ts","getHistoryPage"),Cookie:ownerCookie,Accept:"text/x-component","Content-Type":"text/plain;charset=UTF-8",Origin:"http://"+host});
assert.equal(history.status,200);assert.ok(history.text.includes('Sentinela antigua'));assert.ok(history.text.includes('"total":1'));checks+=3;
console.log(JSON.stringify({result:"ISOLATED_USABILITY_SMOKE_PASS",checks,roles:6,globalHistorySearch:true}));

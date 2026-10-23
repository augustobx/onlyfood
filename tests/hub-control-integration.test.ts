import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {prisma} from "@/lib/prisma";
import {createTenantLocation} from "@/lib/locations";
import {withProductCapacity} from "@/lib/tenant-capacity";
import {changeFeature} from "@/lib/control-plane";
import {setTenantFeatureOverride,setTenantPlan,updateTenantUserAccess} from "@/lib/superadmin";
import {onlyfoodManagement} from "@/lib/hub-management";
import {randomUUID} from "node:crypto";

describe("Hub control plane on isolated MariaDB",()=>{
 const tenantId="legacy-hub-control-test";let planId:string;
 beforeAll(async()=>{
  const url=new URL(process.env.DATABASE_URL!);expect(url.hostname).toBe("onlyfood-test-db");expect(url.pathname).toContain("test");
  const p=await prisma.plan.create({data:{code:"HUB_CONTROL_ISOLATED",name:"Isolated plan",features:["orders","multipleLocations"],maxLocations:1,maxProducts:1}});planId=p.id;
  await prisma.tenant.create({data:{id:tenantId,slug:"hub-isolated-control",name:"Isolated control",status:"ACTIVE",subscription:{create:{planId,status:"ACTIVE",currentPeriodStart:new Date(Date.now()-60000),currentPeriodEnd:new Date(Date.now()+86400000)}}}});
 });
 afterAll(async()=>{await prisma.tenant.deleteMany({where:{id:tenantId}});if(planId)await prisma.plan.deleteMany({where:{id:planId}});});
 it("rejects a stale Hub form after a native feature edit and preserves legacy IDs",async()=>{
  const url=new URL("https://fixture.invalid?resource=tenant&tenantId="+tenantId);
  const before=await onlyfoodManagement.read("tenant",url) as {version:string};
  await setTenantFeatureOverride(tenantId,"loyalty","ENABLED");
  await expect(onlyfoodManagement.execute({requestId:randomUUID(),actor:"isolated-qa",operation:"tenant.update",input:{tenantId,version:before.version,name:"Stale edit",slug:"hub-isolated-control"}},"fixture-fingerprint")).rejects.toMatchObject({status:409,code:"STALE_VERSION"});
  expect((await prisma.tenant.findUniqueOrThrow({where:{id:tenantId}})).name).toBe("Isolated control");
 });
 it("rolls back domain mutation and its audit together",async()=>{
  const count=await prisma.platformAuditLog.count({where:{tenantId}});
  await expect(prisma.$transaction(async tx=>{await changeFeature(tx,tenantId,"roulette","ENABLED");throw Error("forced rollback");})).rejects.toThrow("forced rollback");
  expect(await prisma.tenantFeature.findUnique({where:{tenantId_featureKey:{tenantId,featureKey:"roulette"}}})).toBeNull();expect(await prisma.platformAuditLog.count({where:{tenantId}})).toBe(count);
 });
 it("preserves explicit native overrides when changing a plan",async()=>{
  await setTenantPlan(tenantId,"HUB_CONTROL_ISOLATED");
  expect((await prisma.tenantFeature.findUniqueOrThrow({where:{tenantId_featureKey:{tenantId,featureKey:"loyalty"}}})).isEnabled).toBe(true);
 });
 it("enforces product capacity under concurrent creation",async()=>{
  const results=await Promise.allSettled(["Product A","Product B"].map(name=>withProductCapacity(tenantId,tx=>tx.product.create({data:{tenantId,name,basePrice:100}}))));
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(await prisma.product.count({where:{tenantId}})).toBe(1);
 });
 it("enforces branch capacity under concurrent creation",async()=>{
  const results=await Promise.allSettled(["branch-a","branch-b"].map(code=>createTenantLocation(tenantId,{name:code,code})));
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(await prisma.location.count({where:{tenantId}})).toBe(1);
 });
 it("does not mutate a shared global account from one tenant",async()=>{
  const other=await prisma.tenant.findFirstOrThrow({where:{id:{not:tenantId}}});
  const user=await prisma.user.create({data:{name:"Shared fixture",email:"hub-shared@example.invalid",passwordHash:"fixture-only"}});
  try{
   await prisma.tenantMembership.createMany({data:[{tenantId,userId:user.id,role:"OWNER"},{tenantId:other.id,userId:user.id,role:"OWNER"}]});
   await expect(updateTenantUserAccess({tenantId,userId:user.id,email:"changed-shared@example.invalid"})).rejects.toThrow("SHARED_ACCOUNT");
   expect((await prisma.user.findUniqueOrThrow({where:{id:user.id}})).email).toBe("hub-shared@example.invalid");
  }finally{await prisma.user.delete({where:{id:user.id}});}
 });
});

import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTenantDb } from "@/lib/tenant-db";
import { changeIngredientStock } from "@/lib/inventory-ledger";
const suite = process.env.RUN_DB_TESTS === "true" ? describe : describe.skip;
suite("inventory ledger transactions and tenant isolation", () => {
  let tenantId = "", other = "", ingredientId = "";
  beforeAll(async () => {
    tenantId = (await prisma.tenant.findUniqueOrThrow({where:{slug:"beats"}})).id;
    other = (await prisma.tenant.findUniqueOrThrow({where:{slug:"roma"}})).id;
    ingredientId = (await createTenantDb(tenantId).ingredient.create({data:{name:"QA queso ledger",unit:"G",stock:3000,costPerUnit:8}})).id;
  });
  afterAll(async () => {
    await prisma.ingredientMovement.deleteMany({where:{ingredientId}});
    await prisma.ingredient.deleteMany({where:{id:ingredientId,tenantId}});
  });
  const move = (quantity: number, type = "WASTE", extra = {}) => createTenantDb(tenantId).$transaction(tx => changeIngredientStock(tx as never,{tenantId,ingredientId,quantity,type,reason:"Prueba aislada",...extra}));
  it("records matching balance and movement atomically",async () => {
    await move(-30,"RESERVE");
    expect((await prisma.ingredient.findUniqueOrThrow({where:{id:ingredientId}})).stock).toBe(2970);
    expect(await createTenantDb(tenantId).ingredientMovement.findFirst({where:{ingredientId}})).toMatchObject({quantity:-30,balance:2970,type:"RESERVE"});
  });
  it("rolls back overdraw and stale physical counts",async () => {
    await expect(move(-100000)).rejects.toThrow();
    await expect(move(10,"COUNT",{expectedStock:3000})).rejects.toThrow("stock cambió");
    expect((await prisma.ingredient.findUniqueOrThrow({where:{id:ingredientId}})).stock).toBe(2970);
    expect(await createTenantDb(tenantId).ingredientMovement.count({where:{ingredientId}})).toBe(1);
  });
  it("does not expose or mutate another tenant's ingredient",async () => {
    expect(await createTenantDb(other).ingredientMovement.findMany({where:{ingredientId}})).toEqual([]);
    await expect(createTenantDb(other).$transaction(tx => changeIngredientStock(tx as never,{tenantId:other,ingredientId,quantity:10,type:"PURCHASE",reason:"No debe funcionar"}))).rejects.toThrow();
  });
  it("commits only one of two simultaneous competing reservations",async () => {
    const results = await Promise.allSettled([move(-2000,"RESERVE"),move(-2000,"RESERVE")]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect((await prisma.ingredient.findUniqueOrThrow({where:{id:ingredientId}})).stock).toBe(970);
    expect(await createTenantDb(tenantId).ingredientMovement.count({where:{ingredientId}})).toBe(2);
  });
  it("returns committed quantities and protects ledger when transaction fails",async () => {
    await move(30,"RELEASE");
    await expect(createTenantDb(tenantId).$transaction(async tx => { await changeIngredientStock(tx as never,{tenantId,ingredientId,quantity:50,type:"PURCHASE",reason:"Rollback de prueba"}); throw new Error("abort"); })).rejects.toThrow("abort");
    expect((await prisma.ingredient.findUniqueOrThrow({where:{id:ingredientId}})).stock).toBe(1000);
    expect(await createTenantDb(tenantId).ingredientMovement.count({where:{ingredientId}})).toBe(3);
  });
  it("preserves purchase price in history and blends cancelled stock at its original cost",async () => {
    await move(1000,"PURCHASE",{unitCost:12,purchasePrice:16000});
    expect(await createTenantDb(tenantId).ingredientMovement.findFirst({where:{ingredientId,type:"PURCHASE"}})).toMatchObject({quantity:1000,unitCost:16});
    await move(1000,"RELEASE",{returnUnitCost:6});
    expect((await prisma.ingredient.findUniqueOrThrow({where:{id:ingredientId}})).costPerUnit).toBe(10);
  });
});

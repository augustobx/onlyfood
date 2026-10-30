import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire('/app/package.json');
const {PrismaClient}=require('@prisma/client'),{PrismaMariaDb}=require('@prisma/adapter-mariadb');
assert.equal(process.env.USABILITY_TEST_ALLOW_MUTATIONS,'isolated-only');
const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'onlyfood-test-db');assert.ok(url.pathname.endsWith('_test'));
const target=process.env.ONLYFOOD_TEST_APP;assert.match(target,/^onlyfood-stock-app-20261030$/);
const db=new PrismaClient({adapter:new PrismaMariaDb({host:url.hostname,user:url.username,password:url.password,database:url.pathname.slice(1),connectionLimit:3})});
const manifest=JSON.parse(fs.readFileSync(process.env.ONLYFOOD_TEST_MANIFEST,'utf8'));
const actionId=(file,name)=>{const entry=Object.entries(manifest.node).find(([,v])=>v.filename===file&&v.exportedName===name);assert.ok(entry,`${name} exported`);return entry[0]};
function request(path,method='GET',body='',headers={}){return new Promise((resolve,reject)=>{const req=http.request({hostname:target,port:3000,path,method,headers:{Host:'usability.localhost',...headers,...(body&&{'Content-Length':Buffer.byteLength(body)})}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}))});req.on('error',reject);req.end(body)})}
let checks=0;
async function action(file,name,args,cookie,path='/admin/stock'){
 const res=await request(path,'POST',JSON.stringify(args),{'Next-Action':actionId(file,name),Accept:'text/x-component','Content-Type':'text/plain;charset=UTF-8',Origin:'http://usability.localhost',...(cookie&&{Cookie:cookie})});
 let value;for(const line of res.text.split('\n')){try{const parsed=JSON.parse(line.replace(/^[a-z0-9]+:/,''));if(parsed&&typeof parsed==='object'&&'success' in parsed)value=parsed;}catch{}}
 return {...res,value};
}
async function login(role){const r=await action('app/actions/admin-auth.ts','loginAdmin',[role.toLowerCase()+'@usability.invalid','Usability-Fixture-2026!'],null,'/admin');return (r.headers['set-cookie']||[]).map(s=>s.split(';')[0]).join('; ')}
const expectSuccess=res=>{assert.equal(res.status,200);assert.equal(res.value?.success,true,JSON.stringify(res.value));checks++};
try{
 const tenant=await db.tenant.findUniqueOrThrow({where:{slug:'usability'}});
 let owner;
 for(const role of ['OWNER','MANAGER','KITCHEN','CASHIER','DELIVERY','STAFF']){
  const cookie=await login(role);assert.ok(cookie);checks++;
  const page=await request('/admin/stock','GET','',{Cookie:cookie});
  if(['OWNER','MANAGER'].includes(role)){assert.equal(page.status,200);assert.ok(page.text.includes('Ingredientes y stock'));}else{assert.ok(!page.text.includes('Disponibles para nuevos pedidos'));const denied=await action('app/actions/ingredients.ts','createIngredient',[{name:'No crear '+role,unit:'UNIT',minimumStock:0,categoryIds:[]}],cookie);assert.notEqual(denied.value?.success,true);assert.equal(await db.ingredient.count({where:{tenantId:tenant.id,name:'No crear '+role}}),0)}checks++;
  if(role==='OWNER')owner=cookie;
 }
 const name='Cheddar smoke '+Date.now();
 expectSuccess(await action('app/actions/ingredients.ts','createIngredient',[{name,unit:'G',minimumStock:200,categoryIds:[]}],owner));
 let ing=await db.ingredient.findFirstOrThrow({where:{tenantId:tenant.id,name}});assert.equal(ing.stock,0);checks++;
 const move=(type,quantity,purchaseUnit,price,reason,expectedStock)=>action('app/actions/ingredients.ts','recordIngredientMovement',[{ingredientId:ing.id,type,quantity,purchaseUnit,price,reason,expectedStock}],owner);
 expectSuccess(await move('PURCHASE',3,'KG',24000,'Compra QA',0));
 ing=await db.ingredient.findUniqueOrThrow({where:{id:ing.id}});assert.equal(ing.stock,3000);assert.equal(ing.costPerUnit,8);checks++;
 expectSuccess(await move('WASTE',30,'G',0,'Merma QA',3000));
 expectSuccess(await move('COUNT',2950,'G',0,'Conteo QA',2970));
 assert.equal((await move('COUNT',2900,'G',0,'Conteo obsoleto',3000)).value?.success,false);checks++;
 assert.equal((await move('WASTE',99999,'G',0,'Sobregiro QA',2950)).value?.success,false);checks++;
 assert.equal((await move('PURCHASE',1,'L',500,'Unidad incorrecta',2950)).value?.success,false);checks++;
 const category=await db.category.findFirstOrThrow({where:{tenantId:tenant.id}});
 const productName='Burger smoke '+Date.now();
 expectSuccess(await action('app/actions/admin-catalog.ts','upsertProduct',[{name:productName,basePrice:6000,categoryId:category.id,ingredientsData:[{id:ing.id,quantity:30}]}],owner));
 const product=await db.product.findFirstOrThrow({where:{tenantId:tenant.id,name:productName}});
 const order=await action('app/actions/checkout.ts','createOrder',[{clientName:'Compra QA stock',clientPhone:'1100000000',needsDelivery:false,orderType:'SCHEDULED_TOMORROW',paymentMethod:'CASH',items:[{product:{id:product.id},quantity:2}]}],null,'/checkout');
 expectSuccess(order);
 const saved=await db.order.findUniqueOrThrow({where:{id:order.value.orderId}});assert.equal(saved.inventorySnapshot.entries[0].required,60);assert.equal(saved.inventorySnapshot.entries[0].unitCost,8);checks++;
 assert.equal((await db.ingredient.findUniqueOrThrow({where:{id:ing.id}})).stock,2890);checks++;
 expectSuccess(await move('PURCHASE',100,'G',1600,'Otra compra QA',2890));
 expectSuccess(await action('app/actions/admin-catalog.ts','upsertProduct',[{id:product.id,name:productName,basePrice:6000,categoryId:category.id,ingredientsData:[{id:ing.id,quantity:100}]}],owner));
 assert.deepEqual((await db.order.findUniqueOrThrow({where:{id:saved.id}})).inventorySnapshot,saved.inventorySnapshot);checks++;
 const tracking=await request('/track/'+saved.id+'?token='+order.value.trackingToken);assert.equal(tracking.status,200);assert.ok(!tracking.text.includes('inventorySnapshot'));checks++;
 expectSuccess(await action('app/actions/admin-orders.ts','updateOrderStatus',[saved.id,'CANCELLED'],owner,'/admin/live'));
 assert.equal((await db.ingredient.findUniqueOrThrow({where:{id:ing.id}})).stock,3050);checks++;
 const movements=await db.ingredientMovement.findMany({where:{ingredientId:ing.id},orderBy:{createdAt:'asc'}});
 assert.equal(movements.find(m=>m.type==='RESERVE').orderId,saved.id);assert.equal(movements.find(m=>m.type==='RELEASE').quantity,60);checks++;
 const other=await db.tenant.create({data:{slug:'stock-other-'+Date.now(),name:'Otro QA'}});
 const foreign=await db.ingredient.create({data:{tenantId:other.id,name:'Privado QA',stock:10}});
 const denied=await action('app/actions/ingredients.ts','recordIngredientMovement',[{ingredientId:foreign.id,type:'WASTE',quantity:1,purchaseUnit:'UNIT',price:0,reason:'No permitido',expectedStock:10}],owner);assert.equal(denied.value?.success,false);assert.equal((await db.ingredient.findUniqueOrThrow({where:{id:foreign.id}})).stock,10);checks++;
 const results=await request('/admin/metricas?range=7','GET','',{Cookie:owner});assert.equal(results.status,200);assert.ok(results.text.includes('Pagado de estos pedidos'));assert.ok(results.text.includes('Costos y margen estimado'));checks++;
 console.log(JSON.stringify({result:'INGREDIENT_STOCK_SMOKE_PASS',checks,roles:6,conversion:true,purchase:true,waste:true,count:true,staleCountRejected:true,overdrawRejected:true,frozenCosts:true,frozenCancellation:true,costsNotPublic:true,tenantIsolation:true}));
}finally{await db.$disconnect()}

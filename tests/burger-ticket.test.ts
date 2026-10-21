import {describe,expect,it} from "vitest";
import {burgerAssemblyLines,burgerTicketTotals,pattySizeLabel} from "@/lib/burger-ticket";
const ing=(id:string,name:string,quantity=1)=>({ingredientId:id,quantity,ingredient:{id,name}});
const burger={name:"Pink Floyd",category:{name:"Hamburguesas"},ingredients:[ing("meat","Medallón",2),ing("bun","Pan de papa")]};
const extra=(name:string)=>({extra:{name}});
describe("tickets 3 estaciones",()=>{
 it("doble + medallón extra pasa a triple, con 2 extras a cuádruple, un solo pan",()=>{
  const lines=burgerAssemblyLines([
    {quantity:1,product:burger,addedExtras:[extra("Agregar 1 hamburguesa")]},
    {quantity:1,product:burger,addedExtras:[extra("Agregar 2 hamburguesas")]},
  ]);
  expect(lines.map(x=>x.size)).toEqual(["TRIPLE","CUADRUPLE"]);
  expect(burgerTicketTotals([{quantity:1,product:burger,addedExtras:[extra("Agregar 2 hamburguesas")]}])).toEqual({patties:4,buns:1});
 });
 it("combo x2 de 2 burgers dobles muestra cuatro panes y ocho medallones",()=>{
  const combo={name:"Combo familiar",isCombo:true,ingredients:[]};
  const items=[{quantity:2,product:combo,comboItems:[{quantity:2,product:burger}]}];
  expect(burgerAssemblyLines(items).map(x=>[x.quantity,x.size,x.source])).toEqual([[4,"DOBLE","Combo familiar"]]);
  expect(burgerTicketTotals(items)).toEqual({patties:8,buns:4});
 });
 it("armado muestra ingredientes quitados, agregados y notas, sin pan cuando corresponde",()=>{
  const lines=burgerAssemblyLines([{quantity:2,product:burger,removedIngredients:[{ingredientId:"bun",ingredient:{id:"bun",name:"Pan de papa"}},
  {ingredientId:"onion",ingredient:{id:"onion",name:"Cebolla"}}],addedExtras:[extra("Cheddar")],notes:"bien cocida"}]);
  expect(lines).toHaveLength(1);expect(lines[0].hasBun).toBe(false);
  expect(lines[0].removed).toEqual(["Pan de papa","Cebolla"]);
  expect(lines[0].extras).toEqual(["Cheddar"]);
  expect(lines[0].notes).toBe("bien cocida");
  expect(burgerTicketTotals([{quantity:2,product:burger,removedIngredients:[{ingredientId:"bun"}]}]).buns).toBe(0);
 });
 it("no imprime armado para papas, gaseosas o sushi",()=>{
  expect(burgerAssemblyLines([{quantity:2,product:{name:"Papas fritas",ingredients:[]}}])).toEqual([]);
 });
 it("etiquetas controladas por cantidad real y gramajes",()=>{
  expect(pattySizeLabel(1)).toBe("SIMPLE");
  expect(pattySizeLabel(6)).toBe("SEXTUPLE");
  expect(pattySizeLabel(7)).toBe("7 MEDALLONES");
  expect(pattySizeLabel(0)).toBe("");
 });
});

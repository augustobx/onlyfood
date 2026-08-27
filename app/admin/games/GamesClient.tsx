"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { toggleRoulette, addRoulettePrize, deleteRoulettePrize, updateRouletteCost } from "@/app/actions/admin-games";
import { Trash2, Dices, PlusCircle, Coins } from "lucide-react";

// Interfaz para asegurar el tipado correcto del formulario
interface PrizeForm {
   name: string;
   probability: string;
   type: string;
   value: string;
   productId: string;
   bgColor: string;
   textColor: string;
}

export function GamesClient({ initialActive, initialCost, prizes, products }: { initialActive: boolean, initialCost: number, prizes: any[], products: any[] }) {
   const [isActive, setIsActive] = useState(initialActive);
   const [cost, setCost] = useState(initialCost);

   const [newPrize, setNewPrize] = useState<PrizeForm>({
      name: "",
      probability: "",
      type: "PRODUCT",
      value: "",
      productId: "none",
      bgColor: "#f97316",
      textColor: "#ffffff"
   });

   const totalProb = prizes.reduce((acc, p) => acc + p.probability, 0);

   const handleToggle = async (v: boolean) => {
      setIsActive(v);
      const res = await toggleRoulette(v);
      if (!res.success) {
         setIsActive(!v);
         toast.error("Error al actualizar estado");
      } else {
         toast.success(v ? "Ruleta encendida" : "Ruleta apagada");
      }
   };

   const handleUpdateCost = async () => {
      const res = await updateRouletteCost(cost);
      if (res.success) toast.success("Costo guardado");
      else toast.error("Error al guardar costo");
   };

   const handleAdd = async () => {
      if (!newPrize.name || !newPrize.probability) return toast.error("Completá los campos");
      if (newPrize.type === "PRODUCT" && newPrize.productId === "none") return toast.error("Elegí un producto");
      if (newPrize.type !== "PRODUCT" && !newPrize.value) return toast.error("Ingresá un valor de premio");

      const prob = Number(newPrize.probability);
      if (totalProb + prob > 100) return toast.error("La probabilidad supera el 100%");

      const res = await addRoulettePrize({
         ...newPrize,
         productId: newPrize.productId === "none" ? null : newPrize.productId
      });

      if (res.success) {
         toast.success("Premio guardado");
         setNewPrize({
            name: "", probability: "", type: "PRODUCT", value: "", productId: "none", bgColor: "#f97316", textColor: "#ffffff"
         });
      } else {
         toast.error("Error al guardar premio");
      }
   };

   const handleDelete = async (id: string) => {
      const res = await deleteRoulettePrize(id);
      if (res.success) toast.success("Premio eliminado");
      else toast.error("Error al eliminar");
   };

   return (
      <div className="space-y-6">
         <Card className="border-2 border-orange-500 shadow-sm overflow-hidden">
            <div className="bg-orange-500 text-white p-4 flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="flex gap-2 items-center">
                  <Dices className="h-6 w-6" />
                  <h2 className="text-xl font-black">Ruleta de la Suerte</h2>
               </div>

               <div className="flex gap-6 items-center">
                  <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-xl">
                     <Coins className="w-5 h-5 text-white" />
                     <Label className="text-white font-bold">Costo (Pts)</Label>
                     <Input type="number" className="w-20 h-8 text-black bg-white" value={cost} onChange={e => setCost(Number(e.target.value))} onBlur={handleUpdateCost} />
                  </div>

                  <div className="flex items-center gap-3">
                     <Label className="text-white font-bold cursor-pointer">Estado Global</Label>
                     <Switch checked={isActive} onCheckedChange={handleToggle} className="data-[state=checked]:bg-green-400" />
                  </div>
               </div>
            </div>

            <CardContent className="p-6">
               <div className="flex justify-between items-end mb-4 border-b pb-4">
                  <div>
                     <h3 className="font-bold text-lg text-slate-800">Premios Cargados</h3>
                     <p className="text-sm text-slate-500">Probabilidad total actual: <span className={`font-bold ${totalProb !== 100 ? 'text-red-500' : 'text-green-600'}`}>{totalProb}%</span> / 100%</p>
                  </div>
               </div>

               {prizes.length === 0 ? (
                  <div className="text-center p-6 text-slate-400 font-medium">No cargaste ningún premio todavía.</div>
               ) : (
                  <div className="grid gap-3 mb-8">
                     {prizes.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 border rounded-xl bg-slate-50">
                           <div className="flex gap-3 items-center">
                              <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center font-bold text-xs" style={{ backgroundColor: p.bgColor, color: p.textColor }}>
                                 {p.probability}%
                              </div>
                              <div>
                                 <p className="font-bold text-slate-800 lead">{p.name}</p>
                                 <p className="text-xs text-slate-500 uppercase">
                                    {p.type === 'PRODUCT' ? p.product?.name :
                                       p.type === 'PERCENT' ? `Descuento ${p.value}%` :
                                          `Monto Fijo $${p.value}`}
                                 </p>
                              </div>
                           </div>
                           <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                     ))}
                  </div>
               )}

               <div className="bg-slate-100 p-4 rounded-2xl border-2 border-dashed space-y-4">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Agregar Nuevo Premio</h4>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <Label>Nombre en la Gajo (ruleta)</Label>
                        <Input placeholder="Ej. ¡Coca Rellena!" value={newPrize.name} onChange={e => setNewPrize(p => ({ ...p, name: e.target.value }))} />
                     </div>
                     <div className="space-y-1">
                        <Label>Probabilidad (%)</Label>
                        <Input type="number" placeholder="Ej. 15.5" value={newPrize.probability} onChange={e => setNewPrize(p => ({ ...p, probability: e.target.value }))} />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <Label>Tipo de Premio</Label>
                        <Select value={newPrize.type} onValueChange={v => { if (v) setNewPrize(p => ({ ...p, type: v, productId: 'none', value: '' })) }}>
                           <SelectTrigger className="bg-white"><SelectValue>{newPrize.type === "PRODUCT" ? "Producto gratuito" : newPrize.type === "PERCENT" ? "Descuento (%)" : "Dinero directo ($)"}</SelectValue></SelectTrigger>
                           <SelectContent>
                              <SelectItem value="PRODUCT">Producto Gratuito</SelectItem>
                              <SelectItem value="PERCENT">Descuento (%)</SelectItem>
                              <SelectItem value="AMOUNT">Dinero Directo ($)</SelectItem>
                           </SelectContent>
                        </Select>
                     </div>

                     <div className="space-y-1">
                        {newPrize.type === "PRODUCT" ? (
                           <>
                              <Label>Elegir Producto a Regalar</Label>
                              <Select value={newPrize.productId} onValueChange={v => { if (v) setNewPrize(p => ({ ...p, productId: v })) }}>
                                 <SelectTrigger className="bg-white"><SelectValue>{newPrize.productId === "none" ? "Seleccionar producto…" : products.find((product) => product.id === newPrize.productId)?.name || "Seleccionar producto…"}</SelectValue></SelectTrigger>
                                 <SelectContent>
                                    <SelectItem value="none">Seleccionar...</SelectItem>
                                    {products.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.name}</SelectItem>)}
                                 </SelectContent>
                              </Select>
                           </>
                        ) : (
                           <>
                              <Label>Valor del premio ({newPrize.type === 'PERCENT' ? '%' : '$'})</Label>
                              <Input type="number" placeholder="Ej. 1000" className="bg-white" value={newPrize.value} onChange={e => setNewPrize(p => ({ ...p, value: e.target.value }))} />
                           </>
                        )}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <Label>Color de Fondo (Hex)</Label>
                        <div className="flex gap-2">
                           <Input type="color" className="p-1 w-12" value={newPrize.bgColor} onChange={e => setNewPrize(p => ({ ...p, bgColor: e.target.value }))} />
                           <Input className="flex-1 bg-white" value={newPrize.bgColor} onChange={e => setNewPrize(p => ({ ...p, bgColor: e.target.value }))} />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <Label>Color de Texto (Hex)</Label>
                        <div className="flex gap-2">
                           <Input type="color" className="p-1 w-12" value={newPrize.textColor} onChange={e => setNewPrize(p => ({ ...p, textColor: e.target.value }))} />
                           <Input className="flex-1 bg-white" value={newPrize.textColor} onChange={e => setNewPrize(p => ({ ...p, textColor: e.target.value }))} />
                        </div>
                     </div>
                  </div>

                  <Button className="w-full mt-2 font-bold bg-orange-500 hover:bg-orange-600" onClick={handleAdd}>Guardar Gajo</Button>
               </div>
            </CardContent>
         </Card>
      </div>
   );
}

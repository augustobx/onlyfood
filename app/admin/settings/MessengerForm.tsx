"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { addMessenger, toggleMessenger } from "@/app/actions/admin-settings";
import { UserPlus, Bike } from "lucide-react";

export function MessengerForm({ initialMessengers }: { initialMessengers: any[] }) {
  const [messengers, setMessengers] = useState(initialMessengers);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isAdding, setIsAdding] = useState(false);


  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setIsAdding(true);
    const res = await addMessenger({ name, phone });
    if (res.success && res.messenger) {
      setMessengers([...messengers, res.messenger]);
      setName(""); setPhone("");
      toast.success("Mensajero agregado");
    }
    setIsAdding(false);
  };

  const handleToggle = async (id: string, current: boolean) => {
    // Optimistic update
    setMessengers(prev => prev.map(m => m.id === id ? { ...m, isActive: !current } : m));
    await toggleMessenger(id, !current);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensajeros / Delivery</CardTitle>
        <CardDescription>Gestiona el personal para asignarles pedidos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAdd} className="space-y-4 border rounded-lg p-4 bg-slate-50">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Carlos Delivery" required />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Ej. 1122334455" required />
            </div>
          </div>
          <Button type="submit" disabled={isAdding} className="w-full bg-slate-900 border" variant="outline">
            <UserPlus className="h-4 w-4 mr-2" /> Agregar Nuevo
          </Button>
        </form>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase">Tus Mensajeros</h4>
          {messengers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">No hay mensajeros todavía.</p>
          ) : (
            <div className="divide-y border rounded-lg">
              {messengers.map((m) => (
                <div key={m.id} className="flex justify-between items-center p-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-full"><Bike className="h-4 w-4 text-slate-600" /></div>
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.phone}</p>
                    </div>
                  </div>
                  <Switch checked={m.isActive} onCheckedChange={() => handleToggle(m.id, m.isActive)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

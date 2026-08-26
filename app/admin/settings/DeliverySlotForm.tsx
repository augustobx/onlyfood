"use client";

import { useState } from "react";
import { Plus, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { addDeliverySlot, toggleDeliverySlot, deleteDeliverySlot } from "@/app/actions/admin-settings";
import { toast } from "sonner";

export function DeliverySlotForm({ initialSlots }: { initialSlots: any[] }) {
  const [slots, setSlots] = useState(initialSlots);
  const [newTime, setNewTime] = useState("");
  const [newCapacity, setNewCapacity] = useState("");

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime || !newCapacity) return;

    const res = await addDeliverySlot({ time: newTime, capacity: parseInt(newCapacity) });
    if (res.success && res.slot) {
      toast.success("Horario agregado");
      setSlots([...slots, res.slot].sort((a,b) => a.time.localeCompare(b.time)));
      setNewTime("");
      setNewCapacity("");
    } else {
      toast.error(res.error || "Ocurrió un error");
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    const newVal = !active;
    setSlots(slots.map(s => s.id === id ? { ...s, isActive: newVal } : s));
    const res = await toggleDeliverySlot(id, newVal);
    if (!res.success) {
      toast.error("Error al actualizar");
      setSlots(slots.map(s => s.id === id ? { ...s, isActive: active } : s));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este horario?")) return;
    const res = await deleteDeliverySlot(id);
    if (res.success) {
      toast.success("Eliminado");
      setSlots(slots.filter(s => s.id !== id));
    } else {
      toast.error("Ocurrió un error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-purple-600" /> Horarios de Entrega (Cupos)</CardTitle>
        <CardDescription>
          Configura los horarios disponibles y cuántos pedidos (cupos) puedes tomar en cada uno. Los cupos se reiniciarán automáticamente al <b>Abrir el Local</b>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAddSlot} className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label>Hora (ej: 21:00)</Label>
            <Input type="time" required value={newTime} onChange={e=>setNewTime(e.target.value)} />
          </div>
          <div className="w-24 space-y-2">
            <Label>Cupos</Label>
            <Input type="number" min="1" required value={newCapacity} onChange={e=>setNewCapacity(e.target.value)} />
          </div>
          <Button type="submit"><Plus className="w-4 h-4 mr-2" /> Agregar</Button>
        </form>

        <div className="space-y-3 mt-4">
          {slots.length === 0 && <p className="text-muted-foreground text-sm italic">No hay horarios registrados.</p>}
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
              <div className="flex flex-col">
                <span className="font-bold text-lg">{slot.time} hs</span>
                <span className="text-xs text-muted-foreground">Capacidad: {slot.capacity} cupos</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                   <Label className="text-xs text-muted-foreground">{slot.isActive ? 'Activo' : 'Pausado'}</Label>
                   <Switch checked={slot.isActive} onCheckedChange={() => handleToggle(slot.id, slot.isActive)} />
                </div>
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(slot.id)}>
                   <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

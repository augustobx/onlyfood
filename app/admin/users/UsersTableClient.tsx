"use client";

import { useState } from "react";
import { Receipt, Gift, UserCheck, Loader2, CheckCircle2, Star, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { adminAssignRewardToClient, adminAdjustClientPoints } from "@/app/actions/admin-rewards";

interface UsersTableClientProps {
  initialUsers: any[];
  rewards: any[];
}

export function UsersTableClient({ initialUsers, rewards }: UsersTableClientProps) {
  const [users, setUsers] = useState<any[]>(initialUsers);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [selectedRewardId, setSelectedRewardId] = useState<string>("");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Modal Ajuste Rápido de Puntos
  const [adjustClient, setAdjustClient] = useState<any | null>(null);
  const [adjustPointsValue, setAdjustPointsValue] = useState<number>(50);
  const [adjustMode, setAdjustMode] = useState<"ADD" | "SUB">("ADD");
  const [isAdjusting, setIsAdjusting] = useState(false);

  const openAssignModal = (user: any) => {
    setSelectedClient(user);
    setSelectedRewardId(rewards[0]?.id || "");
    setIsAssignModalOpen(true);
  };

  const handleAssignReward = async () => {
    if (!selectedClient || !selectedRewardId) return;
    const reward = rewards.find((r) => r.id === selectedRewardId);
    if (!reward) return;

    if (selectedClient.points < reward.pointsCost) {
      toast.error(`Puntos insuficientes: el cliente tiene ${selectedClient.points} pts y la recompensa cuesta ${reward.pointsCost} pts.`);
      return;
    }

    setIsAssigning(true);
    try {
      const res = await adminAssignRewardToClient(selectedClient.id, selectedRewardId);
      if (res.success) {
        toast.success(`¡Premio "${reward.name}" asignado a ${selectedClient.name || selectedClient.phone}!`, {
          description: `Se descontaron ${reward.pointsCost} puntos. Nuevo saldo: ${res.newPoints} pts.`,
        });
        setUsers((prev) => prev.map((u) => (u.id === selectedClient.id ? { ...u, points: res.newPoints } : u)));
        setIsAssignModalOpen(false);
      } else {
        toast.error("Error al asignar premio", { description: res.error });
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const openAdjustModal = (user: any) => {
    setAdjustClient(user);
    setAdjustPointsValue(50);
    setAdjustMode("ADD");
  };

  const handleSaveAdjust = async () => {
    if (!adjustClient) return;
    setIsAdjusting(true);
    const delta = adjustMode === "ADD" ? Math.abs(adjustPointsValue) : -Math.abs(adjustPointsValue);
    try {
      const res = await adminAdjustClientPoints(adjustClient.id, delta);
      if (res.success) {
        toast.success("Saldo de puntos actualizado", { description: `Nuevo saldo: ${res.points} pts.` });
        setUsers((prev) => prev.map((u) => (u.id === adjustClient.id ? { ...u, points: res.points } : u)));
        setAdjustClient(null);
      } else {
        toast.error("Error al ajustar puntos", { description: res.error });
      }
    } finally {
      setIsAdjusting(false);
    }
  };

  const currentReward = rewards.find((r) => r.id === selectedRewardId);

  return (
    <>
      <div className="border rounded-2xl bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b text-slate-500 uppercase text-[10px] font-black tracking-wider">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Insignia / Rango</th>
              <th className="px-6 py-4 text-center">Compras</th>
              <th className="px-6 py-4 text-right">Total Gastado</th>
              <th className="px-6 py-4 text-right">Saldo de Puntos</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-extrabold text-slate-900">{u.name || "Sin nombre"}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{u.phone}</div>
                </td>
                <td className="px-6 py-4">
                  {u.tier ? (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg text-white shadow-2xs"
                      style={{ backgroundColor: u.tier.color || "#a855f7" }}
                    >
                      👑 {u.tier.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">Cliente Base</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center font-black text-slate-800">
                  <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full text-xs font-bold text-slate-700">
                    <Receipt className="w-3.5 h-3.5 text-slate-500" /> {u.ordersCount ?? u._count?.orders ?? 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-black text-slate-900">
                  ${(u.totalSpent || 0).toLocaleString("es-AR")}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                    🪙 {u.points} pts
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAssignModal(u)}
                      className="rounded-xl text-[11px] font-black border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100 h-7 px-2.5"
                    >
                      <Gift className="w-3 h-3 mr-1 text-purple-600" /> Premiar
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openAdjustModal(u)}
                      className="rounded-xl text-[11px] font-bold text-slate-600 hover:bg-slate-100 h-7 px-2.5"
                    >
                      <Star className="w-3 h-3 mr-1 text-yellow-500" /> Puntos
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  Todavía no hay clientes registrados en el sistema.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL ASIGNAR PREMIO A CLIENTE ESPECÍFICO */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              Asignar Premio a Cliente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Otorgá un premio del catálogo descontando los puntos acumulados del cliente.
            </DialogDescription>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Cliente:</span>
                  <span>{selectedClient.name || selectedClient.phone}</span>
                </div>
                <div className="flex justify-between font-black text-amber-700 text-sm pt-1 border-t border-slate-200">
                  <span>Saldo disponible:</span>
                  <span>🪙 {selectedClient.points} Pts</span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Seleccionar Recompensa a Asignar</Label>
                <Select value={selectedRewardId} onValueChange={(val) => setSelectedRewardId(val ?? "")}>
                  <SelectTrigger className="h-11 rounded-xl font-bold mt-1">
                    <SelectValue placeholder="Elegir premio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rewards.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} — Cuesta 🪙 {r.pointsCost} pts
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentReward && (
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-xs space-y-1.5">
                  <div className="flex justify-between font-bold text-purple-900">
                    <span>Costo del premio:</span>
                    <span>- {currentReward.pointsCost} pts</span>
                  </div>
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-purple-200">
                    <span>Saldo restante:</span>
                    <span className={selectedClient.points >= currentReward.pointsCost ? "text-emerald-700" : "text-red-600"}>
                      {selectedClient.points - currentReward.pointsCost} pts
                    </span>
                  </div>
                  {selectedClient.points < currentReward.pointsCost && (
                    <p className="text-[11px] font-bold text-red-600 pt-1">
                      ⚠️ El cliente no cuenta con los {currentReward.pointsCost} puntos requeridos.
                    </p>
                  )}
                </div>
              )}

              <DialogFooter className="pt-3 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-xl font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={isAssigning || !currentReward || selectedClient.points < currentReward.pointsCost}
                  onClick={handleAssignReward}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl"
                >
                  {isAssigning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                  Canjear y Descontar Puntos
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL AJUSTAR PUNTOS MANUALMENTE */}
      <Dialog open={Boolean(adjustClient)} onOpenChange={(open) => !open && setAdjustClient(null)}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Ajustar Puntos Manuales
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sumá o restá puntos a {adjustClient?.name || adjustClient?.phone}.
            </DialogDescription>
          </DialogHeader>

          {adjustClient && (
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustMode("ADD")}
                  className={`flex-1 py-2 rounded-xl font-black text-xs border flex items-center justify-center gap-1 ${
                    adjustMode === "ADD"
                      ? "bg-green-50 border-green-500 text-green-800 ring-2 ring-green-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <Plus className="w-4 h-4 text-green-600" /> Sumar Puntos
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustMode("SUB")}
                  className={`flex-1 py-2 rounded-xl font-black text-xs border flex items-center justify-center gap-1 ${
                    adjustMode === "SUB"
                      ? "bg-red-50 border-red-500 text-red-800 ring-2 ring-red-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <Minus className="w-4 h-4 text-red-600" /> Restar Puntos
                </button>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Cantidad de puntos a {adjustMode === "ADD" ? "sumar" : "restar"}</Label>
                <Input
                  type="number"
                  min={1}
                  max={50000}
                  value={adjustPointsValue}
                  onChange={(e) => setAdjustPointsValue(Math.max(1, Number(e.target.value)))}
                  className="h-11 rounded-xl font-black text-base text-amber-800 mt-1"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between font-black">
                <span>Saldo resultante:</span>
                <span className="text-amber-800">
                  🪙 {Math.max(0, adjustClient.points + (adjustMode === "ADD" ? adjustPointsValue : -adjustPointsValue))} pts
                </span>
              </div>

              <DialogFooter className="pt-3 gap-2">
                <Button variant="outline" onClick={() => setAdjustClient(null)} className="rounded-xl font-bold">
                  Cancelar
                </Button>
                <Button
                  disabled={isAdjusting || adjustPointsValue < 1}
                  onClick={handleSaveAdjust}
                  className="bg-slate-900 text-white font-black rounded-xl"
                >
                  {isAdjusting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : "Guardar Saldo"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

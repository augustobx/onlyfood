"use client";

import { useState, useMemo } from "react";
import {
  Receipt,
  Gift,
  Loader2,
  CheckCircle2,
  Star,
  Plus,
  Minus,
  KeyRound,
  Search,
  SlidersHorizontal,
  X,
  Users,
  Merge,
  GitMerge,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Phone,
  ArrowUpDown,
  Pencil,
  MailCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { adminAssignRewardToClient, adminAdjustClientPoints } from "@/app/actions/admin-rewards";
import { resetUserPassword, unlockClientLoginAttempts, detectDuplicateClients, mergeClients, type DuplicateClientGroup } from "@/app/actions/admin-users";
import { sendAdminClientEmailVerification } from "@/app/actions/client-security";
import { ClientAccountEditor } from "@/components/admin/ClientAccountEditor";


interface UsersTableClientProps {
  initialUsers: any[];
  rewards: any[];
  tiers?: any[];
}

export function UsersTableClient({ initialUsers, rewards, tiers = [] }: UsersTableClientProps) {
  const [users, setUsers] = useState<any[]>(initialUsers);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [selectedRewardId, setSelectedRewardId] = useState<string>("");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [editClient, setEditClient] = useState<any | null>(null);

  const [verifyingClientId, setVerifyingClientId] = useState<string | null>(null);

  // Filtros y Buscador
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [pointsFilter, setPointsFilter] = useState("ALL");
  const [passwordFilter, setPasswordFilter] = useState("ALL");
  const [ordersFilter, setOrdersFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"POINTS_DESC" | "POINTS_ASC" | "ORDERS_DESC" | "SPENT_DESC" | "NEWEST">("POINTS_DESC");

  // Detección y Fusión de Duplicados
  const [isDetecting, setIsDetecting] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateClientGroup[] | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [mergingClusterKey, setMergingClusterKey] = useState<string | null>(null);

  // Fusión Manual Individual
  const [manualMergeSource, setManualMergeSource] = useState<any | null>(null);
  const [manualMergeTargetId, setManualMergeTargetId] = useState<string>("");
  const [isManualMergeModalOpen, setIsManualMergeModalOpen] = useState(false);
  const [isManualMerging, setIsManualMerging] = useState(false);

  // Modal Ajuste Rápido de Puntos
  const [adjustClient, setAdjustClient] = useState<any | null>(null);
  const [adjustPointsValue, setAdjustPointsValue] = useState<number>(50);
  const [adjustMode, setAdjustMode] = useState<"ADD" | "SUB">("ADD");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Filtrado y Ordenamiento Reactivo
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        // Búsqueda por nombre o teléfono
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = (u.name || "").toLowerCase().includes(q);
          const matchesPhone = (u.phone || "").toLowerCase().includes(q);
          const matchesEmail = (u.email || "").toLowerCase().includes(q);
          if (!matchesName && !matchesPhone && !matchesEmail) return false;
        }

        // Filtro por Insignia / Rango
        if (tierFilter !== "ALL") {
          if (tierFilter === "NONE") {
            if (u.tier) return false;
          } else {
            if (u.tier?.id !== tierFilter) return false;
          }
        }

        // Filtro por Saldo de Puntos
        if (pointsFilter === "WITH_POINTS" && u.points <= 0) return false;
        if (pointsFilter === "ZERO_POINTS" && u.points > 0) return false;

        // Filtro por Estado de Clave
        if (passwordFilter === "ACTIVE" && (u.passwordSetupRequired || u.forcePasswordChange)) return false;
        if (passwordFilter === "PENDING" && !u.passwordSetupRequired && !u.forcePasswordChange) return false;

        // Filtro por Compras
        const ordersCount = u.ordersCount ?? u._count?.orders ?? 0;
        if (ordersFilter === "WITH_ORDERS" && ordersCount === 0) return false;
        if (ordersFilter === "NO_ORDERS" && ordersCount > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "POINTS_DESC") return b.points - a.points;
        if (sortBy === "POINTS_ASC") return a.points - b.points;
        if (sortBy === "ORDERS_DESC") {
          const countA = a.ordersCount ?? a._count?.orders ?? 0;
          const countB = b.ordersCount ?? b._count?.orders ?? 0;
          return countB - countA;
        }
        if (sortBy === "SPENT_DESC") return (b.totalSpent || 0) - (a.totalSpent || 0);
        if (sortBy === "NEWEST") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return 0;
      });
  }, [users, searchQuery, tierFilter, pointsFilter, passwordFilter, ordersFilter, sortBy]);

  const hasActiveFilters =
    searchQuery !== "" ||
    tierFilter !== "ALL" ||
    pointsFilter !== "ALL" ||
    passwordFilter !== "ALL" ||
    ordersFilter !== "ALL" ||
    sortBy !== "POINTS_DESC";

  const handleClearFilters = () => {
    setSearchQuery("");
    setTierFilter("ALL");
    setPointsFilter("ALL");
    setPasswordFilter("ALL");
    setOrdersFilter("ALL");
    setSortBy("POINTS_DESC");
  };

  const handleSendClientVerification = async (client: any) => {
    setVerifyingClientId(client.id);
    try {
      const result = await sendAdminClientEmailVerification(client.id);
      if (result.success) toast.success(result.message || "Enlace enviado.");
      else toast.error(result.error || "No se pudo enviar.");
    } catch { toast.error("No se pudo enviar el mensaje."); }
    finally { setVerifyingClientId(null); }
  };

  const handleResetPassword = async (user: any) => {
    if (
      !confirm(
        `¿Enviar enlace para recuperar la contraseña a ${user.name || user.phone}? Requiere un correo previamente verificado.`
      )
    ) {
      return;
    }
    setResettingId(user.id);
    try {
      const res = await resetUserPassword(user.id);
      if (res.success) {
        toast.success(`Acceso restablecido para ${user.name || user.phone}`, {
          description: res.message || "El cliente deberá usar el enlace recibido por email.",
        });
        // No se cambia ni invalida la contraseña mientras no se use el enlace.
      } else {
        toast.error(res.error);
      }
    } finally {
      setResettingId(null);
    }
  };

  const handleUnlockLogin = async (user: any) => {
    if (!confirm(`¿Restablecer el contador de intentos de ingreso de ${user.name || user.phone}? Esto NO cambia la contraseña.`)) return;
    setUnlockingId(user.id);
    try {
      const res = await unlockClientLoginAttempts(user.id);
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    } catch {
      toast.error("No se pudieron restablecer los intentos.");
    } finally { setUnlockingId(null); }
  };

  const handleDetectDuplicates = async () => {
    setIsDetecting(true);
    try {
      const res = await detectDuplicateClients();
      if (res.success && res.groups) {
        setDuplicateGroups(res.groups);
        setIsDuplicateModalOpen(true);
        if (res.groups.length === 0) {
          toast.info("No se encontraron clientes duplicados", {
            description: "Todos los números de teléfono registrados son únicos o canónicos.",
          });
        }
      } else {
        toast.error(res.error || "Error al buscar duplicados");
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleMergeGroup = async (primaryId: string, secondaryId: string, clusterKey: string) => {
    setMergingClusterKey(clusterKey);
    try {
      const res = await mergeClients(primaryId, secondaryId);
      if (res.success) {
        toast.success("Clientes unificados con éxito", {
          description: `Se consolidaron los puntos (+${res.transferredPoints} pts) y todos los pedidos en la cuenta elegida.`,
        });

        // Actualizar la tabla local
        setUsers((prev) => {
          const sec = prev.find((u) => u.id === secondaryId);
          const transPoints = sec?.points || 0;
          const transOrders = sec?.ordersCount || 0;
          const transSpent = sec?.totalSpent || 0;

          return prev
            .filter((u) => u.id !== secondaryId)
            .map((u) =>
              u.id === primaryId
                ? {
                    ...u,
                    points: u.points + transPoints,
                    ordersCount: (u.ordersCount || 0) + transOrders,
                    totalSpent: (u.totalSpent || 0) + transSpent,
                    name: u.name || sec?.name || null,
                  }
                : u
            );
        });

        // Actualizar el grupo en el modal de duplicados
        setDuplicateGroups((prev) => {
          if (!prev) return null;
          return prev
            .map((g) => ({
              ...g,
              clients: g.clients.filter((c) => c.id !== secondaryId),
            }))
            .filter((g) => g.clients.length > 1);
        });
      } else {
        toast.error(res.error || "No se pudo unificar las cuentas");
      }
    } finally {
      setMergingClusterKey(null);
    }
  };

  const openManualMergeModal = (user: any) => {
    setManualMergeSource(user);
    // Sugerir como target el primer cliente distinto
    const firstOther = users.find((u) => u.id !== user.id);
    setManualMergeTargetId(firstOther ? firstOther.id : "");
    setIsManualMergeModalOpen(true);
  };

  const handleSaveManualMerge = async () => {
    if (!manualMergeSource || !manualMergeTargetId) return;
    const targetUser = users.find((u) => u.id === manualMergeTargetId);
    if (!targetUser) return;

    if (
      !confirm(
        `¿Confirmás unir la cuenta de ${manualMergeSource.name || manualMergeSource.phone} DENTRO de la cuenta de ${
          targetUser.name || targetUser.phone
        }?\n\nLos puntos (+${manualMergeSource.points} pts) y pedidos se transferirán a ${
          targetUser.name || targetUser.phone
        } y el registro secundario será eliminado.`
      )
    ) {
      return;
    }

    setIsManualMerging(true);
    try {
      const res = await mergeClients(manualMergeTargetId, manualMergeSource.id);
      if (res.success) {
        toast.success("Cuentas unificadas correctamente", {
          description: `Se transfirieron ${res.transferredPoints} puntos a ${targetUser.name || targetUser.phone}.`,
        });
        setUsers((prev) => {
          const transPoints = manualMergeSource.points || 0;
          const transOrders = manualMergeSource.ordersCount || 0;
          const transSpent = manualMergeSource.totalSpent || 0;

          return prev
            .filter((u) => u.id !== manualMergeSource.id)
            .map((u) =>
              u.id === manualMergeTargetId
                ? {
                    ...u,
                    points: u.points + transPoints,
                    ordersCount: (u.ordersCount || 0) + transOrders,
                    totalSpent: (u.totalSpent || 0) + transSpent,
                    name: u.name || manualMergeSource.name || null,
                  }
                : u
            );
        });
        setIsManualMergeModalOpen(false);
        setManualMergeSource(null);
      } else {
        toast.error(res.error || "Error al unir cuentas");
      }
    } finally {
      setIsManualMerging(false);
    }
  };

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


  // Las acciones se reutilizan en tabla ancha y tarjetas responsive, sin
  // duplicar handlers de recuperar, editar, puntos, premia, unir o desbloquear.
  const renderActions = (u: any) => (
                  <div className="client-action-group grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Button size="sm" variant="outline" onClick={() => setEditClient(u)}
                      className="rounded-xl text-[11px] font-bold h-7 px-2 border-orange-300 text-orange-800"
                      title="Editar datos de la cuenta"><Pencil className="w-3 h-3 mr-1" /> Editar</Button>
                    {u.email && !u.emailVerifiedAt && <Button
                      size="sm" variant="ghost" disabled={verifyingClientId === u.id}
                      onClick={() => handleSendClientVerification(u)}
                      className="rounded-xl text-[11px] font-bold h-7 px-2 text-emerald-700"
                      title="Enviar enlace de confirmación al correo del cliente">
                      {verifyingClientId === u.id ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <MailCheck className="w-3 h-3 mr-1" />}
                      Verificar correo
                    </Button>}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAssignModal(u)}
                      className="rounded-xl text-[11px] font-black border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100 h-7 px-2"
                      title="Otorgar recompensa del catálogo descontando puntos"
                    >
                      <Gift className="w-3 h-3 mr-1 text-purple-600" /> Premiar
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openAdjustModal(u)}
                      className="rounded-xl text-[11px] font-bold text-slate-600 hover:bg-slate-100 h-7 px-2"
                      title="Sumar o restar puntos manualmente"
                    >
                      <Star className="w-3 h-3 mr-1 text-yellow-500" /> Puntos
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={resettingId === u.id || !u.emailVerifiedAt}
                      onClick={() => handleResetPassword(u)}
                      className="rounded-xl text-[11px] font-bold text-amber-700 hover:bg-amber-50 hover:text-amber-800 h-7 px-2"
                      title="Enviar recuperación segura al correo verificado del cliente"
                    >
                      {resettingId === u.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <KeyRound className="w-3 h-3 mr-1 text-amber-600" />
                      )}
                      Recuperar
                    </Button>

                    <Button size="sm" variant="outline"
                      disabled={unlockingId === u.id}
                      onClick={() => void handleUnlockLogin(u)}
                      className="rounded-xl text-[11px] font-bold h-7 px-2 border-emerald-300 text-emerald-800"
                      title="Desbloquear intentos de ingreso de esta cuenta sin cambiar contraseña">
                      <ShieldCheck className="w-3 h-3 mr-1" /> {unlockingId === u.id ? "Desbloqueando..." : "Desbloquear"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openManualMergeModal(u)}
                      className="rounded-xl text-[11px] font-bold text-blue-700 hover:bg-blue-50 hover:text-blue-800 h-7 px-2"
                      title="Unir este usuario con otra cuenta duplicada manualmente"
                    >
                      <GitMerge className="w-3 h-3 mr-1 text-blue-600" /> Unir
                    </Button>
                  </div>
  );

  return (
    <div className="client-account-list space-y-4">
      {/* ═══ BARRA DE HERRAMIENTAS: BÚSQUEDA, FILTROS Y ACCIÓN DE DUPLICADOS ═══ */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Buscador en Vivo */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, teléfono o correo..."
              className="pl-10 h-10 rounded-xl text-xs font-medium border-slate-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botón Detectar y Unir Duplicados */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={isDetecting}
              onClick={handleDetectDuplicates}
              className="h-10 px-4 rounded-xl font-black text-xs bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-105 text-white shadow-sm flex items-center gap-1.5"
            >
              {isDetecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <GitMerge className="w-3.5 h-3.5" />
              )}
              Detectar y Unir Duplicados
            </Button>
          </div>
        </div>

        {/* Fila de Filtros y Ordenamiento */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Filtro por Rango VIP */}
          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Insignia / Rango</Label>
            <Select value={tierFilter} onValueChange={(v) => setTierFilter(v ?? "ALL")}>
              <SelectTrigger className="h-9 rounded-xl text-xs font-bold border-slate-200">
                <SelectValue placeholder="Todos los rangos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los rangos</SelectItem>
                {tiers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
                <SelectItem value="NONE">Cliente Base (Sin rango)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Saldo de Puntos */}
          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Saldo de Puntos</Label>
            <Select value={pointsFilter} onValueChange={(v) => setPointsFilter(v ?? "ALL")}>
              <SelectTrigger className="h-9 rounded-xl text-xs font-bold border-slate-200">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los saldos</SelectItem>
                <SelectItem value="WITH_POINTS">Con puntos (&gt; 0)</SelectItem>
                <SelectItem value="ZERO_POINTS">Sin puntos (0 pts)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Estado de Clave */}
          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Estado de Clave</Label>
            <Select value={passwordFilter} onValueChange={(v) => setPasswordFilter(v ?? "ALL")}>
              <SelectTrigger className="h-9 rounded-xl text-xs font-bold border-slate-200">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las cuentas</SelectItem>
                <SelectItem value="ACTIVE">Contraseña activa</SelectItem>
                <SelectItem value="PENDING">Pendiente de setup</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Pedidos */}
          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Historial de Compras</Label>
            <Select value={ordersFilter} onValueChange={(v) => setOrdersFilter(v ?? "ALL")}>
              <SelectTrigger className="h-9 rounded-xl text-xs font-bold border-slate-200">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las compras</SelectItem>
                <SelectItem value="WITH_ORDERS">Con pedidos realizados</SelectItem>
                <SelectItem value="NO_ORDERS">Sin pedidos aún</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ordenar por */}
          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Ordenar por</Label>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v ?? "POINTS_DESC")}>
              <SelectTrigger className="h-9 rounded-xl text-xs font-bold border-slate-200">
                <SelectValue placeholder="Ordenar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POINTS_DESC">Mayor saldo de puntos</SelectItem>
                <SelectItem value="POINTS_ASC">Menor saldo de puntos</SelectItem>
                <SelectItem value="ORDERS_DESC">Mayor cantidad de pedidos</SelectItem>
                <SelectItem value="SPENT_DESC">Mayor gasto total ($)</SelectItem>
                <SelectItem value="NEWEST">Más recientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Barra de Resumen de Filtros */}
        <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
          <span className="font-bold">
            Mostrando <strong className="text-slate-900">{filteredUsers.length}</strong> de{" "}
            <strong className="text-slate-900">{users.length}</strong> clientes
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-black text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Limpiar filtros
            </button>
          )}
        </div>
      </div>


      <section className="client-card-grid grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Clientes en tarjetas">
        {filteredUsers.map(u => (
          <article key={u.id} className="min-w-0 space-y-3 rounded-2xl border border-[#49304a] bg-[#1c1723] p-4 text-slate-100 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-base font-black text-white">{u.name || "Sin nombre"}</h3>
                <p className="mt-1 break-all text-xs text-slate-300">{u.phone}</p>
                <p className="mt-1 break-all text-xs text-slate-400">{u.email || "Sin correo"}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${u.passwordSetupRequired || u.forcePasswordChange
                ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                : "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"}`}>
                {u.forcePasswordChange ? "Cambio de clave" : u.passwordSetupRequired ? "Setup pendiente" : "✓ Activa"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {u.tier ? (
                <span className="max-w-full break-words rounded-lg px-3 py-1.5 text-xs font-black text-white"
                  style={{ backgroundColor: u.tier.color || "#7c3aed" }}>👑 {u.tier.name}</span>
              ) : <span className="text-xs text-slate-400">Cliente Base</span>}
              {u.email && (
                <span className={`text-xs ${u.emailVerifiedAt ? "text-emerald-300" : "text-amber-300"}`}>
                  {u.emailVerifiedAt ? "Correo verificado" : "Correo pendiente"}
                </span>
              )}
            </div>
            <dl className="grid grid-cols-3 gap-2 rounded-xl border border-[#3b3043] bg-[#151119] p-3">
              <div className="min-w-0"><dt className="text-[10px] text-slate-400">Compras</dt>
                <dd className="mt-1 text-sm font-extrabold text-white">{u.ordersCount ?? u._count?.orders ?? 0}</dd></div>
              <div className="min-w-0"><dt className="text-[10px] text-slate-400">Gastado</dt>
                <dd className="mt-1 break-words text-sm font-extrabold text-white">${(u.totalSpent || 0).toLocaleString("es-AR")}</dd></div>
              <div className="min-w-0"><dt className="text-[10px] text-slate-400">Puntos</dt>
                <dd className="mt-1 text-sm font-extrabold text-amber-300">{u.points ?? 0}</dd></div>
            </dl>
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-orange-300">Acciones</h4>
              {renderActions(u)}
            </div>
          </article>
        ))}
        {filteredUsers.length === 0 && (
          <div className="rounded-xl border border-[#49304a] p-6 text-sm text-slate-300">
            No se encontraron clientes con esos filtros.
          </div>
        )}
      </section>

      {/* ═══ TABLA DE CLIENTES ═══ */}
      <div className="client-desktop-table overflow-x-auto rounded-2xl border border-[#392b42] bg-[#19171f] shadow-xl">
        <table className="w-full min-w-[1190px] table-fixed text-sm text-left">
          <thead className="border-b border-[#453044] bg-[#231a2b] text-orange-300 uppercase text-[11px] font-black tracking-wider">
            <tr>
              <th scope="col" className="w-[225px] px-4 py-4">Usuario</th>
              <th scope="col" className="w-[185px] px-4 py-4">Insignia / Rango</th>
              <th scope="col" className="w-[80px] px-3 py-4 text-center">Compras</th>
              <th scope="col" className="w-[140px] px-3 py-4 text-right">Total Gastado</th>
              <th scope="col" className="w-[135px] px-3 py-4 text-right">Saldo de Puntos</th>
              <th scope="col" className="w-[425px] px-4 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#33283a] text-xs">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-[#281e30]">
                <td className="px-4 py-4 align-middle">
                  <div className="flex items-center gap-2">
                    <div className="font-extrabold text-slate-900">{u.name || "Sin nombre"}</div>
                    {u.passwordSetupRequired || u.forcePasswordChange ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {u.forcePasswordChange ? "Cambio de clave obligatorio" : "Setup Pendiente"}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                        ✓ Activa
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.phone}</div>
                   <div className="text-[11px] mt-1">
                     {u.email
                       ? <span className="font-medium text-slate-700">{u.email}</span>
                       : <span className="italic font-semibold text-amber-700">Sin correo</span>}
                     {u.email && <span className={u.emailVerifiedAt
                       ? "ml-2 text-emerald-700 font-semibold"
                       : "ml-2 text-amber-700 font-semibold"}>
                       {u.emailVerifiedAt ? "✓ Verificado" : "Pendiente de verificación"}
                     </span>}
                   </div>
                </td>
                <td className="px-4 py-4 align-middle">
                  {u.tier ? (
                    <span
                      className="inline-flex max-w-full items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-black uppercase leading-tight text-white shadow-sm"
                      style={{ backgroundColor: u.tier.color || "#a855f7" }}
                    >
                      👑 <span className="min-w-0 break-words">{u.tier.name}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">Cliente Base</span>
                  )}
                </td>
                <td className="px-3 py-4 align-middle text-center font-black text-slate-800">
                  <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full text-xs font-bold text-slate-700">
                    <Receipt className="w-3.5 h-3.5 text-slate-500" /> {u.ordersCount ?? u._count?.orders ?? 0}
                  </span>
                </td>
                <td className="px-3 py-4 align-middle text-right font-black text-slate-900">
                  ${(u.totalSpent || 0).toLocaleString("es-AR")}
                </td>
                <td className="px-3 py-4 align-middle text-right">
                  <span className="font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                    🪙 {u.points} pts
                  </span>
                </td>
                <td className="px-3 py-4 align-middle text-center">
                  {renderActions(u)}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  {users.length === 0
                    ? "Todavía no hay clientes registrados en el sistema."
                    : "No se encontraron clientes que coincidan con los filtros aplicados."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


      <ClientAccountEditor
        client={editClient}
        onClose={() => setEditClient(null)}
        onSaved={saved => {
          setUsers(previous => previous.map(user => user.id === saved.id ? { ...user, ...saved } : user));
          setEditClient(null);
        }}
      />
      {/* ═══ MODAL DETECCIÓN Y UNIFICACIÓN DE DUPLICADOS ═══ */}
      <Dialog open={isDuplicateModalOpen} onOpenChange={setIsDuplicateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-orange-600" />
              Clientes Duplicados Detectados
            </DialogTitle>
            <DialogDescription className="text-xs">
              Se detectaron clientes con números de teléfono equivalentes (diferencias de prefijos +54, 9, 0, o espacios). Podés
              consolidar sus puntos y pedidos en 1 clic.
            </DialogDescription>
          </DialogHeader>

          {duplicateGroups && duplicateGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-black text-sm text-slate-800">¡Base de clientes limpia y unificada!</p>
              <p className="text-xs text-slate-400">No se encontraron números duplicados con prefijos similares.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {duplicateGroups?.map((group, gIdx) => {
                const primary = group.clients.find((c) => c.id === group.suggestedPrimaryId) || group.clients[0];
                const secondaries = group.clients.filter((c) => c.id !== primary.id);

                return (
                  <div
                    key={gIdx}
                    className="p-4 rounded-2xl border border-orange-200 bg-orange-50/40 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-orange-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-orange-950 uppercase tracking-wider">
                          Grupo Duplicado #{gIdx + 1}
                        </span>
                        <Badge className="bg-orange-200 text-orange-800 font-bold text-[10px]">
                          {group.clients.length} cuentas vinculadas
                        </Badge>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{group.canonicalPhone}</span>
                    </div>

                    {/* Comparación de Cuentas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Cuenta Principal Recomendada */}
                      <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-xs relative">
                        <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white shadow-2xs">
                          Cuenta a Preservar
                        </span>
                        <div className="font-black text-slate-900 text-sm">{primary.name || "Sin nombre"}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{primary.phone}</div>
                        <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1 text-[11px]">
                          <div>
                            <span className="text-slate-400 block">Puntos:</span>
                            <strong className="text-amber-700">🪙 {primary.points} pts</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Pedidos:</span>
                            <strong className="text-slate-800">{primary.ordersCount} compras</strong>
                          </div>
                        </div>
                        <div className="mt-1 text-[10px]">
                          {primary.passwordSetupRequired ? (
                            <span className="text-amber-700 font-semibold">⚠️ Requiere definir clave</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">✓ Contraseña activa</span>
                          )}
                        </div>
                      </div>

                      {/* Cuentas Secundarias a Fusionar */}
                      {secondaries.map((sec) => {
                        const clusterKey = `${primary.id}-${sec.id}`;
                        const isMergingThis = mergingClusterKey === clusterKey;

                        return (
                          <div
                            key={sec.id}
                            className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs relative flex flex-col justify-between"
                          >
                            <div>
                              <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 block w-fit mb-1">
                                Cuenta Duplicada
                              </span>
                              <div className="font-extrabold text-slate-900 text-sm">{sec.name || "Sin nombre"}</div>
                              <div className="text-slate-500 font-mono text-[11px]">{sec.phone}</div>
                              <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1 text-[11px]">
                                <div>
                                  <span className="text-slate-400 block">Puntos:</span>
                                  <strong className="text-amber-700">🪙 {sec.points} pts</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Pedidos:</span>
                                  <strong className="text-slate-800">{sec.ordersCount} compras</strong>
                                </div>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              disabled={Boolean(mergingClusterKey)}
                              onClick={() => handleMergeGroup(primary.id, sec.id, clusterKey)}
                              className="mt-3 w-full h-8 rounded-xl font-black text-[11px] bg-orange-600 hover:bg-orange-700 text-white shadow-xs"
                            >
                              {isMergingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Merge className="w-3 h-3 mr-1" /> Unir en la cuenta principal
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsDuplicateModalOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ MODAL UNIFICACIÓN MANUAL INDIVIDUAL ═══ */}
      <Dialog open={isManualMergeModalOpen} onOpenChange={setIsManualMergeModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-blue-600" />
              Unir Cuenta Manualmente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Consolidá los puntos y pedidos de esta cuenta dentro de otra cuenta destino.
            </DialogDescription>
          </DialogHeader>

          {manualMergeSource && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-1 text-red-950">
                <span className="text-[10px] font-black uppercase text-red-600 block">Cuenta a absorber (será eliminada):</span>
                <div className="font-black text-sm">{manualMergeSource.name || "Sin nombre"}</div>
                <div className="font-mono text-[11px] text-red-700">{manualMergeSource.phone}</div>
                <div className="font-bold text-red-800 text-[11px] pt-1 border-t border-red-200 flex justify-between">
                  <span>Puntos a transferir:</span>
                  <span>🪙 {manualMergeSource.points} pts</span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Seleccionar Cuenta Principal Destino</Label>
                <Select value={manualMergeTargetId} onValueChange={(val) => setManualMergeTargetId(val ?? "")}>
                  <SelectTrigger className="h-11 rounded-xl font-bold mt-1 text-xs">
                    <SelectValue placeholder="Elegir cliente destino..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {users
                      .filter((u) => u.id !== manualMergeSource.id)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.name || "Sin nombre"} ({u.phone}) — 🪙 {u.points} pts
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 space-y-1">
                <span className="font-black text-xs block">Resultado de la unificación:</span>
                <p className="text-[11px] leading-relaxed text-blue-800">
                  Todos los pedidos, cupones y puntos acumulados se sumarán al cliente destino. La cuenta origen dejará de existir
                  y el cliente podrá iniciar sesión en su cuenta unificada.
                </p>
              </div>

              <DialogFooter className="pt-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsManualMergeModalOpen(false)}
                  className="rounded-xl font-bold text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={isManualMerging || !manualMergeTargetId}
                  onClick={handleSaveManualMerge}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs"
                >
                  {isManualMerging ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  Confirmar y Unir
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ MODAL ASIGNAR PREMIO A CLIENTE ESPECÍFICO ═══ */}
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

      {/* ═══ MODAL AJUSTAR PUNTOS MANUALMENTE ═══ */}
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
    </div>
  );
}

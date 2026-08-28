"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Laptop, Link2, Loader2, RefreshCw, ShieldCheck, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createPrintAgentPairingCode, listPrintAgentDevices, revokePrintAgentDevice } from "@/app/actions/admin-print-agent";

type Device = { id: string; name: string; platform: string; version: string; printers: unknown; lastSeenAt: string | null; createdAt: string };

export function PrintAgentManager() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [pendingJobs, setPendingJobs] = useState(0);
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string; serverUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await listPrintAgentDevices();
      setDevices(result.devices as Device[]);
      setPendingJobs(result.pendingJobs);
    } catch { toast.error("No se pudo consultar NanoLabs Print Agent.") }
    finally { setLoading(false) }
  }, []);

  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 15_000); return () => window.clearInterval(timer) }, [refresh]);

  const generate = async () => {
    setGenerating(true);
    try { setPairing(await createPrintAgentPairingCode()); }
    catch { toast.error("No se pudo generar el código.") }
    finally { setGenerating(false) }
  };
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); toast.success("Copiado.") };
  const revoke = async (id: string) => {
    const result = await revokePrintAgentDevice(id);
    if (!result.success) return toast.error(result.error);
    toast.success("Dispositivo desvinculado."); void refresh();
  };

  return (
    <div className="space-y-5 rounded-2xl border-2 border-cyan-200 bg-cyan-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex items-center gap-2 font-black text-slate-900"><ShieldCheck className="size-5 text-cyan-700" /> NanoLabs Print Agent</div><p className="mt-1 max-w-2xl text-sm text-slate-600">Instalá el agente en la computadora de caja, vinculalo una vez y asigná allí las impresoras. La conexión es saliente y no abre puertos en el comercio.</p></div>
        <Button type="button" onClick={generate} disabled={generating}>{generating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Link2 className="mr-2 size-4" />} Vincular equipo</Button>
      </div>

      {pairing && (
        <div className="grid gap-3 rounded-2xl border border-cyan-300 bg-white p-4 md:grid-cols-[1fr_auto]">
          <div><p className="text-xs font-black uppercase tracking-wider text-cyan-800">Código válido por 10 minutos</p><button type="button" onClick={() => copy(pairing.code)} className="mt-1 flex items-center gap-3 font-mono text-3xl font-black tracking-[.16em] text-slate-950">{pairing.code}<Copy className="size-4" /></button><p className="mt-2 text-xs text-slate-500">Servidor: {pairing.serverUrl}</p></div>
          <Button type="button" variant="outline" onClick={() => copy(`${pairing.serverUrl}\n${pairing.code}`)}>Copiar datos</Button>
        </div>
      )}

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between"><div><p className="font-black text-slate-900">Equipos vinculados</p><p className="text-xs text-slate-500">{pendingJobs} trabajo(s) esperando o en proceso</p></div><Button type="button" size="sm" variant="ghost" onClick={() => void refresh()}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button></div>
        {devices.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-500">Todavía no hay agentes vinculados.</p> : <div className="space-y-2">{devices.map((device) => {
          const online = Boolean(device.lastSeenAt && Date.now() - new Date(device.lastSeenAt).getTime() < 45_000);
          return <div key={device.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div className="flex min-w-0 items-center gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${online ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><Laptop className="size-5" /></span><div className="min-w-0"><p className="truncate font-bold text-slate-900">{device.name}</p><p className="flex items-center gap-1 text-xs text-slate-500">{online ? <Wifi className="size-3 text-emerald-600" /> : <WifiOff className="size-3" />}{online ? "En línea" : "Desconectado"} · {device.platform} · v{device.version}</p></div></div><Button type="button" size="icon" variant="ghost" className="text-red-600" onClick={() => void revoke(device.id)} aria-label={`Desvincular ${device.name}`}><Trash2 className="size-4" /></Button></div>;
        })}</div>}
      </div>
    </div>
  );
}

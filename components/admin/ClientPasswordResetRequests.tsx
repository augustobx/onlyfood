"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  approveClientPasswordResetRequest,
  rejectClientPasswordResetRequest,
} from "@/app/actions/client-admin-reset";

type ResetRequest = {
  id: string;
  claimedName: string;
  createdAt: string;
  client: { id: string; name: string | null; phone: string; email: string | null };
};

export function ClientPasswordResetRequests({ initialRequests }: { initialRequests: ResetRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [identityChecked, setIdentityChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [lastApproved, setLastApproved] = useState<string | null>(null);
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => { setRequests(initialRequests); }, [initialRequests]);

  async function process(id: string, action: "APPROVE" | "REJECT") {
    // Abrir la pestaña en el gesto original evita bloqueadores de popups.
    const whatsappTab = action === "APPROVE" ? window.open("about:blank", "_blank") : null;
    setBusy(id);
    try {
      const result = action === "APPROVE"
        ? await approveClientPasswordResetRequest(id, Boolean(identityChecked[id]))
        : await rejectClientPasswordResetRequest(id);
      if (!result.success) { whatsappTab?.close(); toast.error(result.error); return; }
      setRequests(old => old.filter(req => req.id !== id));
      window.dispatchEvent(new Event("onlyfood:reset-requests-changed"));
      if (action === "APPROVE") {
        setLastApproved("Clave temporal: 12345678 (24 horas). El cliente deberá registrar correo y contraseña nueva.");
        const whatsappUrl = "whatsappUrl" in result && typeof result.whatsappUrl === "string"
          ? result.whatsappUrl : null;
        if (whatsappUrl) {
          setLastWhatsappUrl(whatsappUrl);
          if (whatsappTab && !whatsappTab.closed) {
            whatsappTab.opener = null;
            whatsappTab.location.replace(whatsappUrl);
          } else {
            toast.info("Abrí WhatsApp para avisar al cliente.", {
              action: {
                label: "Abrir chat",
                onClick: () => { window.open(whatsappUrl, "_blank", "noopener,noreferrer"); },
              },
              duration: 12000,
            });
          }
        } else {
          whatsappTab?.close();
          setLastWhatsappUrl(null);
          toast.warning("Clave restablecida. No se pudo preparar WhatsApp: verificá el celular del cliente.");
        }
        toast.success("Restablecimiento aprobado. Confirmá el envío del mensaje en WhatsApp.");
      } else {
        whatsappTab?.close();
        toast.success("Solicitud rechazada.");
      }
      router.refresh();
    } catch {
      whatsappTab?.close();
      toast.error("No se pudo procesar la solicitud.");
    }
    finally { setBusy(null); }
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-black">Solicitudes de reseteo de contraseña</h3>
        <p className="mt-1 text-sm text-slate-600">
          Solo clientes sin correo. Contrastá la identidad con el solicitante antes de aprobar.
          La nueva contraseña temporal no habilita compras ni datos de la cuenta.
        </p>
      </div>
      {lastApproved && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
          role="status">
          {lastApproved}
          {lastWhatsappUrl && (
            <a href={lastWhatsappUrl} target="_blank" rel="noopener noreferrer"
              className="ml-2 underline">Abrir WhatsApp del cliente</a>
          )}
          <button type="button" className="ml-2 underline" onClick={() => {
            setLastApproved(null);
            setLastWhatsappUrl(null);
          }}>Ocultar</button>
        </div>
      )}
      {requests.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">No hay solicitudes pendientes.</div>
      ) : requests.map(request => (
        <article key={request.id} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <div className="font-black text-slate-900">
                {request.client.name || "Sin nombre registrado"}
              </div>
              <div className="text-sm text-slate-600">Teléfono: {request.client.phone}</div>
              <div className="text-xs text-slate-500">
                Nombre que ingresó el solicitante: {request.claimedName}
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {new Date(request.createdAt).toLocaleString("es-AR")}
            </div>
          </div>
          {request.client.email ? (
            <p className="text-sm font-semibold text-red-600">
              Este cliente ya tiene correo: no corresponde aprobar contraseña temporal.
            </p>
          ) : (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-1 accent-orange-600"
                checked={Boolean(identityChecked[request.id])}
                onChange={e => setIdentityChecked(old => ({ ...old, [request.id]: e.target.checked }))}/>
              Confirmo que comprobé la identidad del titular y que le informaré personalmente la clave temporal.
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy !== null || !identityChecked[request.id] || Boolean(request.client.email)}
              className="bg-orange-600 text-white" onClick={() => void process(request.id, "APPROVE")}>
              {busy === request.id ? "Procesando…" : "Aprobar y activar 12345678"}
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null}
              onClick={() => void process(request.id, "REJECT")}>Rechazar</Button>
          </div>
        </article>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
        Actualizar solicitudes
      </Button>
    </section>
  );
}

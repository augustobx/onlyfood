"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { KeyRound, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { issueAssistedClientRecoveryCode } from "@/app/actions/client-recovery";

type Client = { id: string; phone: string; name: string | null; email: string | null };

export function LegacyRecoveryIssuer({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    setChecked(false);
    setCode("");
    setExpiresAt("");
  }, [client?.id]);

  async function issue() {
    if (!client || !checked) return;
    setBusy(true);
    try {
      const result = await issueAssistedClientRecoveryCode(client.id, checked);
      if (!result.success) { toast.error(result.error); return; }
      setCode(result.code);
      setExpiresAt(result.expiresAt);
      toast.success("Código individual generado. Entregalo solo al titular verificado.");
    } catch {
      toast.error("No se pudo generar el código.");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={Boolean(client)} onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-w-md rounded-3xl bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Recuperación sin correo</DialogTitle>
          <DialogDescription>
            Solo para clientes históricos sin correo. Este código no reemplaza su contraseña y se usa una sola vez.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="rounded-xl bg-slate-50 p-3">
            <strong>{client?.name || "Cliente"}</strong> · {client?.phone}
          </p>
          {!code ? (
            <>
              <p className="text-amber-800">
                Verificá la identidad del titular por un canal confiable antes de emitir o entregar el código.
                Saber el teléfono o el nombre no es prueba suficiente.
              </p>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <Checkbox checked={checked} onCheckedChange={value => setChecked(value === true)} />
                <span>Confirmo que verifiqué personalmente la identidad del cliente y que entregaré el código solo al titular.</span>
              </label>
              <Button type="button" disabled={!checked || busy} onClick={issue}
                className="w-full bg-orange-600 text-white">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generar código temporal
              </Button>
            </>
          ) : (
            <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs font-semibold">Código personal (mostrar solo una vez)</p>
              <code className="block break-all text-center font-mono text-xl font-bold tracking-widest">{code}</code>
              <p className="text-xs">Vence a las {new Date(expiresAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs.
                Al ingresar, el cliente deberá agregar un correo para futuras recuperaciones.</p>
              <Button type="button" variant="outline" className="w-full"
                onClick={() => void navigator.clipboard.writeText(code).then(
                  () => toast.success("Código copiado."),
                  () => toast.error("No se pudo copiar el código."),
                )}>
                <Copy className="mr-2 h-4 w-4" /> Copiar código
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

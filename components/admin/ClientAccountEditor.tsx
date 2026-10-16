"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateClientContactDetails } from "@/app/actions/admin-users";

type ClientContact = {
  id: string; name: string | null; phone: string;
  email: string | null; emailVerifiedAt: Date | string | null;
};

export function ClientAccountEditor({
  client, onClose, onSaved,
}: { client: ClientContact | null; onClose: () => void; onSaved: (value: ClientContact) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!client) return;
    setName(client.name || "");
    setPhone(client.phone);
    setEmail(client.email || "");
  }, [client]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    try {
      const result = await updateClientContactDetails({
        clientId: client.id, name, phone, email,
      });
      if (!result.success) {
        toast.error(result.error || "No se pudieron guardar los cambios.");
        return;
      }
      toast.success("Cuenta actualizada.", {
        description: result.requiresVerification
          ? "Correo sin verificar. Ahora podés enviar el enlace desde la tabla."
          : result.sessionsRevoked
            ? "Se cerraron las sesiones anteriores por el cambio de teléfono."
            : "Puntos, pedidos y contraseña conservados.",
      });
      onSaved(result.client);
    } catch {
      toast.error("No se pudieron guardar los cambios.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={Boolean(client)} onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-w-md rounded-3xl bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle className="font-black text-xl">Editar cuenta de cliente</DialogTitle>
          <DialogDescription>
            El correo nuevo deberá confirmarse desde la casilla del cliente. Nunca se marca verificado desde aquí.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={save}>
          <div className="space-y-1">
            <Label htmlFor="client-account-name">Nombre</Label>
            <Input id="client-account-name" value={name} maxLength={80}
              onChange={event => setName(event.target.value)} placeholder="Nombre" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="client-account-phone">Teléfono de acceso</Label>
            <Input id="client-account-phone" type="tel" required value={phone}
              onChange={event => setPhone(event.target.value)} placeholder="5491112345678" />
            <p className="text-xs text-amber-700">Si cambiás este número, se cerrarán las sesiones del cliente.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="client-account-email">Correo electrónico</Label>
            <Input id="client-account-email" type="email" value={email} maxLength={254}
              onChange={event => setEmail(event.target.value)} placeholder="cliente@correo.com" />
            <p className="text-xs text-slate-500">
              Si editás el correo, la recuperación quedará pendiente hasta que el destinatario confirme la dirección.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={busy || !phone.trim()}
              className="bg-orange-600 text-white">
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

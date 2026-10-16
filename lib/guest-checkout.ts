/** Historial de compras invitadas: guardar solo enlaces privados en la sesión del navegador.
 * No es autenticación ni reemplaza la verificación del token en el servidor.
 * Nunca guardar credenciales, teléfonos o direcciones en localStorage.
 */
export type GuestOrderLink = {
  orderId: string;
  token: string;
  createdAt: number;
  paymentMethod: "CASH" | "MP" | "TRANSFER";
};
export type GuestOrderStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 12;
const uuid = /^[a-f0-9-]{36}$/i;
const tokenPattern = /^[A-Za-z0-9_-]{32,200}$/;

export function guestOrdersKey(tenantId: string): string {
  return `onlyfood:guest-orders:${tenantId}`;
}
export function guestTrackingHref(order: Pick<GuestOrderLink,"orderId"|"token">): string {
  return `/track/${encodeURIComponent(order.orderId)}?token=${encodeURIComponent(order.token)}`;
}
export function guestOrdersFromJson(value: string | null, now = Date.now()): GuestOrderLink[] {
  try {
    const entries: unknown = JSON.parse(value || "[]");
    if (!Array.isArray(entries)) return [];
    const used = new Set<string>();
    return entries.filter((v): v is GuestOrderLink => {
      if (!v || typeof v !== "object") return false;
      const o = v as Partial<GuestOrderLink>;
      if (!o.orderId || !uuid.test(o.orderId) || !o.token || !tokenPattern.test(o.token)
          || !Number.isFinite(o.createdAt) || !o.createdAt
          || o.createdAt > now + 60_000 || now - o.createdAt > MAX_AGE_MS
          || !["CASH", "MP", "TRANSFER"].includes(o.paymentMethod || "")
          || used.has(o.orderId)) return false;
      used.add(o.orderId);
      return true;
    }).slice(0, MAX_ENTRIES);
  } catch { return []; }
}
export function readGuestOrders(storage: GuestOrderStorage, tenantId: string, now = Date.now()): GuestOrderLink[] {
  const key = guestOrdersKey(tenantId);
  const found = guestOrdersFromJson(storage.getItem(key), now);
  return found;
}
export function saveGuestOrder(storage: GuestOrderStorage, tenantId: string, input: GuestOrderLink, now = Date.now()): GuestOrderLink[] {
  const key = guestOrdersKey(tenantId);
  const next = guestOrdersFromJson(JSON.stringify([input, ...readGuestOrders(storage, tenantId, now)]), now);
  storage.setItem(key, JSON.stringify(next));
  return next;
}
export function removeGuestOrder(storage: GuestOrderStorage, tenantId: string, orderId: string): GuestOrderLink[] {
  const key = guestOrdersKey(tenantId);
  const next = readGuestOrders(storage, tenantId).filter(x => x.orderId !== orderId);
  if (next.length) storage.setItem(key, JSON.stringify(next));
  else storage.removeItem(key);
  return next;
}

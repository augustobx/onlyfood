"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { confirmMercadoPagoReturn } from "@/app/actions/checkout";

export default function MPReturnHandler({ orderId, paymentId, status, paymentStatus }: { orderId: string; paymentId?: string; status?: string; paymentStatus: string }) {
  const clearCart = useCartStore((state) => state.clearCart);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "approved" || status === "success") {
      clearCart();
      if (paymentStatus === "PAID") {
        setShowSuccessOverlay(true);
      } else if (paymentId) {
        toast.loading("Confirmando el pago con Mercado Pago...", { id: "mp-confirmation" });
        confirmMercadoPagoReturn(orderId, paymentId).then((result) => {
          if (result.success && result.paymentStatus === "PAID") {
            toast.dismiss("mp-confirmation");
            setShowSuccessOverlay(true);
            router.refresh();
          } else {
            toast.info("Mercado Pago aun informa el pago como pendiente.", { id: "mp-confirmation" });
          }
        });
      } else {
        toast.info("Estamos verificando el pago con Mercado Pago. Esta pantalla se actualizara automaticamente.");
      }
    } else if (status === "failure") {
      toast.error("El pago no se completo. El pedido continua pendiente.");
    }
  }, [orderId, paymentId, status, paymentStatus, clearCart, router]);

  if (!showSuccessOverlay) return null;
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 text-center">
      <div className="space-y-6">
        <h2 className="text-3xl font-extrabold text-white">Pago confirmado!</h2>
        <Button onClick={() => setShowSuccessOverlay(false)} className="bg-green-600 hover:bg-green-500 text-white font-bold h-16 px-10 text-xl rounded-2xl">
          Ver mi pedido
        </Button>
      </div>
    </div>
  );
}

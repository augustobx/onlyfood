"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BellRing, Check, Info, Copy } from "lucide-react";
import { toast } from "sonner";

// Utility to convert Base64 string to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushPrompt({ orderId, clientId, trackingToken, theme = "ORIGINAL" }: { orderId?: string, clientId?: string, trackingToken?: string, theme?: string }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isChromeIOS, setIsChromeIOS] = useState(false);

  useEffect(() => {
    // Check if Push is supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);

      // Check existing subscription
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) {
            setIsSubscribed(true);

            // ¡EL PARCHE SILENCIOSO!
            // Si el dispositivo ya estaba suscrito, actualizamos el backend 
            // con el ID de este nuevo pedido sin que el usuario tenga que tocar nada.
            fetch('/api/webpush/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscription: sub,
                orderId,
                clientId,
                trackingToken,
              })
            }).catch(e => console.error("Error actualizando subscripción silenciosa:", e));
          }
        });
      });
    }

    // Check iOS and Standalone (PWA)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

    // Detectar si es Chrome o un navegador in-app en iOS
    setIsChromeIOS(ios && (/CriOS/.test(navigator.userAgent) || /FBAV|FBAN|Instagram/.test(navigator.userAgent)));
  }, [orderId, clientId, trackingToken]);

  const subscribePush = async () => {
    try {
      setLoading(true);

      if (!('Notification' in window)) {
        toast.error("Navegador no soportado", { description: "Tu dispositivo o navegador no soporta notificaciones web nativas." });
        setLoading(false);
        return;
      }

      const permItem = await Notification.requestPermission();
      if (permItem !== 'granted') {
        toast.error("Permiso denegado", { description: "Deberás habilitar las notificaciones desde los ajustes del navegador." });
        setLoading(false);
        return;
      }

      // 1. Get VAPID public key from backend
      const vapidRes = await fetch('/api/webpush/vapid');
      const vapidData = await vapidRes.json();

      if (!vapidData.publicKey) {
        toast.error("Error", { description: "El servidor aún no configuró las notificaciones." });
        setLoading(false);
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);

      // 2. Subscribe from Service Worker
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // 3. Send subscription to backend
      const res = await fetch('/api/webpush/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          orderId,
          clientId,
          trackingToken,
        })
      });

      if (res.ok) {
        setIsSubscribed(true);
        toast.success("¡Excelente!", { description: "Enviaremos una notificación PUSH apenas tu pedido cambie de estado." });
      } else {
        toast.error("Error al registrar", { description: "No pudimos guardar tu suscripción en este momento." });
      }
    } catch (e) {
      console.error(e);
      toast.error("Error de conexión", { description: "No fue posible configurar las notificaciones nativas." });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("¡Link copiado con éxito!", {
      description: "Abrí Safari, pegalo en la barra de direcciones y tocá Compartir > Añadir a Inicio."
    });
  };

  if (!isSupported) return null;

  const isUrbanDark = theme === "URBAN_DARK";
  const isCleanBoutique = theme === "CLEAN_BOUTIQUE";
  const isFastNeo = theme === "FAST_NEO";

  if (isSubscribed) {
    const successClass = isUrbanDark
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : isCleanBoutique
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : "bg-green-50 text-green-700 border-green-200";

    return (
      <div className={`p-4 border rounded-2xl flex items-center justify-center gap-2.5 font-bold text-sm shadow-xs ${successClass}`}>
        <Check className="w-5 h-5 text-emerald-500 shrink-0" />
        <span>Notificaciones de estado activadas para este pedido</span>
      </div>
    );
  }

  const containerClass = isUrbanDark
    ? "bg-white/[0.04] border-white/[0.08] text-white shadow-xl"
    : isCleanBoutique
    ? "bg-white border-stone-300/60 text-stone-900 shadow-sm"
    : isFastNeo
    ? "bg-white border-slate-200/90 text-slate-900 shadow-sm"
    : "bg-white border-slate-200 text-slate-950 shadow-md";

  const bellClass = isUrbanDark
    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
    : isCleanBoutique
    ? "bg-stone-100 text-stone-800"
    : "bg-orange-100 text-orange-600";

  const btnClass = isUrbanDark
    ? "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/25"
    : isCleanBoutique
    ? "bg-stone-900 hover:bg-stone-800 text-white font-serif tracking-wide"
    : isFastNeo
    ? "bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
    : "bg-slate-950 hover:bg-slate-900 text-white shadow-md";

  return (
    <div className={`border p-5 sm:p-6 rounded-3xl space-y-4 ${containerClass}`}>
      <div className="flex items-start gap-3.5 sm:gap-4">
        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${bellClass}`}>
          <BellRing className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
        </div>
        <div className="min-w-0">
          <h3 className={`text-base sm:text-lg font-black tracking-tight leading-snug ${isCleanBoutique ? 'font-serif' : ''}`}>
            Rastreo en Tiempo Real
          </h3>
          <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isUrbanDark ? 'text-slate-400' : isCleanBoutique ? 'text-stone-500' : 'text-slate-500'}`}>
            ¿Querés recibir un aviso instantáneo en este dispositivo cuando tu pedido cambie de estado o esté listo?
          </p>
        </div>
      </div>

      {isIOS && (!isStandalone || isChromeIOS) ? (
        <div className={`text-xs p-4 rounded-2xl flex flex-col gap-3 border ${
          isUrbanDark
            ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
            : isCleanBoutique
            ? "bg-stone-100 text-stone-800 border-stone-200"
            : "bg-blue-50 text-blue-800 border-blue-200"
        }`}>
          <div className="flex gap-2.5">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
            <p className="leading-relaxed">
              Estás en <strong>iPhone</strong>. Para recibir notificaciones debés instalar la app exclusivamente desde <strong>Safari</strong> (botón Compartir y <strong>Añadir a Inicio</strong>).
              {isChromeIOS && " Si instalaste la app usando Chrome o desde otra red social, por favor eliminala primero."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className={`w-full font-bold mt-1 rounded-xl ${
              isUrbanDark
                ? "bg-white/10 hover:bg-white/20 text-white border-white/10"
                : "bg-white hover:bg-slate-100 border-slate-200 text-slate-800"
            }`}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar link para abrir en Safari
          </Button>
        </div>
      ) : (
        <Button
          onClick={subscribePush}
          disabled={loading}
          className={`w-full font-black h-12 rounded-2xl text-sm transition-all ${btnClass}`}
        >
          {loading ? "Configurando..." : "🔔 Tocar P/ Recibir Notificaciones"}
        </Button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { getFavoriteProductIds, toggleProductFavorite } from "@/app/actions/client-pwa";

export function FavoriteButton({ productId, compact = false }: { productId: string; compact?: boolean }) {
  const [favorite, setFavorite] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void getFavoriteProductIds().then(ids => {
      if (active) setFavorite(ids.includes(productId));
    }).catch(() => {});
    return () => { active = false; };
  }, [productId]);
  return (
    <button type="button" disabled={busy}
      onClick={async e => {
        e.preventDefault();
        e.stopPropagation();
        if (busy) return;
        setBusy(true);
        try {
          const result = await toggleProductFavorite(productId);
          if (result.success) {
            setFavorite(result.favorite);
            toast.success(result.favorite ? "Agregado a tus favoritos" : "Eliminado de favoritos");
          } else toast.error(result.error);
        } catch { toast.error("No se pudo actualizar tu favorito."); }
        finally { setBusy(false); }
      }}
      className={`inline-flex items-center justify-center gap-1 rounded-xl border border-rose-400/40 bg-white/95 p-2 text-rose-600 shadow-sm hover:bg-rose-50 disabled:opacity-50 ${compact ? "" : "px-3"}`}
      title={favorite ? "Quitar de favoritos" : "Guardar como favorito"}
      aria-pressed={favorite}
      aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}>
      <Heart className={`h-4 w-4 ${favorite ? "fill-rose-500" : ""}`}/>
      {!compact && <span className="text-xs font-bold">{favorite ? "Favorito" : "Guardar"}</span>}
    </button>
  );
}

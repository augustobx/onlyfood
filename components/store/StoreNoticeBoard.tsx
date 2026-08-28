"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, Newspaper, Sparkles, X } from "lucide-react";

export function StoreNoticeBoard({ open, onClose, config }: { open: boolean; onClose: () => void; config: any }) {
  const theme = config?.storeTheme || "ORIGINAL";
  const isComic = theme === "COMIC_FOOD_POP";
  const isArcade = theme === "ARCADE_KITCHEN";
  const isDark = theme === "URBAN_DARK";
  const isBoutique = theme === "CLEAN_BOUTIQUE" || theme === "FRESH_MARKET";

  useEffect(() => {
    if (!open || !config?.noticeBoardAutoClose) return;
    const seconds = Math.max(3, Math.min(120, Number(config.noticeBoardDuration) || 8));
    const timeout = window.setTimeout(onClose, seconds * 1000);
    return () => window.clearTimeout(timeout);
  }, [config?.noticeBoardAutoClose, config?.noticeBoardDuration, onClose, open]);

  const cardClass = isComic
    ? "rounded-3xl border-[4px] border-[#17121f] bg-[#fff7db] text-[#17121f] shadow-[10px_10px_0_#17121f]"
    : isArcade
      ? "rounded-none border-2 border-cyan-300 bg-[#15113b] text-white shadow-[10px_10px_0_#ec4899]"
      : isDark
        ? "rounded-[2rem] border border-white/15 bg-[#11141c] text-white shadow-2xl"
        : isBoutique
          ? "rounded-[2rem] border border-stone-300 bg-[#faf8f5] text-stone-900 shadow-2xl"
          : "rounded-[2rem] border border-slate-200 bg-white text-slate-950 shadow-2xl";
  const labelClass = isComic
    ? "rotate-[-2deg] border-2 border-[#17121f] bg-[#ffe45e] text-[#17121f] shadow-[3px_3px_0_#17121f]"
    : isArcade
      ? "border border-cyan-300 bg-cyan-300/10 text-cyan-200"
      : isDark
        ? "border border-orange-400/30 bg-orange-400/10 text-orange-300"
        : "border border-current/15 bg-black/5";

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="presentation">
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-notice-title"
            initial={{ opacity: 0, y: 28, scale: .94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: .96 }}
            transition={{ type: "spring", stiffness: 310, damping: 28 }}
            className={`relative max-h-[86dvh] w-full max-w-lg overflow-y-auto p-6 sm:p-8 ${cardClass}`}
            style={{ "--notice-primary": config?.primaryColor || "#f97316", "--notice-secondary": config?.secondaryColor || "#9333ea" } as React.CSSProperties}
          >
            <button type="button" onClick={onClose} aria-label="Cerrar tablón de noticias" className={`absolute right-4 top-4 grid size-10 place-items-center transition hover:scale-105 ${isComic ? "rounded-xl border-2 border-[#17121f] bg-white shadow-[3px_3px_0_#17121f]" : isArcade ? "border-2 border-cyan-300 bg-[#090625] text-cyan-200" : "rounded-full bg-black/10 hover:bg-black/15"}`}><X className="size-5" /></button>

            <div className={`mb-5 grid size-14 place-items-center ${isComic ? "rotate-[-4deg] rounded-xl border-[3px] border-[#17121f] bg-[var(--notice-primary)] text-white shadow-[4px_4px_0_#17121f]" : isArcade ? "border-2 border-yellow-200 bg-fuchsia-600 text-yellow-200 shadow-[4px_4px_0_#32f5ff]" : "rounded-2xl text-white shadow-lg"}`} style={!isComic && !isArcade ? { background: "linear-gradient(135deg, var(--notice-primary), var(--notice-secondary))" } : undefined}>
              {isArcade ? <BellRing className="size-7" /> : isComic ? <Newspaper className="size-7" /> : <Sparkles className="size-7" />}
            </div>
            <span className={`inline-flex px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] ${labelClass}`}>{isArcade ? "System broadcast" : isComic ? "¡Última noticia!" : "Novedades"}</span>
            <h2 id="store-notice-title" className={`mt-5 pr-10 text-3xl font-black leading-tight sm:text-4xl ${isComic ? "uppercase tracking-[-.045em]" : isArcade ? "uppercase tracking-wide text-yellow-200" : isBoutique ? "font-serif" : "tracking-tight"}`}>{config?.noticeBoardTitle}</h2>
            <p className={`mt-4 whitespace-pre-wrap text-sm leading-7 sm:text-base ${isComic ? "font-bold" : isArcade ? "font-mono text-violet-100/80" : isDark ? "text-slate-300" : "text-slate-600"}`}>{config?.noticeBoardMessage}</p>

            <button type="button" onClick={onClose} className={`mt-7 h-12 w-full px-5 text-sm font-black transition active:scale-[.98] ${isComic ? "rounded-xl border-2 border-[#17121f] bg-[var(--notice-primary)] text-white shadow-[4px_4px_0_#17121f]" : isArcade ? "border-2 border-yellow-200 bg-fuchsia-600 uppercase text-white shadow-[4px_4px_0_#32f5ff]" : "rounded-2xl text-white shadow-lg hover:brightness-110"}`} style={!isComic && !isArcade ? { background: "linear-gradient(135deg, var(--notice-primary), var(--notice-secondary))" } : undefined}>{isArcade ? "CONTINUAR PARTIDA" : "Entendido"}</button>

            {config?.noticeBoardAutoClose && <div className={`mt-5 h-1.5 overflow-hidden ${isComic ? "border border-[#17121f] bg-white" : isArcade ? "border border-cyan-300/50 bg-[#090625]" : "rounded-full bg-black/10"}`}><motion.div className="h-full" style={{ background: "linear-gradient(90deg, var(--notice-primary), var(--notice-secondary))" }} initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: Math.max(3, Math.min(120, Number(config.noticeBoardDuration) || 8)), ease: "linear" }} /></div>}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

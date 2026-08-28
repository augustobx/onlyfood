"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Coffee, Leaf, Megaphone, Newspaper, Sparkles, X, Zap } from "lucide-react";
import styles from "./StoreNoticeBoard.module.css";

type NoticeProfile = { className: string; eyebrow: string; mark: string; action: string; Icon: typeof Sparkles };

const profiles: Record<string, NoticeProfile> = {
  COMIC_FOOD_POP: { className: styles.comic, eyebrow: "¡Última noticia!", mark: "WOW!", action: "¡Lo tengo!", Icon: Newspaper },
  ARCADE_KITCHEN: { className: styles.arcade, eyebrow: "System broadcast", mark: "+100 XP", action: "Continuar partida", Icon: BellRing },
  URBAN_DARK: { className: styles.urban, eyebrow: "Hot drop", mark: "LIVE", action: "Quiero verlo", Icon: Megaphone },
  FAST_NEO: { className: styles.fast, eyebrow: "Flash news", mark: "GO!", action: "Vamos", Icon: Zap },
  CLEAN_BOUTIQUE: { className: styles.boutique, eyebrow: "La sélection", mark: "ÉDITION", action: "Descubrir", Icon: Sparkles },
  FRESH_MARKET: { className: styles.fresh, eyebrow: "Del mercado", mark: "FRESH", action: "Ver novedades", Icon: Leaf },
  RETRO_DINER: { className: styles.retro, eyebrow: "Especial de la casa", mark: "OPEN", action: "¡Qué rico!", Icon: Coffee },
  NEXO: { className: styles.nexo, eyebrow: "Novedades", mark: "NEW", action: "Entendido", Icon: Sparkles },
  ORIGINAL: { className: styles.nexo, eyebrow: "Novedades", mark: "NEW", action: "Entendido", Icon: Sparkles },
};

export function StoreNoticeBoard({ open, onClose, config }: { open: boolean; onClose: () => void; config: any }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const profile = profiles[config?.storeTheme || "ORIGINAL"] || profiles.ORIGINAL;
  const seconds = Math.max(3, Math.min(120, Number(config?.noticeBoardDuration) || 8));
  const Icon = profile.Icon;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() };
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); previousFocus?.focus() };
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !config?.noticeBoardAutoClose) return;
    const timeout = window.setTimeout(onClose, seconds * 1000);
    return () => window.clearTimeout(timeout);
  }, [config?.noticeBoardAutoClose, onClose, open, seconds]);

  const themeStyle = {
    "--notice-primary": config?.primaryColor || "#f97316",
    "--notice-secondary": config?.secondaryColor || "#9333ea",
  } as CSSProperties;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className={`${styles.overlay} ${profile.className}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="presentation" style={themeStyle}>
          <motion.section role="dialog" aria-modal="true" aria-labelledby="store-notice-title" aria-describedby="store-notice-message" initial={{ opacity: 0, y: 34, scale: .9, rotate: -1 }} animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }} exit={{ opacity: 0, y: 18, scale: .96 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className={styles.card}>
            <div className={styles.pattern} aria-hidden="true" /><div className={styles.glowOne} aria-hidden="true" /><div className={styles.glowTwo} aria-hidden="true" /><div className={styles.checker} aria-hidden="true" />
            <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Cerrar tablón de noticias" className={styles.close}><X aria-hidden="true" /></button>
            <div className={styles.statusLine} aria-hidden="true"><span /> TRANSMISSION ONLINE <span /></div>
            <div className={styles.content}>
              <motion.div className={styles.icon} initial={{ rotate: -12, scale: .7 }} animate={{ rotate: [0, -5, 4, 0], scale: 1 }} transition={{ delay: .12, duration: .65 }} aria-hidden="true"><Icon /></motion.div>
              <motion.span className={styles.mark} initial={{ opacity: 0, scale: 1.5, rotate: 8 }} animate={{ opacity: 1, scale: 1, rotate: -3 }} transition={{ delay: .18, type: "spring" }} aria-hidden="true">{profile.mark}</motion.span>
              <span className={styles.eyebrow}>{profile.eyebrow}</span>
              <h2 id="store-notice-title" className={styles.title}>{config?.noticeBoardTitle}</h2>
              <p id="store-notice-message" className={styles.message}>{config?.noticeBoardMessage}</p>
              <button type="button" onClick={onClose} className={styles.action}><span>{profile.action}</span><span className={styles.actionIcon} aria-hidden="true">→</span></button>
              {config?.noticeBoardAutoClose && <div className={styles.timer} aria-label={`Cierre automático en ${seconds} segundos`}><motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: seconds, ease: "linear" }} /></div>}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

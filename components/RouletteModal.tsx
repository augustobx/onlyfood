"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Gift, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

import { spinRoulette } from "@/app/actions/client-games";

type RoulettePrize = {
  id: string;
  name: string;
  bgColor?: string | null;
  textColor?: string | null;
  [key: string]: unknown;
};

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const FALLBACK_COLORS = ["#ff5a36", "#6d3df5", "#f4b429", "#0ba79b", "#ec3978", "#2477df"];
const SPIN_DURATION = 5600;

function polarToCartesian(cx: number, cy: number, radius: number, degrees: number) {
  const angle = ((degrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function describeSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${endAngle - startAngle <= 180 ? 0 : 1} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function shortLabel(value: string) {
  return value.length > 17 ? `${value.slice(0, 16)}…` : value;
}

export function RouletteModal({
  isOpen,
  onClose,
  prizes,
  onWin,
  cost = 0,
  clientId,
  currentPoints = 0,
  onPointsUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  prizes: RoulettePrize[];
  onWin: (prize: RoulettePrize) => void;
  cost?: number;
  clientId?: string;
  currentPoints?: number;
  onPointsUpdate?: (points: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<RoulettePrize | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const pointerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const sliceAngle = prizes.length ? 360 / prizes.length : 360;
  const pins = useMemo(() => Array.from({ length: Math.max(18, prizes.length * 3) }), [prizes.length]);

  const getAudioContext = useCallback(() => {
    if (!soundEnabled) return null;
    const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
    if (audioContextRef.current.state === "suspended") void audioContextRef.current.resume();
    return audioContextRef.current;
  }, [soundEnabled]);

  const playTone = useCallback((frequency: number, duration: number, volume: number, type: OscillatorType = "triangle") => {
    const context = getAudioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, [getAudioContext]);

  const playTick = useCallback((speed: number) => {
    playTone(250 + speed * 480, 0.045, 0.055 + speed * 0.035, "square");
    pointerRef.current?.animate(
      [{ transform: "translateX(-50%) rotate(0deg)" }, { transform: "translateX(-50%) rotate(13deg)" }, { transform: "translateX(-50%) rotate(0deg)" }],
      { duration: 95, easing: "ease-out" },
    );
  }, [playTone]);

  const playWinSound = useCallback(() => {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      window.setTimeout(() => playTone(frequency, 0.55, 0.12, "sine"), index * 115);
    });
  }, [playTone]);

  const celebrate = useCallback(() => {
    const end = Date.now() + 2200;
    const colors = ["#ff5a36", "#ffd34e", "#7c4dff", "#ffffff"];
    const frame = () => {
      confetti({ particleCount: 4, angle: 62, spread: 55, startVelocity: 45, origin: { x: 0, y: 0.72 }, colors });
      confetti({ particleCount: 4, angle: 118, spread: 55, startVelocity: 45, origin: { x: 1, y: 0.72 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const clearSpinTimers = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    timerRef.current = null;
    animationFrameRef.current = null;
  }, []);

  useEffect(() => clearSpinTimers, [clearSpinTimers]);

  useEffect(() => {
    if (!isOpen) return;
    clearSpinTimers();
    setWonPrize(null);
    setRotation(0);
    setIsSpinning(false);
  }, [isOpen, clearSpinTimers]);

  const handleSpin = async () => {
    if (isSpinning || wonPrize || !prizes.length) return;
    if (!clientId) return toast.error("Necesitás iniciar sesión.");
    if (currentPoints < cost) {
      return toast.error("No tenés suficientes puntos.", { description: `Necesitás ${cost} Pts.` });
    }

    getAudioContext();
    setIsSpinning(true);
    const result = await spinRoulette();
    if (!result.success) {
      setIsSpinning(false);
      return toast.error(result.error);
    }

    onPointsUpdate?.(result.remainingPoints);
    const selectedPrize = result.prize as RoulettePrize;
    const prizeIndex = Math.max(0, prizes.findIndex((prize) => prize.id === selectedPrize.id));
    const targetAngle = 360 - (prizeIndex * sliceAngle + sliceAngle / 2) + sliceAngle * 0.12;
    const fullTurns = 7 + Math.floor(Math.random() * 2);
    const finalRotation = fullTurns * 360 + targetAngle;
    const duration = reduceMotion ? 900 : SPIN_DURATION;
    const startedAt = performance.now();
    let lastSlice = -1;

    setRotation(finalRotation);

    const tickFrame = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const currentSlice = Math.floor((finalRotation * eased) / sliceAngle);
      if (currentSlice > lastSlice) {
        playTick(1 - progress);
        lastSlice = currentSlice;
      }
      if (progress < 1) animationFrameRef.current = requestAnimationFrame(tickFrame);
    };
    animationFrameRef.current = requestAnimationFrame(tickFrame);

    timerRef.current = window.setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(selectedPrize);
      playWinSound();
      celebrate();
      onWin(selectedPrize);
      clearSpinTimers();
    }, duration + 80);
  };

  if (!isOpen) return null;

  return (
    <div className="roulette-modal fixed inset-0 z-[999] flex items-center justify-center overflow-hidden bg-[#080613]/96 p-3 backdrop-blur-xl sm:p-6">
      <div className="roulette-ambient absolute inset-0 pointer-events-none" />
      <div className="absolute left-1/2 top-[42%] h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/15 blur-[90px] pointer-events-none" />

      <button type="button" onClick={onClose} disabled={isSpinning} aria-label="Cerrar ruleta" className="absolute right-4 top-4 z-50 grid size-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-white/20 disabled:opacity-40 sm:right-7 sm:top-7">
        <X className="size-5" />
      </button>

      <AnimatePresence mode="wait">
        {wonPrize ? (
          <motion.div key="winner" initial={{ scale: 0.72, opacity: 0, y: 35 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: "spring", stiffness: 210, damping: 18 }} className="roulette-win relative w-full max-w-md overflow-hidden rounded-[2.25rem] border border-white/70 bg-white p-6 text-center shadow-[0_30px_120px_rgba(124,58,237,.45)] sm:p-9">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-100 to-transparent" />
            <Sparkles className="absolute left-8 top-9 size-6 text-amber-400" />
            <Sparkles className="absolute right-8 top-16 size-4 text-violet-500" />
            <motion.div animate={{ rotate: [0, -7, 7, 0], scale: [1, 1.08, 1] }} transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.4 }} className="relative mx-auto mb-5 grid size-24 place-items-center rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-rose-600 text-white shadow-[0_12px_35px_rgba(249,115,22,.4)] ring-8 ring-orange-100">
              <Gift className="size-11" strokeWidth={2.4} />
            </motion.div>
            <p className="relative mb-2 text-xs font-black uppercase tracking-[.3em] text-orange-600">Premio desbloqueado</p>
            <h2 className="relative text-4xl font-black leading-none tracking-[-.055em] text-slate-950 sm:text-5xl">¡Ganaste!</h2>
            <p className="relative mt-3 text-sm font-medium text-slate-500">Tu premio ya está reservado para este pedido.</p>
            <div className="relative my-7 rounded-2xl border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 px-5 py-6 shadow-inner">
              <p className="text-2xl font-black leading-tight text-orange-600 sm:text-3xl">{wonPrize.name}</p>
            </div>
            <button type="button" onClick={onClose} className="relative h-14 w-full rounded-2xl bg-slate-950 text-base font-black text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0">Usar mi premio</button>
          </motion.div>
        ) : (
          <motion.div key="wheel" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="roulette-stage relative flex w-full max-w-lg flex-col items-center">
            <div className="mb-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.22em] text-amber-300 backdrop-blur sm:mb-4 sm:text-xs"><Sparkles className="size-3.5" /> Ruleta de premios</div>
            <h2 className="text-center text-4xl font-black leading-[.92] tracking-[-.06em] text-white drop-shadow-xl sm:text-6xl">Probá tu suerte</h2>
            <p className="mb-4 mt-2 text-center text-sm font-medium text-white/65 sm:mb-6 sm:mt-3 sm:text-base">Un giro por <strong className="text-amber-300">{cost} puntos</strong></p>

            <div className="roulette-wheel-shell relative aspect-square w-[min(76vw,390px)] max-h-[48vh] max-w-[48vh] sm:w-[min(74vw,430px)] sm:max-h-none sm:max-w-none">
              <div className="absolute inset-[1.5%] rounded-full bg-black/60 shadow-[0_22px_70px_rgba(0,0,0,.75)]" />
              {pins.map((_, index) => {
                const angle = (360 / pins.length) * index;
                return <span key={index} className="roulette-bulb absolute left-1/2 top-1/2 z-20 size-[2.8%] min-h-2 min-w-2 rounded-full bg-amber-100 shadow-[0_0_8px_#ffd76a,0_0_15px_rgba(255,166,0,.75)]" style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-46.5cqw)` }} />;
              })}

              <div className="absolute inset-[7%] z-10 overflow-hidden rounded-full will-change-transform" style={{ transform: `rotate(${rotation}deg)`, transition: `transform ${reduceMotion ? 900 : SPIN_DURATION}ms cubic-bezier(.12,.64,.08,1)` }}>
                <svg viewBox="0 0 400 400" className="size-full" aria-label="Ruleta de premios">
                  <defs>
                    <radialGradient id="wheelShade" cx="32%" cy="25%" r="78%"><stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset=".48" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".38" /></radialGradient>
                    <filter id="textShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="1.8" floodColor="#000" floodOpacity=".42" /></filter>
                  </defs>
                  {prizes.map((prize, index) => {
                    const start = index * sliceAngle;
                    const end = start + sliceAngle;
                    const middle = start + sliceAngle / 2;
                    const labelPosition = polarToCartesian(200, 200, 132, middle);
                    return (
                      <g key={prize.id}>
                        <path d={describeSlice(200, 200, 194, start, end)} fill={prize.bgColor || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} stroke="rgba(255,255,255,.45)" strokeWidth="2" />
                        <text x={labelPosition.x} y={labelPosition.y} fill={prize.textColor || "#fff"} fontSize={prizes.length > 8 ? 11 : 14} fontWeight="900" fontFamily="system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle" filter="url(#textShadow)" transform={`rotate(${middle}, ${labelPosition.x}, ${labelPosition.y})`}>{shortLabel(prize.name)}</text>
                      </g>
                    );
                  })}
                  <circle cx="200" cy="200" r="194" fill="url(#wheelShade)" />
                </svg>
              </div>
              <div className="absolute inset-[7%] z-20 rounded-full shadow-[inset_0_0_28px_rgba(0,0,0,.52),inset_0_0_0_3px_rgba(255,255,255,.2)] pointer-events-none" />
              <div className="absolute left-1/2 top-1/2 z-30 grid size-[22%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-amber-200 bg-gradient-to-br from-amber-300 via-orange-500 to-orange-700 shadow-[0_8px_18px_rgba(0,0,0,.5),inset_0_2px_3px_rgba(255,255,255,.7)]"><span className="text-[clamp(.62rem,2.5vw,.88rem)] font-black uppercase tracking-tight text-white drop-shadow">Girá</span></div>
              <div ref={pointerRef} className="roulette-pointer absolute -top-[1%] left-1/2 z-40 w-[15%] origin-[50%_16%] -translate-x-1/2 drop-shadow-[0_7px_6px_rgba(0,0,0,.65)]">
                <svg viewBox="0 0 64 86" className="w-full overflow-visible"><defs><linearGradient id="pointerGold" x1="14" y1="4" x2="46" y2="78"><stop stopColor="#fff5ae" /><stop offset=".42" stopColor="#ffbd27" /><stop offset="1" stopColor="#d45a09" /></linearGradient></defs><path d="M32 82 8 22C5 13 14 4 32 4s27 9 24 18L32 82Z" fill="url(#pointerGold)" stroke="#fff8d6" strokeWidth="3" strokeLinejoin="round" /><circle cx="32" cy="20" r="8" fill="#381b12" stroke="#ffd760" strokeWidth="3" /><circle cx="29" cy="17" r="2" fill="#fff" opacity=".65" /></svg>
              </div>
            </div>

            <div className="mt-4 flex w-full max-w-sm items-center gap-2 sm:mt-6">
              <button type="button" onClick={() => setSoundEnabled((enabled) => !enabled)} aria-label={soundEnabled ? "Desactivar sonido" : "Activar sonido"} className="grid size-14 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white/80 backdrop-blur transition hover:bg-white/15 hover:text-white">{soundEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}</button>
              <button type="button" onClick={handleSpin} disabled={isSpinning} className="roulette-spin-button relative h-14 flex-1 overflow-hidden rounded-2xl bg-gradient-to-b from-amber-300 via-orange-500 to-orange-600 px-5 text-base font-black uppercase tracking-wide text-white shadow-[0_7px_0_#9a3412,0_15px_28px_rgba(249,115,22,.3)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-[5px] active:shadow-[0_2px_0_#9a3412] disabled:cursor-wait disabled:opacity-80 sm:text-lg"><span className="relative z-10">{isSpinning ? "¡Allá vamos!" : `Girar · ${cost} pts`}</span></button>
            </div>
            <p className="mt-4 text-center text-xs font-medium text-white/40">Saldo disponible: {currentPoints} puntos</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

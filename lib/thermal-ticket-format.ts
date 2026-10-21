import type { BurgerTicketLine } from "@/lib/burger-ticket";

/**
 * Standard ESC/POS text mode on the existing printers accepts ASCII.
 * Transliterate punctuation BEFORE encoding so a dash never becomes "?".
 */
export function thermalPrinterText(value: string): string {
  return value
    .replace(/[ \t]*[—–−‐‑‒―][ \t]*/g, " - ")
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[•●▪·]/g, "-")
    .replace(/[×✕]/g, "x")
    .replace(/…/g, "...")
    .replace(/[¿¡]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, "")
    .replace(/[^\x20-\x7E\n]/g, " ");
}

/** Keep base product name while calling out changed size only once. */
export function burgerPrintName(name: string, size: string): string {
  if (!size) return name;
  const normalized = thermalPrinterText(name).toUpperCase();
  const normalizedSize = thermalPrinterText(size).toUpperCase();
  const escapedSize = normalizedSize.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(^|[^A-Z0-9])${escapedSize}($|[^A-Z0-9])`).test(normalized)) return name;
  return `${name} - ${size}`;
}

const bunName = (name: string) =>
  /^(?:pan(?:\s|$)|bun(?:\s|$)|brioche(?:\s|$))/.test(
    thermalPrinterText(name).trim().toLowerCase(),
  ) && !/^pan rallado(?:\s|$)/.test(thermalPrinterText(name).trim().toLowerCase());

/**
 * A removed bun is printed once as SIN PAN (not also inside SIN:...).
 * Keep other removed ingredients highly visible but without !!! punctuation.
 */
export function assemblyWarnings(burger: Pick<BurgerTicketLine, "removed" | "hasBun">): string[] {
  const otherRemoved = burger.removed.filter((name) => burger.hasBun || !bunName(name));
  const result: string[] = [];
  if (!burger.hasBun) result.push("SIN PAN");
  if (otherRemoved.length) result.push(`SIN: ${otherRemoved.join(", ").toUpperCase()}`);
  return result;
}

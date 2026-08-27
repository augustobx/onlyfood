export interface DaySchedule {
  day: number; // 0: Domingo, 1: Lunes, 2: Martes, 3: Miércoles, 4: Jueves, 5: Viernes, 6: Sábado
  dayName: string;
  isOpen: boolean;
  shift1Open: string;
  shift1Close: string;
  shift2Open: string;
  shift2Close: string;
}

export const DEFAULT_BUSINESS_HOURS: DaySchedule[] = [
  { day: 1, dayName: "Lunes", isOpen: true, shift1Open: "12:00", shift1Close: "15:00", shift2Open: "19:30", shift2Close: "23:30" },
  { day: 2, dayName: "Martes", isOpen: true, shift1Open: "12:00", shift1Close: "15:00", shift2Open: "19:30", shift2Close: "23:30" },
  { day: 3, dayName: "Miércoles", isOpen: true, shift1Open: "12:00", shift1Close: "15:00", shift2Open: "19:30", shift2Close: "23:30" },
  { day: 4, dayName: "Jueves", isOpen: true, shift1Open: "12:00", shift1Close: "15:00", shift2Open: "19:30", shift2Close: "23:30" },
  { day: 5, dayName: "Viernes", isOpen: true, shift1Open: "12:00", shift1Close: "15:00", shift2Open: "19:30", shift2Close: "00:30" },
  { day: 6, dayName: "Sábado", isOpen: true, shift1Open: "12:00", shift1Close: "15:30", shift2Open: "19:30", shift2Close: "01:00" },
  { day: 0, dayName: "Domingo", isOpen: true, shift1Open: "12:00", shift1Close: "15:30", shift2Open: "19:30", shift2Close: "23:30" },
];

export function parseBusinessHours(jsonStr: string | null | undefined): DaySchedule[] {
  if (!jsonStr) return DEFAULT_BUSINESS_HOURS;
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length === 7) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_BUSINESS_HOURS;
}

/**
 * Evalúa si el local está actualmente en horario de atención según el cronograma semanal
 */
export function isCurrentlyInBusinessHours(
  schedule: DaySchedule[],
  targetDate: Date = new Date(),
  timeZone: string = "America/Argentina/Buenos_Aires"
): { isOpen: boolean; currentShift?: string; nextInfo?: string } {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(targetDate);
    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
    const currentDay = weekdayMap[weekdayStr] ?? targetDate.getDay();
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    const currentTimeMinutes = hour * 60 + minute;

    const dayConfig = schedule.find((s) => s.day === currentDay);
    if (!dayConfig || !dayConfig.isOpen) {
      return { isOpen: false, nextInfo: `${dayConfig?.dayName || "Hoy"}: Cerrado` };
    }

    const parseMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const isWithin = (openStr: string, closeStr: string) => {
      if (!openStr || !closeStr) return false;
      const openMin = parseMinutes(openStr);
      const closeMin = parseMinutes(closeStr);
      // Si cierra después de medianoche (ej: 01:00)
      if (closeMin < openMin) {
        return currentTimeMinutes >= openMin || currentTimeMinutes <= closeMin;
      }
      return currentTimeMinutes >= openMin && currentTimeMinutes <= closeMin;
    };

    if (isWithin(dayConfig.shift1Open, dayConfig.shift1Close)) {
      return { isOpen: true, currentShift: `${dayConfig.shift1Open} a ${dayConfig.shift1Close}` };
    }
    if (isWithin(dayConfig.shift2Open, dayConfig.shift2Close)) {
      return { isOpen: true, currentShift: `${dayConfig.shift2Open} a ${dayConfig.shift2Close}` };
    }

    return {
      isOpen: false,
      nextInfo: `Horarios de hoy: ${dayConfig.shift1Open}-${dayConfig.shift1Close} / ${dayConfig.shift2Open}-${dayConfig.shift2Close}`,
    };
  } catch (error) {
    console.error("Error evaluating business hours:", error);
    return { isOpen: true };
  }
}

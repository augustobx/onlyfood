export type WeekDayId = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface WeekDayInfo {
  id: WeekDayId;
  name: string;
  short: string;
  dayIndex: number; // 0 for Sunday, 1 for Monday, ..., 6 for Saturday (standard JS Date.getDay())
}

export const WEEK_DAYS: WeekDayInfo[] = [
  { id: "MONDAY", name: "Lunes", short: "Lun", dayIndex: 1 },
  { id: "TUESDAY", name: "Martes", short: "Mar", dayIndex: 2 },
  { id: "WEDNESDAY", name: "Miércoles", short: "Mié", dayIndex: 3 },
  { id: "THURSDAY", name: "Jueves", short: "Jue", dayIndex: 4 },
  { id: "FRIDAY", name: "Viernes", short: "Vie", dayIndex: 5 },
  { id: "SATURDAY", name: "Sábado", short: "Sáb", dayIndex: 6 },
  { id: "SUNDAY", name: "Domingo", short: "Dom", dayIndex: 0 },
];

/**
 * Parsea el campo availableDays (guardado como string separado por comas)
 * Devuelve un array de WeekDayId válidos. Si está vacío o es null, devuelve [].
 */
export function parseAvailableDays(raw?: string | null): WeekDayId[] {
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "ALL") return [];
  
  const validIds = new Set<string>(WEEK_DAYS.map(d => d.id));
  return trimmed
    .split(",")
    .map(s => s.trim().toUpperCase())
    .filter((id): id is WeekDayId => validIds.has(id));
}

/**
 * Determina si un producto es de venta diaria regular (ej. hamburguesas, bebidas)
 */
export function isDailyProduct(raw?: string | null): boolean {
  const days = parseAvailableDays(raw);
  return days.length === 0;
}

/**
 * Genera una etiqueta legible para el cliente (ej. "Solo Viernes", "Lunes y Miércoles")
 */
export function getProductDaysLabel(raw?: string | null): string {
  const days = parseAvailableDays(raw);
  if (days.length === 0) return "Todos los días";

  const dayNames = days.map(id => WEEK_DAYS.find(d => d.id === id)?.name || id);
  if (dayNames.length === 1) {
    return `Solo ${dayNames[0]}`;
  }
  if (dayNames.length === 2) {
    return `${dayNames[0]} y ${dayNames[1]}`;
  }
  return dayNames.join(", ");
}

/**
 * Genera una etiqueta corta para badges (ej. "Menú del Viernes", "Lunes / Miércoles")
 */
export function getProductBadgeLabel(raw?: string | null): string {
  const days = parseAvailableDays(raw);
  if (days.length === 0) return "";
  const dayNames = days.map(id => WEEK_DAYS.find(d => d.id === id)?.name || id);
  if (dayNames.length === 1) {
    return `Menú del ${dayNames[0]}`;
  }
  return `Días: ${dayNames.join(", ")}`;
}

/**
 * Calcula la próxima fecha de calendario (YYYY-MM-DD) en la que el producto está disponible.
 * Si hoy coincide con el día del producto, devuelve hoy. Si ya pasó o es un día futuro de la semana,
 * busca el próximo día disponible dentro de los siguientes 7 días.
 */
export function getNextAvailableDate(raw?: string | null, fromDate: Date = new Date()): { dateStr: string; dayName: string; formatted: string; dayOffset: number } | null {
  const days = parseAvailableDays(raw);
  if (days.length === 0) return null;

  const targetDayIndices = new Set(
    days.map(id => WEEK_DAYS.find(d => d.id === id)?.dayIndex).filter((idx): idx is number => idx !== undefined)
  );

  const cursor = new Date(fromDate);
  cursor.setHours(12, 0, 0, 0); // avoid DST issues

  for (let offset = 0; offset < 7; offset++) {
    const checkDate = new Date(cursor);
    checkDate.setDate(cursor.getDate() + offset);
    const dayOfWeek = checkDate.getDay();

    if (targetDayIndices.has(dayOfWeek)) {
      const year = checkDate.getFullYear();
      const month = String(checkDate.getMonth() + 1).padStart(2, "0");
      const day = String(checkDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const dayObj = WEEK_DAYS.find(d => d.dayIndex === dayOfWeek);
      const dayName = dayObj?.name || "";

      const monthsEs = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const formatted = `${dayName} ${checkDate.getDate()} de ${monthsEs[checkDate.getMonth()]}`;

      return { dateStr, dayName, formatted, dayOffset: offset };
    }
  }

  return null;
}

/**
 * Verifica si una fecha específica (YYYY-MM-DD) es válida para un producto con días asignados.
 */
export function isDateValidForProduct(raw?: string | null, targetDateStr?: string | null): boolean {
  const days = parseAvailableDays(raw);
  if (days.length === 0) return true; // productos diarios son válidos cualquier día

  if (!targetDateStr) return false;

  const [year, month, day] = targetDateStr.split("-").map(Number);
  if (!year || !month || !day) return false;

  const date = new Date(year, month - 1, day, 12, 0, 0);
  const targetDayOfWeek = date.getDay();

  const allowedDayIndices = days
    .map(id => WEEK_DAYS.find(d => d.id === id)?.dayIndex)
    .filter((idx): idx is number => idx !== undefined);

  return allowedDayIndices.includes(targetDayOfWeek);
}

export interface CartScheduleGroup<T> {
  dateStr: string;
  dayName: string;
  formatted: string;
  dayOffset: number;
  items: T[];
  isImmediate: boolean;
  isTomorrow: boolean;
}

/**
 * Agrupa los ítems del carrito según la fecha de entrega que les corresponde en la semana.
 */
export function groupCartItemsByDeliveryDate<T extends { product: { availableDays?: string | null; name: string } }>(
  items: T[],
  defaultDateStr?: string | null,
  orderType: "IMMEDIATE" | "SCHEDULED_TOMORROW" | "CUSTOM_DATE" = "IMMEDIATE"
): CartScheduleGroup<T>[] {
  const groupsMap = new Map<string, CartScheduleGroup<T>>();

  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formatIsoDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatIsoDate(now);
  const tomorrowStr = formatIsoDate(tomorrow);

  const monthsEs = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  for (const item of items) {
    let targetDateStr: string;
    let dayName: string;
    let formatted: string;
    let dayOffset: number = 0;

    if (!isDailyProduct(item.product.availableDays)) {
      const nextDate = getNextAvailableDate(item.product.availableDays, now);
      if (nextDate) {
        targetDateStr = nextDate.dateStr;
        dayName = nextDate.dayName;
        formatted = nextDate.formatted;
        dayOffset = nextDate.dayOffset;
      } else {
        targetDateStr = todayStr;
        dayName = "Hoy";
        formatted = "Hoy";
      }
    } else {
      // Ítems diarios
      if (orderType === "IMMEDIATE") {
        targetDateStr = todayStr;
        dayName = "Hoy";
        formatted = `Hoy ${now.getDate()} de ${monthsEs[now.getMonth()]}`;
        dayOffset = 0;
      } else if (orderType === "SCHEDULED_TOMORROW") {
        targetDateStr = tomorrowStr;
        dayName = "Mañana";
        formatted = `Mañana ${tomorrow.getDate()} de ${monthsEs[tomorrow.getMonth()]}`;
        dayOffset = 1;
      } else if (defaultDateStr) {
        targetDateStr = defaultDateStr;
        const [y, m, d] = defaultDateStr.split("-").map(Number);
        const parsed = new Date(y, m - 1, d, 12, 0, 0);
        const dayObj = WEEK_DAYS.find(w => w.dayIndex === parsed.getDay());
        dayName = dayObj?.name || "";
        formatted = `${dayName} ${d} de ${monthsEs[m - 1]}`;
      } else {
        targetDateStr = todayStr;
        dayName = "Hoy";
        formatted = "Hoy";
      }
    }

    if (!groupsMap.has(targetDateStr)) {
      groupsMap.set(targetDateStr, {
        dateStr: targetDateStr,
        dayName,
        formatted,
        dayOffset,
        items: [],
        isImmediate: targetDateStr === todayStr && orderType === "IMMEDIATE",
        isTomorrow: targetDateStr === tomorrowStr,
      });
    }

    groupsMap.get(targetDateStr)!.items.push(item);
  }

  return Array.from(groupsMap.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

/**
 * Inspecciona una lista de productos del carrito y devuelve el análisis de días programados.
 */
export function analyzeCartSchedule(items: { product: { availableDays?: string | null; name: string } }[]): {
  hasScheduledProducts: boolean;
  hasDailyProducts: boolean;
  isMixedCart: boolean;
  isMultiDaySchedule: boolean;
  scheduledDays: WeekDayId[];
  distinctDatesCount: number;
  groups: CartScheduleGroup<{ product: { availableDays?: string | null; name: string } }>[];
  targetDateInfo: { dateStr: string; dayName: string; formatted: string; dayOffset: number } | null;
  scheduledProductNames: string[];
} {
  const scheduledItems = items.filter(i => !isDailyProduct(i.product.availableDays));
  const dailyItems = items.filter(i => isDailyProduct(i.product.availableDays));

  const hasScheduledProducts = scheduledItems.length > 0;
  const hasDailyProducts = dailyItems.length > 0;
  const isMixedCart = hasScheduledProducts && hasDailyProducts;

  const allScheduledDays = new Set<WeekDayId>();
  scheduledItems.forEach(i => {
    parseAvailableDays(i.product.availableDays).forEach(d => allScheduledDays.add(d));
  });

  const scheduledDays = Array.from(allScheduledDays);
  const groups = groupCartItemsByDeliveryDate(items);
  const distinctDatesCount = groups.length;
  const isMultiDaySchedule = distinctDatesCount > 1;

  const firstScheduledItem = scheduledItems[0];
  const targetDateInfo = firstScheduledItem ? getNextAvailableDate(firstScheduledItem.product.availableDays) : null;

  return {
    hasScheduledProducts,
    hasDailyProducts,
    isMixedCart,
    isMultiDaySchedule,
    scheduledDays,
    distinctDatesCount,
    groups,
    targetDateInfo,
    scheduledProductNames: scheduledItems.map(i => i.product.name),
  };
}

// Fechas como cadenas ISO "YYYY-MM-DD" para evitar problemas de zona horaria:
// los plazos administrativos se cuentan por días, no por instantes.

export type IsoDate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIso(date: IsoDate): Date {
  const m = ISO_RE.exec(date);
  if (!m) throw new Error(`Fecha no válida: ${date}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (toIso(d) !== date) throw new Error(`Fecha no válida: ${date}`);
  return d;
}

export function toIso(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  try {
    parseIso(value);
    return true;
  } catch {
    return false;
  }
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parseIso(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/**
 * Suma meses "de fecha a fecha": si el mes de destino no tiene ese día,
 * el plazo acaba el último día del mes (art. 30.4 Ley 39/2015, art. 279 CC PT).
 */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = parseIso(date);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return toIso(target);
}

/** 0 = domingo … 6 = sábado */
export function weekday(date: IsoDate): number {
  return parseIso(date).getUTCDay();
}

export function isWeekend(date: IsoDate): boolean {
  const w = weekday(date);
  return w === 0 || w === 6;
}

/** Días naturales desde `from` hasta `to` (negativo si `to` es anterior). */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / 86_400_000);
}

/** Domingo de Pascua (algoritmo anónimo gregoriano). */
export function easterSunday(year: number): IsoDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toIso(new Date(Date.UTC(year, month - 1, day)));
}

export function todayIso(now: Date = new Date()): IsoDate {
  // Fecha local del usuario, no UTC: a las 00:30 en Lisboa ya es "mañana".
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

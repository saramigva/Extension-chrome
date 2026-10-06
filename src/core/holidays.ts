import { addDays, easterSunday, isWeekend, type IsoDate } from "./dates";

export type Country = "ES" | "PT";

// Solo festivos nacionales. Los autonómicos (ES) y municipales (ES/PT) varían
// y NO se tienen en cuenta: la interfaz lo advierte al usuario.

function spainHolidays(year: number): IsoDate[] {
  const easter = easterSunday(year);
  return [
    `${year}-01-01`, // Año Nuevo
    `${year}-01-06`, // Epifanía
    addDays(easter, -2), // Viernes Santo
    `${year}-05-01`, // Fiesta del Trabajo
    `${year}-08-15`, // Asunción
    `${year}-10-12`, // Fiesta Nacional
    `${year}-11-01`, // Todos los Santos
    `${year}-12-06`, // Constitución
    `${year}-12-08`, // Inmaculada Concepción
    `${year}-12-25`, // Navidad
  ];
}

// Código do Trabalho, art. 234.º (feriados obrigatórios). Carnaval es facultativo.
function portugalHolidays(year: number): IsoDate[] {
  const easter = easterSunday(year);
  return [
    `${year}-01-01`, // Ano Novo
    addDays(easter, -2), // Sexta-feira Santa
    easter, // Domingo de Páscoa
    `${year}-04-25`, // Dia da Liberdade
    `${year}-05-01`, // Dia do Trabalhador
    addDays(easter, 60), // Corpo de Deus
    `${year}-06-10`, // Dia de Portugal
    `${year}-08-15`, // Assunção
    `${year}-10-05`, // Implantação da República
    `${year}-11-01`, // Todos os Santos
    `${year}-12-01`, // Restauração da Independência
    `${year}-12-08`, // Imaculada Conceição
    `${year}-12-25`, // Natal
  ];
}

const cache = new Map<string, Set<IsoDate>>();

export function nationalHolidays(country: Country, year: number): Set<IsoDate> {
  const key = `${country}-${year}`;
  let set = cache.get(key);
  if (!set) {
    set = new Set(country === "ES" ? spainHolidays(year) : portugalHolidays(year));
    cache.set(key, set);
  }
  return set;
}

export function isHoliday(country: Country, date: IsoDate): boolean {
  return nationalHolidays(country, Number(date.slice(0, 4))).has(date);
}

export function isBusinessDay(country: Country, date: IsoDate): boolean {
  return !isWeekend(date) && !isHoliday(country, date);
}

export function nextBusinessDay(country: Country, date: IsoDate): IsoDate {
  let d = addDays(date, 1);
  while (!isBusinessDay(country, d)) d = addDays(d, 1);
  return d;
}

/** Devuelve la propia fecha si es hábil, o el siguiente día hábil. */
export function sameOrNextBusinessDay(country: Country, date: IsoDate): IsoDate {
  return isBusinessDay(country, date) ? date : nextBusinessDay(country, date);
}

export function addBusinessDays(country: Country, date: IsoDate, days: number): IsoDate {
  let d = date;
  for (let i = 0; i < days; i++) d = nextBusinessDay(country, d);
  return d;
}

import { isIsoDate, type IsoDate } from "./dates";
import type { Country } from "./holidays";

// Detector heurístico: no conocemos el HTML exacto (y cambia sin aviso) de cada
// buzón, así que buscamos filas con fechas cerca de palabras clave. Nunca se
// guarda nada sin que el usuario lo confirme, y nunca se pulsa nada en la página.

export interface Candidate {
  title: string;
  availableOn: IsoDate;
  /** Texto de la fila, recortado, para que el usuario reconozca la notificación. */
  context: string;
}

const KEYWORDS: Record<Country, RegExp> = {
  ES: /notificaci[oó]n|comunicaci[oó]n|puesta a disposici[oó]n|requerimiento|providencia|liquidaci[oó]n|sanci[oó]n|resoluci[oó]n|pendiente/i,
  PT: /notifica[cç][aã]o|cita[cç][aã]o|disponibiliza[cç][aã]o|of[ií]cio|liquida[cç][aã]o|coima|penhora|pendente|data de envio/i,
};

const DATE_RES: Array<{ re: RegExp; toIso: (m: RegExpExecArray) => string }> = [
  { re: /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g, toIso: (m) => `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}` },
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/g, toIso: (m) => `${m[1]}-${m[2]}-${m[3]}` },
];

export function findDates(text: string): IsoDate[] {
  const out: IsoDate[] = [];
  for (const { re, toIso } of DATE_RES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const iso = toIso(m);
      if (isIsoDate(iso)) out.push(iso);
    }
  }
  return out;
}

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Como textContent, pero separando nodos: celdas contiguas no se pegan ("2026Caduca"). */
function textOf(node: Node): string {
  const doc = node.ownerDocument ?? (node as Document);
  const walker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push(n.nodeValue ?? "");
  return clean(parts.join(" "));
}

/**
 * Busca notificaciones en tablas y listas. Toma la fecha más antigua de cada fila
 * (suele ser la de puesta a disposición; las posteriores son caducidad o lectura):
 * criterio conservador, coherente con el resto del cálculo.
 */
export function detectCandidates(root: ParentNode, country: Country, today: IsoDate): Candidate[] {
  const rows = root.querySelectorAll("tr, li, [role='row']");
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const row of Array.from(rows)) {
    // Evita contar dos veces una fila que contiene listas anidadas.
    if (row.querySelector("tr, li, [role='row']")) continue;
    const text = textOf(row);
    if (text.length < 8 || text.length > 600 || !KEYWORDS[country].test(text)) continue;
    const dates = findDates(text).filter((d) => d <= today);
    if (dates.length === 0) continue;
    const availableOn = dates.sort()[0]!;
    const title = titleFrom(row, text);
    const key = `${availableOn}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, availableOn, context: text.slice(0, 200) });
  }
  return out;
}

function titleFrom(row: Element, text: string): string {
  const cells = Array.from(row.querySelectorAll("td, [role='cell'], a, span"))
    .map((c) => textOf(c))
    .filter((t) => t.length >= 4 && findDates(t).length === 0);
  const best = cells.sort((a, b) => b.length - a.length)[0] ?? text;
  return best.slice(0, 120);
}

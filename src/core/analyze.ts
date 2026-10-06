import { extractContacts, textOf, type Contacts, type Country } from "./contacts";
import { extractProfile, type Profile } from "./profile";
import { signalText, type Lang } from "./signals";

// Nota de "antigüedad" de una web a partir de señales objetivas del HTML.
// Los textos de cada señal viven en signals.ts (ES/PT).

export interface Signal {
  id: string;
  points: number;
  params?: Record<string, string | number>;
}

export interface Analysis {
  url: string;
  domain: string;
  name: string;
  country: Country | "?";
  score: number;
  verdict: "anticuada" | "mejorable" | "moderna";
  signals: Signal[];
  tech: string[];
  copyrightYear?: number;
  contacts: Contacts;
  profile: Profile;
  analyzedAt: string;
}

export interface PageExtras {
  /** Tiempo de carga medido en el navegador (ms), si se conoce. */
  loadMs?: number;
  now?: Date;
}

export function langOf(a: Pick<Analysis, "country">): Lang {
  return a.country === "PT" ? "pt" : "es";
}

/** Explicación larga de una señal (por defecto en español: el informe es para ti). */
export function explain(s: Signal, lang: Lang = "es"): string {
  return signalText(s.id, lang, s.params, "long");
}

function versionLt(v: string, major: number, minor = 0): boolean {
  const [a = 0, b = 0] = v.split(".").map((n) => parseInt(n, 10));
  return a < major || (a === major && b < minor);
}

export function detectTech(doc: Document, html: string): { tech: string[]; signals: Signal[] } {
  const tech: string[] = [];
  const signals: Signal[] = [];
  const generator = doc.querySelector('meta[name="generator" i]')?.getAttribute("content") ?? "";

  const wp = /WordPress\s*([\d.]+)?/i.exec(generator);
  if (wp || /\/wp-content\//.test(html)) {
    tech.push(wp?.[1] ? `WordPress ${wp[1]}` : "WordPress");
    if (wp?.[1] && versionLt(wp[1], 6)) signals.push({ id: "old-wordpress", points: 10, params: { v: wp[1] } });
  }
  const joomla = /Joomla!?\s*([\d.]+)?/i.exec(generator);
  if (joomla) {
    tech.push(joomla[1] ? `Joomla ${joomla[1]}` : "Joomla");
    if (joomla[1] && versionLt(joomla[1], 4)) signals.push({ id: "old-cms", points: 10, params: { cms: `Joomla ${joomla[1]}` } });
  }
  const drupal = /Drupal\s*([5-7])\b/i.exec(generator);
  if (drupal) {
    tech.push(`Drupal ${drupal[1]}`);
    signals.push({ id: "old-cms", points: 10, params: { cms: `Drupal ${drupal[1]}` } });
  }
  for (const [re, name] of [
    [/Wix\.com/i, "Wix"],
    [/Squarespace/i, "Squarespace"],
    [/Shopify/i, "Shopify"],
    [/PrestaShop/i, "PrestaShop"],
    [/Webflow/i, "Webflow"],
  ] as const) {
    if (re.test(generator) || re.test(html.slice(0, 50_000))) tech.push(name);
  }

  const jq = /jquery[.-]?(\d+\.\d+(?:\.\d+)?)(?:\.min)?\.js/i.exec(html) ?? /jQuery v(\d+\.\d+(?:\.\d+)?)/.exec(html);
  if (jq) {
    tech.push(`jQuery ${jq[1]}`);
    if (versionLt(jq[1]!, 3)) signals.push({ id: "old-jquery", points: 8, params: { v: jq[1]! } });
  }
  if (/google-analytics\.com\/(ga|urchin)\.js/.test(html)) signals.push({ id: "old-analytics", points: 5 });
  return { tech: [...new Set(tech)], signals };
}

export function copyrightYear(text: string, now = new Date().getFullYear()): number | undefined {
  const years: number[] = [];
  for (const m of text.matchAll(/(?:©|&copy;|\(c\)|copyright)\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi)) {
    const y = Number(m[1]);
    if (y <= now) years.push(y);
  }
  return years.length ? Math.max(...years) : undefined;
}

export function analyzeDocument(doc: Document, html: string, pageUrl: string, extras: PageExtras = {}): Analysis {
  const url = new URL(pageUrl);
  const year = (extras.now ?? new Date()).getFullYear();
  const signals: Signal[] = [];
  const add = (id: string, points: number, params?: Signal["params"]) => signals.push(params ? { id, points, params } : { id, points });

  if (url.protocol === "http:") add("no-https", 20);
  if (!doc.querySelector('meta[name="viewport" i]')) add("no-mobile", 20);

  const cYear = copyrightYear(textOf(doc.body), year);
  if (cYear !== undefined && year - cYear >= 6) add("stale-copyright", 15, { year: cYear });
  else if (cYear !== undefined && year - cYear >= 3) add("stale-copyright", 8, { year: cYear });

  if (doc.querySelector('frameset, frame, marquee, blink, applet, embed[src$=".swf" i], object[data$=".swf" i], param[value$=".swf" i]')) {
    add("obsolete-tags", 15);
  }
  // Tablas anidadas o varias con atributos de presentación: maquetación con tablas.
  // Una sola tabla de datos (precios, horarios) no cuenta.
  const presentational = Array.from(doc.querySelectorAll("table")).filter((t) =>
    ["width", "bgcolor", "cellpadding", "background"].some((a) => t.hasAttribute(a)),
  );
  if (doc.querySelector("table table") || presentational.length >= 2) add("table-layout", 10);
  if (doc.querySelectorAll("font, center").length >= 3) add("legacy-markup", 5);

  if (url.protocol === "https:" && /\b(src|href)=["']http:\/\/[^"']+\.(png|jpe?g|gif|css|js)/i.test(html)) add("mixed-content", 5);
  if (!doc.querySelector('meta[name="description" i]')?.getAttribute("content")?.trim()) add("no-description", 5);
  if (!doc.querySelector('meta[property^="og:" i]')) add("no-social-preview", 4);
  if (!doc.querySelector('link[rel~="icon" i]')) add("no-favicon", 3);
  if (extras.loadMs !== undefined && extras.loadMs > 4000) add("slow", 10, { secs: (extras.loadMs / 1000).toFixed(1) });

  const tech = detectTech(doc, html);
  signals.push(...tech.signals);
  signals.sort((a, b) => b.points - a.points);

  const score = Math.min(100, signals.reduce((s, x) => s + x.points, 0));
  const verdict = score >= 50 ? "anticuada" : score >= 25 ? "mejorable" : "moderna";

  const lang = (doc.documentElement.getAttribute("lang") ?? "").toLowerCase();
  const country = url.hostname.endsWith(".pt") || lang.startsWith("pt") ? "PT" : url.hostname.endsWith(".es") || lang.startsWith("es") ? "ES" : "?";

  const name = (
    doc.querySelector('meta[property="og:site_name" i]')?.getAttribute("content")?.trim() ||
    doc.title.split(/[|–—]| - /)[0]?.trim() ||
    url.hostname.replace(/^www\./, "")
  ).slice(0, 80);

  return {
    url: url.href,
    domain: url.hostname.replace(/^www\./, ""),
    name,
    country,
    score,
    verdict,
    signals,
    tech: tech.tech,
    copyrightYear: cYear,
    contacts: extractContacts(doc, pageUrl, country === "PT" ? "PT" : "ES"),
    profile: extractProfile(doc, pageUrl, name),
    analyzedAt: (extras.now ?? new Date()).toISOString(),
  };
}

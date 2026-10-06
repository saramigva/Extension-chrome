import { extractContacts, textOf, type Contacts, type Country } from "./contacts";

// Nota de "antigüedad" de una web a partir de señales objetivas del HTML.
// Cada señal lleva un texto pensado para usarlo como argumento de venta.

export interface Signal {
  id: string;
  points: number;
  /** Explicación para el cliente, en lenguaje no técnico. */
  pitch: string;
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
  analyzedAt: string;
}

export interface PageExtras {
  /** Tiempo de carga medido en el navegador (ms), si se conoce. */
  loadMs?: number;
  now?: Date;
}

const CURRENT_YEAR = () => new Date().getFullYear();

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
    if (wp?.[1] && versionLt(wp[1], 6)) {
      signals.push({ id: "old-wordpress", points: 10, pitch: `Usa WordPress ${wp[1]}, una versión sin soporte de seguridad: riesgo de hackeo.` });
    }
  }
  const joomla = /Joomla!?\s*([\d.]+)?/i.exec(generator);
  if (joomla) {
    tech.push(joomla[1] ? `Joomla ${joomla[1]}` : "Joomla");
    if (joomla[1] && versionLt(joomla[1], 4)) signals.push({ id: "old-joomla", points: 10, pitch: "Usa una versión de Joomla sin soporte de seguridad." });
  }
  if (/Drupal\s*[5-7]\b/i.test(generator)) {
    tech.push(generator);
    signals.push({ id: "old-drupal", points: 10, pitch: "Usa una versión de Drupal sin soporte de seguridad." });
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
    if (versionLt(jq[1]!, 3)) signals.push({ id: "old-jquery", points: 8, pitch: `Usa jQuery ${jq[1]}, una librería de hace más de 8 años con fallos de seguridad conocidos.` });
  }
  if (/google-analytics\.com\/(ga|urchin)\.js/.test(html)) {
    signals.push({ id: "old-analytics", points: 5, pitch: "Su analítica es un sistema antiguo de Google que ya no recoge datos: no saben cuántas visitas tienen." });
  }
  return { tech: [...new Set(tech)], signals };
}

export function copyrightYear(text: string, now = CURRENT_YEAR()): number | undefined {
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
  const add = (id: string, points: number, pitch: string) => signals.push({ id, points, pitch });

  if (url.protocol === "http:") add("no-https", 20, "No tiene candado (HTTPS): Chrome la marca como «No segura» y asusta a los clientes.");
  if (!doc.querySelector('meta[name="viewport" i]')) add("no-mobile", 20, "No está adaptada al móvil, desde donde llegan más de la mitad de las visitas; Google la posiciona peor.");

  const cYear = copyrightYear(textOf(doc.body), year);
  if (cYear !== undefined && year - cYear >= 6) add("stale-copyright", 15, `El pie de página dice © ${cYear}: parece abandonada.`);
  else if (cYear !== undefined && year - cYear >= 3) add("stale-copyright", 8, `El pie de página dice © ${cYear}: da imagen de poco cuidada.`);

  if (doc.querySelector('frameset, frame, marquee, blink, applet, embed[src$=".swf" i], object[data$=".swf" i], param[value$=".swf" i]')) {
    add("obsolete-tags", 15, "Usa elementos de los 2000 (Flash, marcos o textos animados) que los navegadores ya no muestran.");
  }
  // Tablas anidadas o varias con atributos de presentación: maquetación con tablas.
  // Una sola tabla de datos (precios, horarios) no cuenta.
  const tables = Array.from(doc.querySelectorAll("table"));
  const presentational = tables.filter((t) => ["width", "bgcolor", "cellpadding", "background"].some((a) => t.hasAttribute(a)));
  if (doc.querySelector("table table") || presentational.length >= 2) add("table-layout", 10, "Está maquetada con tablas, una técnica de hace 20 años que rompe el diseño en pantallas modernas.");
  if (doc.querySelectorAll("font, center").length >= 3) add("legacy-markup", 5, "Su código usa etiquetas obsoletas: difícil de mantener y de actualizar.");

  if (url.protocol === "https:" && /\b(src|href)=["']http:\/\/[^"']+\.(png|jpe?g|gif|css|js)/i.test(html)) {
    add("mixed-content", 5, "Carga imágenes o estilos sin cifrar: el navegador puede bloquearlos y la web se ve rota.");
  }
  if (!doc.querySelector('meta[name="description" i]')?.getAttribute("content")?.trim()) {
    add("no-description", 5, "No tiene descripción para Google: aparece en los resultados con un texto poco atractivo.");
  }
  if (!doc.querySelector('meta[property^="og:" i]')) {
    add("no-social-preview", 4, "Al compartirla por WhatsApp o redes no muestra imagen ni título.");
  }
  if (!doc.querySelector('link[rel~="icon" i]')) add("no-favicon", 3, "No tiene icono en la pestaña del navegador.");
  if (extras.loadMs !== undefined && extras.loadMs > 4000) {
    add("slow", 10, `Tarda ${(extras.loadMs / 1000).toFixed(1)} s en cargar: más de la mitad de la gente se va antes de 3 s.`);
  }

  const tech = detectTech(doc, html);
  signals.push(...tech.signals);
  signals.sort((a, b) => b.points - a.points);

  const score = Math.min(100, signals.reduce((s, x) => s + x.points, 0));
  const verdict = score >= 50 ? "anticuada" : score >= 25 ? "mejorable" : "moderna";

  const lang = (doc.documentElement.getAttribute("lang") ?? "").toLowerCase();
  const country = url.hostname.endsWith(".pt") || lang.startsWith("pt") ? "PT" : url.hostname.endsWith(".es") || lang.startsWith("es") ? "ES" : "?";

  const name =
    doc.querySelector('meta[property="og:site_name" i]')?.getAttribute("content")?.trim() ||
    doc.title.split(/[|–—-]/)[0]?.trim() ||
    url.hostname.replace(/^www\./, "");

  const contacts = extractContacts(doc, pageUrl, country === "PT" ? "PT" : "ES");

  return {
    url: url.href,
    domain: url.hostname.replace(/^www\./, ""),
    name: name.slice(0, 80),
    country,
    score,
    verdict,
    signals,
    tech: tech.tech,
    copyrightYear: cYear,
    contacts,
    analyzedAt: (extras.now ?? new Date()).toISOString(),
  };
}

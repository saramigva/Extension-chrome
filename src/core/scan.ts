import { analyzeDocument, type Analysis } from "./analyze";
import { extractContacts, mergeContacts } from "./contacts";

const MAX_CONTACT_PAGES = 2;
const FETCH_TIMEOUT_MS = 15_000;

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function enrich(analysis: Analysis, pages: Array<{ url: string; html: string }>): Analysis {
  let contacts = analysis.contacts;
  const country = analysis.country === "PT" ? "PT" : "ES";
  for (const p of pages) contacts = mergeContacts(contacts, extractContacts(parse(p.html), p.url, country));
  return { ...analysis, contacts };
}

// Se ejecuta DENTRO de la pestaña (chrome.scripting): debe ser autocontenida.
function captureInPage(): { html: string; url: string; loadMs?: number } {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return {
    html: document.documentElement.outerHTML,
    url: location.href,
    loadMs: nav && nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd) : undefined,
  };
}

// También dentro de la pestaña: mismo origen, así que no necesita permisos extra.
async function fetchInPage(urls: string[]): Promise<Array<{ url: string; html: string }>> {
  const out: Array<{ url: string; html: string }> = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { credentials: "omit" });
      if (res.ok && (res.headers.get("content-type") ?? "").includes("html")) out.push({ url: res.url, html: await res.text() });
    } catch {
      // Página de contacto inaccesible: seguimos con lo que haya.
    }
  }
  return out;
}

/** Analiza la pestaña activa (permiso activeTab: solo cuando el usuario pulsa el botón). */
export async function scanTab(tabId: number): Promise<Analysis> {
  const [first] = await chrome.scripting.executeScript({ target: { tabId }, func: captureInPage });
  const page = first?.result;
  if (!page) throw new Error("No se ha podido leer la página.");
  if (!/^https?:/.test(page.url)) throw new Error("Solo se pueden analizar páginas web (http/https).");
  const analysis = analyzeDocument(parse(page.html), page.html, page.url, { loadMs: page.loadMs });
  const urls = analysis.contacts.contactPages.slice(0, MAX_CONTACT_PAGES);
  if (urls.length === 0) return analysis;
  const [second] = await chrome.scripting.executeScript({ target: { tabId }, func: fetchInPage, args: [urls] });
  return enrich(analysis, second?.result ?? []);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctrl.signal, credentials: "omit", redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

/** Normaliza lo que pega el usuario ("dominio.es", "www.x.pt/…") a una URL. */
export function toUrl(input: string): string | null {
  const s = input.trim();
  if (!s || s.startsWith("#")) return null;
  try {
    // Sin esquema probamos HTTPS primero; scanUrl recurre a HTTP si falla.
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!u.hostname.includes(".")) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Analiza una URL desde la extensión (análisis en lote; requiere permiso de hosts). */
export async function scanUrl(url: string): Promise<Analysis> {
  let t0 = performance.now();
  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (err) {
    // Sin HTTPS (certificado inválido o puerto cerrado): la web solo funciona por HTTP.
    if (!url.startsWith("https://")) throw err;
    url = "http://" + url.slice("https://".length);
    t0 = performance.now();
    res = await fetchWithTimeout(url);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  // Solo medimos la descarga del HTML (sin imágenes ni scripts): si eso ya pasa
  // de 4 s, la carga real es aún más lenta, así que es seguro marcarla.
  const htmlMs = Math.round(performance.now() - t0);
  // res.url es la URL final tras redirecciones (p. ej. http → https).
  const analysis = analyzeDocument(parse(html), html, res.url || url, { loadMs: htmlMs > 4000 ? htmlMs : undefined });
  const pages: Array<{ url: string; html: string }> = [];
  for (const u of analysis.contacts.contactPages.slice(0, MAX_CONTACT_PAGES)) {
    try {
      const r = await fetchWithTimeout(u);
      if (r.ok) pages.push({ url: r.url, html: await r.text() });
    } catch {
      // ignorar
    }
  }
  return enrich(analysis, pages);
}

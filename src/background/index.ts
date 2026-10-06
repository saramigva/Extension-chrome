import type { Analysis } from "../core/analyze";
import { saveLead, type Lead } from "../core/leads";
import { SKIP_HOSTS, type Message, type Summary } from "../core/messages";
import { loadSettings } from "../core/settings";
import { enqueue, runHunt } from "./hunt";

const CACHE_KEY = "summaries";
const CACHE_TTL = 7 * 24 * 3600 * 1000;
const MAX_PARALLEL = 3;

const COLORS: Record<Analysis["verdict"], string> = { anticuada: "#d92d20", mejorable: "#dc6803", moderna: "#079455" };

const HUNT_ALARM = "radar-hunt";

chrome.runtime.onInstalled.addListener((details) => {
  void chrome.alarms.create(HUNT_ALARM, { periodInMinutes: 30, delayInMinutes: 1 });
  // Primera instalación: abrir los ajustes para elegir zona y sectores.
  if (details.reason === "install") void chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(() => void chrome.alarms.create(HUNT_ALARM, { periodInMinutes: 30, delayInMinutes: 1 }));
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === HUNT_ALARM) void hunt();
});

function hunt(): Promise<void> {
  return runHunt(analyzeInOffscreen, notifyFound);
}

let soon: ReturnType<typeof setTimeout> | undefined;
/** Lanza el radar en unos segundos (agrupa varios resultados de una misma búsqueda). */
function huntSoon(): void {
  clearTimeout(soon);
  soon = setTimeout(() => void hunt(), 5000);
}

async function analyzeInOffscreen(url: string): Promise<Analysis | null> {
  return slot(async () => {
    await ensureOffscreen();
    return (await chrome.runtime.sendMessage({ type: "offscreen-analyze", target: "offscreen", url } satisfies Message)) as Analysis | null;
  });
}

async function notifyFound(leads: Lead[]): Promise<void> {
  const zones = [...new Set(leads.map((l) => l.zone).filter(Boolean))];
  await chrome.notifications.create(`radar-${Date.now()}`, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: `Radar: ${leads.length} ${leads.length === 1 ? "web anticuada nueva" : "webs anticuadas nuevas"}${zones.length ? ` en ${zones.join(", ")}` : ""}`,
    message: leads
      .slice(0, 4)
      .map((l) => `${l.name} (${l.score})`)
      .join(" · "),
    priority: 1,
  });
}

chrome.notifications.onClicked.addListener((id) => {
  if (!id.startsWith("radar-")) return;
  void chrome.tabs.create({ url: chrome.runtime.getURL("leads.html?nuevos=1") });
  void chrome.notifications.clear(id);
});

chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  switch (msg.type) {
    case "collect":
      void collect(msg.analysis);
      return false;
    case "hunt-now":
      hunt().then(() => sendResponse(true), () => sendResponse(false));
      return true;
    case "analysis":
      if (sender.tab?.id !== undefined) void setBadge(sender.tab.id, msg.analysis);
      return false;
    case "save-lead":
      saveLead(msg.analysis).then(() => sendResponse({ ok: true }), (e: unknown) => sendResponse({ error: String(e) }));
      return true;
    case "demo":
      openDemo(msg.analysis, msg.shot !== false, msg.tabId ?? sender.tab?.id, sender.tab?.windowId).then(
        () => sendResponse({ ok: true }),
        (e: unknown) => sendResponse({ error: String(e) }),
      );
      return true;
    case "summarize":
      summarizeUrl(msg.url).then(sendResponse, () => sendResponse(null));
      return true;
    default:
      return false;
  }
});

async function setBadge(tabId: number, a: Analysis): Promise<void> {
  await chrome.action.setBadgeText({ tabId, text: String(a.score) });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: COLORS[a.verdict] });
  await chrome.action.setTitle({ tabId, title: `Radar de webs: ${a.score}/100 · web ${a.verdict}` });
}

/** Captura la web actual (el "antes") y abre la demo con la versión renovada. */
async function openDemo(a: Analysis, capture: boolean, tabId?: number, windowId?: number): Promise<void> {
  const prev = (await chrome.storage.local.get(`demo:${a.domain}`))[`demo:${a.domain}`] as { shot?: string } | undefined;
  let shot = prev?.shot;
  try {
    if (!capture) throw new Error("sin captura");
    if (tabId !== undefined) {
      const tab = await chrome.tabs.get(tabId);
      windowId = tab.windowId;
    }
    shot = await chrome.tabs.captureVisibleTab(windowId ?? chrome.windows.WINDOW_ID_CURRENT, { format: "jpeg", quality: 70 });
  } catch {
    // Sin captura (p. ej. pestaña no visible): la demo muestra un enlace a la web actual.
  }
  await chrome.storage.local.set({ [`demo:${a.domain}`]: { analysis: a, shot } });
  await chrome.tabs.create({ url: chrome.runtime.getURL(`demo.html?d=${encodeURIComponent(a.domain)}`) });
}

// --- Etiquetas en Google: análisis ligero en un documento offscreen (tiene DOMParser) ---

let creating: Promise<void> | null = null;
async function ensureOffscreen(): Promise<void> {
  const url = chrome.runtime.getURL("offscreen.html");
  const existing = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT], documentUrls: [url] });
  if (existing.length) return;
  creating ??= chrome.offscreen
    .createDocument({ url: "offscreen.html", reasons: [chrome.offscreen.Reason.DOM_PARSER], justification: "Analizar el HTML de las webs de los resultados de búsqueda" })
    .finally(() => (creating = null));
  await creating;
}

let running = 0;
const waiting: Array<() => void> = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

/** Webs anticuadas que visitas: directas a la bandeja (sin notificación: ya la estás viendo). */
async function collect(a: Analysis): Promise<void> {
  const s = await loadSettings();
  if (!s.collectWhileBrowsing || a.score < s.threshold || SKIP_HOSTS.test(a.domain)) return;
  await saveLead(a, { source: "visita" });
}

/** Resultados de Google con nota alta: a la cola para el análisis completo y aviso. */
async function collectFromSearch(url: string, summary: Summary): Promise<void> {
  const s = await loadSettings();
  if (!s.collectWhileBrowsing || summary.score < s.threshold) return;
  const added = await enqueue(
    [{ key: `google/${summary.domain}`, name: summary.domain, website: url, domain: summary.domain, zone: "", phones: [], emails: [] }],
    "google",
  );
  if (added) huntSoon();
}

async function summarizeUrl(url: string): Promise<Summary | null> {
  const domain = new URL(url).hostname.replace(/^www\./, "");
  const cache = ((await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY] as Record<string, Summary> | undefined) ?? {};
  const hit = cache[domain];
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    void collectFromSearch(url, hit);
    return hit;
  }
  const summary = await slot(async () => {
    await ensureOffscreen();
    return (await chrome.runtime.sendMessage({ type: "offscreen-scan", target: "offscreen", url } satisfies Message)) as Summary | null;
  });
  if (summary) {
    const fresh = ((await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY] as Record<string, Summary> | undefined) ?? {};
    fresh[domain] = summary;
    await chrome.storage.local.set({ [CACHE_KEY]: fresh });
    void collectFromSearch(url, summary);
  }
  return summary;
}

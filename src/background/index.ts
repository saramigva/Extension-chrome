import type { Analysis } from "../core/analyze";
import { saveLead } from "../core/leads";
import type { Message, Summary } from "../core/messages";

const CACHE_KEY = "summaries";
const CACHE_TTL = 7 * 24 * 3600 * 1000;
const MAX_PARALLEL = 3;

const COLORS: Record<Analysis["verdict"], string> = { anticuada: "#d92d20", mejorable: "#dc6803", moderna: "#079455" };

chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  switch (msg.type) {
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

async function summarizeUrl(url: string): Promise<Summary | null> {
  const domain = new URL(url).hostname.replace(/^www\./, "");
  const cache = ((await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY] as Record<string, Summary> | undefined) ?? {};
  const hit = cache[domain];
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit;
  const summary = await slot(async () => {
    await ensureOffscreen();
    return (await chrome.runtime.sendMessage({ type: "offscreen-scan", target: "offscreen", url } satisfies Message)) as Summary | null;
  });
  if (summary) {
    const fresh = ((await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY] as Record<string, Summary> | undefined) ?? {};
    fresh[domain] = summary;
    await chrome.storage.local.set({ [CACHE_KEY]: fresh });
  }
  return summary;
}

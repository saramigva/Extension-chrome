import { analyzeDocument, type Analysis } from "../core/analyze";
import { SKIP_HOSTS, type Message } from "../core/messages";
import { enrich } from "../core/scan";
import { loadSettings } from "../core/settings";
import { el } from "../ui/dom";
import { renderReport } from "../ui/report";
import reportCss from "../ui/report.css";

// Analiza cada web al abrirla (todo en local) y, si es mejorable, muestra un
// panel flotante. Nunca rellena ni pulsa nada en la página.

const MAX_HTML = 1_500_000;
const PANEL_CSS = `
:host { all: initial; }
.chip { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 999px; border: 0; cursor: pointer; color: #fff; font: 600 13px/1 system-ui, sans-serif;
  box-shadow: 0 6px 20px rgb(16 24 40 / .25); }
.chip.anticuada { background: #d92d20; } .chip.mejorable { background: #dc6803; }
.chip .x { opacity: .8; padding-left: 6px; font-weight: 400; }
.panel { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: 380px; max-height: calc(100vh - 32px); overflow: auto;
  border-radius: 12px; box-shadow: 0 12px 40px rgb(16 24 40 / .3); padding: 12px; background: #fff; }
@media (prefers-color-scheme: dark) { .panel { background: #161b26; } }
.top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font: 600 14px system-ui, sans-serif; }
.top button { background: none; border: 0; font-size: 18px; cursor: pointer; color: #667085; }
`;

let analysis: Analysis | null = null;
let panelHost: HTMLElement | null = null;

/** Oculta el panel mientras se captura la pantalla para la demo (el "antes" debe ser la web limpia). */
async function setHidden(hidden: boolean): Promise<void> {
  if (!panelHost) return;
  panelHost.style.display = hidden ? "none" : "";
  if (hidden) await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 120)));
}
let enriched: Promise<Analysis> | null = null;

function analyzeNow(): Analysis {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const html = document.documentElement.outerHTML.slice(0, MAX_HTML);
  return analyzeDocument(document, html, location.href, { loadMs: nav && nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd) : undefined });
}

/** Añade los contactos de la página de contacto (mismo origen: sin permisos extra). */
function withContactPages(a: Analysis): Promise<Analysis> {
  enriched ??= (async () => {
    const pages: Array<{ url: string; html: string }> = [];
    for (const url of a.contacts.contactPages.slice(0, 2)) {
      try {
        const res = await fetch(url, { credentials: "omit" });
        if (res.ok) pages.push({ url: res.url, html: await res.text() });
      } catch {
        // ignorar
      }
    }
    return enrich(a, pages);
  })();
  return enriched;
}

function send(msg: Message): Promise<unknown> {
  return chrome.runtime.sendMessage(msg);
}

async function showPanel(a: Analysis, open: boolean): Promise<void> {
  const settings = await loadSettings();
  const host = el("radar-webs-root" as "div");
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.append(el("style", { textContent: reportCss + PANEL_CSS }));
  document.documentElement.append(host);
  panelHost = host;

  const chip = el("button", { className: `chip ${a.verdict}`, title: "Radar de webs: ver detalles" }, `Radar ${a.score} · web ${a.verdict}`);
  const close = el("span", { className: "x", title: "Ocultar" }, "✕");
  chip.append(close);
  close.onclick = (e) => {
    e.stopPropagation();
    host.remove();
  };

  const expand = async () => {
    const full = await withContactPages(a);
    const hide = el("button", { title: "Minimizar", textContent: "–" });
    const panel = el(
      "div",
      { className: "panel rw" },
      el("div", { className: "top" }, el("span", {}, "Radar de webs"), hide),
      renderReport(full, settings, {
        save: async () => void (await send({ type: "save-lead", analysis: full })),
        demo: async () => {
          await setHidden(true);
          try {
            await send({ type: "demo", analysis: full });
          } finally {
            await setHidden(false);
          }
        },
      }),
    );
    hide.onclick = () => panel.replaceWith(chip);
    chip.replaceWith(panel);
    if (!panel.isConnected) shadow.append(panel);
  };
  chip.onclick = () => void expand();
  shadow.append(chip);
  if (open) await expand();
}

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  if (msg.type === "hide-panel") {
    setHidden(msg.hidden).then(() => sendResponse(true));
    return true;
  }
  if (msg.type !== "get-analysis") return false;
  analysis ??= analyzeNow();
  withContactPages(analysis).then(sendResponse, () => sendResponse(analysis));
  return true;
});

async function main(): Promise<void> {
  if (window.top !== window || !/^https?:$/.test(location.protocol)) return;
  analysis = analyzeNow();
  await send({ type: "analysis", analysis });
  const settings = await loadSettings();
  if (settings.autoPanel && analysis.score >= settings.threshold && !SKIP_HOSTS.test(location.hostname)) {
    await showPanel(analysis, false);
  }
}

// Espera a que termine la carga para medir el tiempo y ver la página completa.
if (document.readyState === "complete") void main();
else window.addEventListener("load", () => setTimeout(() => void main(), 300), { once: true });

import { langOf, explain, type Analysis } from "../core/analyze";
import { aiAvailable, aiRewrite } from "../core/ai";
import { saveLead } from "../core/leads";
import type { Message } from "../core/messages";
import { scanTab } from "../core/scan";
import { loadSettings } from "../core/settings";
import { el } from "../ui/dom";
import { renderReport, type ReportActions } from "../ui/report";

const out = document.querySelector<HTMLElement>("#out")!;

async function getAnalysis(tabId: number): Promise<Analysis> {
  try {
    // El análisis ya hecho por la página (incluye su página de contacto).
    const a = (await chrome.tabs.sendMessage(tabId, { type: "get-analysis" } satisfies Message)) as Analysis | undefined;
    if (a) return a;
  } catch {
    // Pestaña abierta antes de instalar la extensión: la analizamos ahora.
  }
  return scanTab(tabId);
}

async function main(): Promise<void> {
  // ?tab=<id> permite abrir el popup como página para depurar otra pestaña.
  const forced = Number(new URLSearchParams(location.search).get("tab"));
  const tabId = forced || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
  if (!tabId) throw new Error("No hay pestaña activa.");
  const [a, settings, ai] = await Promise.all([getAnalysis(tabId), loadSettings(), aiAvailable()]);
  const actions: ReportActions = {
    save: async () => void (await saveLead(a)),
    demo: async () => {
      await chrome.tabs.sendMessage(tabId, { type: "hide-panel", hidden: true } satisfies Message).catch(() => undefined);
      await chrome.runtime.sendMessage({ type: "demo", analysis: a, tabId } satisfies Message);
      await chrome.tabs.sendMessage(tabId, { type: "hide-panel", hidden: false } satisfies Message).catch(() => undefined);
      window.close();
    },
  };
  // Gemini Nano no escribe en portugués: la IA solo se ofrece para webs en español.
  if (ai && langOf(a) === "es") {
    actions.rewrite = (d) =>
      aiRewrite(
        d.body,
        [`Negocio: ${a.name} (${a.domain})`, `Tipo: ${a.profile.type}`, ...a.signals.slice(0, 3).map((s) => explain(s))],
        d.channel === "whatsapp" ? "whatsapp" : "email",
      );
  }
  out.replaceChildren(renderReport(a, settings, actions));
}

main().catch((err: unknown) => {
  out.replaceChildren(el("p", { className: "error" }, err instanceof Error ? err.message : String(err)));
});

import { deleteLead, loadLeads, saveLead, STATUSES, toCsv, updateLead, type Lead, type LeadStatus } from "../core/leads";
import { explain } from "../core/analyze";
import type { Message } from "../core/messages";
import { scanUrl, toUrl } from "../core/scan";
import { loadSettings } from "../core/settings";
import { download, el } from "../ui/dom";

const rows = document.querySelector<HTMLTableSectionElement>("#rows")!;
const empty = document.querySelector<HTMLElement>("#empty")!;
const filter = document.querySelector<HTMLSelectElement>("#filter")!;
const bulk = document.querySelector<HTMLTextAreaElement>("#bulk")!;
const bulkRun = document.querySelector<HTMLButtonElement>("#bulk-run")!;
const bulkStatus = document.querySelector<HTMLElement>("#bulk-status")!;

for (const s of STATUSES) filter.append(new Option(s, s));
if (new URLSearchParams(location.search).has("nuevos")) filter.value = "nuevo";
filter.onchange = () => void render();

const SOURCE_LABEL: Record<string, string> = { radar: "Radar", google: "Google", visita: "Visitada", manual: "Manual" };

async function renderRadar(): Promise<void> {
  const [settings, data] = await Promise.all([loadSettings(), chrome.storage.local.get("hunt:stats")]);
  const st = data["hunt:stats"] as { day: string; scanned: number; found: number } | undefined;
  const today = st?.day === new Date().toISOString().slice(0, 10) ? st : undefined;
  const box = document.querySelector<HTMLElement>("#radar")!;
  if (!settings.hunt || settings.zones.length === 0) {
    box.replaceChildren("Radar automático apagado · ", el("a", { href: "options.html" }, "Actívalo eligiendo zona y sectores"));
    return;
  }
  box.textContent = `Radar activo en ${settings.zones.join(", ")} · hoy ${today?.scanned ?? 0} webs revisadas, ${today?.found ?? 0} leads nuevos`;
}

function row(l: Lead): HTMLTableRowElement {
  const status = el("select");
  for (const s of STATUSES) status.append(new Option(s, s, false, s === l.status));
  status.onchange = () => void updateLead(l.domain, { status: status.value as LeadStatus });

  const notes = el("input", { value: l.notes, placeholder: "Llamé el lunes…" });
  notes.onchange = () => void updateLead(l.domain, { notes: notes.value });

  const demo = el("button", { textContent: "Demo" });
  demo.onclick = () => void chrome.runtime.sendMessage({ type: "demo", analysis: l, shot: false } satisfies Message);

  const del = el("button", { textContent: "Borrar" });
  del.onclick = async () => {
    if (!confirm(`¿Borrar ${l.domain}?`)) return;
    await deleteLead(l.domain);
    await render();
  };

  const contact = el(
    "ul",
    { className: "list" },
    ...l.contacts.emails.map((e) => el("li", {}, e)),
    ...l.contacts.phones.map((p) => el("li", {}, el("a", { href: `tel:${p}` }, p))),
    ...Object.entries(l.contacts.socials).map(([n, u]) => el("li", {}, el("a", { href: u, target: "_blank", rel: "noopener" }, n))),
    ...(l.contacts.hasContactForm ? [el("li", { className: "muted" }, "formulario")] : []),
  );

  return el(
    "tr",
    {},
    el("td", {}, el("strong", {}, l.name), el("br"), el("a", { href: l.url, target: "_blank", rel: "noopener" }, l.domain), el("div", { className: "muted small" }, `${l.country} · ${l.analyzedAt.slice(0, 10)}`)),
    el("td", { className: "small" }, SOURCE_LABEL[l.source ?? "manual"] ?? "", l.zone ? el("div", { className: "muted" }, l.zone) : ""),
    el("td", { className: "num" }, el("span", { className: `tag ${l.verdict}` }, String(l.score))),
    el("td", {}, el("ul", { className: "list" }, ...l.signals.slice(0, 3).map((s) => el("li", {}, explain(s))))),
    el("td", {}, contact),
    el("td", {}, status),
    el("td", {}, notes),
    el("td", {}, el("div", { className: "row" }, demo, del)),
  );
}

async function render(): Promise<void> {
  void renderRadar();
  const all = await loadLeads();
  const shown = filter.value ? all.filter((l) => l.status === filter.value) : all;
  rows.replaceChildren(...shown.map(row));
  empty.hidden = all.length > 0;
}

document.querySelector<HTMLButtonElement>("#csv")!.onclick = async () => {
  const leads = (await loadLeads()).filter((l) => !filter.value || l.status === filter.value);
  download(`leads-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(leads), "text/csv;charset=utf-8");
};

bulkRun.onclick = async () => {
  const urls = [...new Set(bulk.value.split(/\r?\n/).map(toUrl).filter((u): u is string => u !== null))];
  if (urls.length === 0) return;
  // Permiso opcional: solo se pide al usar el análisis en lote.
  const granted = await chrome.permissions.request({ origins: ["http://*/*", "https://*/*"] });
  if (!granted) {
    bulkStatus.textContent = "Sin permiso no se pueden descargar las webs.";
    return;
  }
  bulkRun.disabled = true;
  let done = 0;
  const failed: string[] = [];
  const queue = [...urls];
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      try {
        await saveLead(await scanUrl(url), { source: "manual" });
      } catch {
        failed.push(url);
      }
      done++;
      bulkStatus.textContent = `${done}/${urls.length} analizadas${failed.length ? ` · ${failed.length} sin respuesta` : ""}`;
      await render();
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  bulkRun.disabled = false;
  if (failed.length) bulkStatus.textContent += `: ${failed.map((u) => new URL(u).hostname).join(", ")}`;
};

chrome.storage.onChanged.addListener((_c, area) => {
  if (area === "local") void render();
});

void render();

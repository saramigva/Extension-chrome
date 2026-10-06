import type { Message } from "../core/messages";
import { SECTOR_LABELS, type Sector } from "../core/osm";
import { loadSettings, saveSettings, type Settings } from "../core/settings";
import { el } from "../ui/dom";

const form = document.querySelector<HTMLFormElement>("#form")!;
const status = document.querySelector<HTMLElement>("#status")!;
const statsBox = document.querySelector<HTMLElement>("#stats")!;
const sectorsBox = document.querySelector<HTMLElement>("#sectors")!;
const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;

for (const [id, label] of Object.entries(SECTOR_LABELS)) {
  sectorsBox.append(el("label", { className: "check" }, el("input", { type: "checkbox", name: "sector", value: id }), label));
}

async function showStats(): Promise<void> {
  const data = await chrome.storage.local.get(["hunt:stats", "hunt:queue"]);
  const st = data["hunt:stats"] as { day: string; scanned: number; found: number; lastRun?: string; lastError?: string } | undefined;
  const queue = Object.values((data["hunt:queue"] as Record<string, { state: string }> | undefined) ?? {});
  const isToday = st?.day === new Date().toISOString().slice(0, 10);
  const parts = [
    `Hoy: ${isToday ? st!.scanned : 0} webs revisadas, ${isToday ? st!.found : 0} leads nuevos.`,
    `Pendientes de revisar: ${queue.filter((q) => q.state === "pending").length}.`,
    st?.lastRun ? `Última búsqueda: ${new Date(st.lastRun).toLocaleString()}.` : "Aún no ha buscado.",
  ];
  statsBox.replaceChildren(el("div", {}, parts.join(" ")), ...(st?.lastError ? [el("div", { className: "error" }, `Último error: ${st.lastError}`)] : []));
}

async function fill(): Promise<void> {
  const s = await loadSettings();
  for (const k of ["senderName", "senderRole", "senderPhone", "senderWeb"] as const) field(k).value = s[k];
  for (const k of ["autoPanel", "serpBadges", "collectWhileBrowsing", "hunt", "notify"] as const) field(k).checked = s[k];
  field("threshold").value = String(s.threshold);
  field("dailyLimit").value = String(s.dailyLimit);
  field("zones").value = s.zones.join(", ");
  for (const box of Array.from(sectorsBox.querySelectorAll<HTMLInputElement>("input"))) box.checked = s.sectors.includes(box.value as Sector);
}

function read(): Settings {
  const num = (k: string, min: number, max: number, def: number) => Math.min(max, Math.max(min, Number(field(k).value) || def));
  return {
    senderName: field("senderName").value.trim(),
    senderRole: field("senderRole").value.trim(),
    senderPhone: field("senderPhone").value.trim(),
    senderWeb: field("senderWeb").value.trim(),
    autoPanel: field("autoPanel").checked,
    serpBadges: field("serpBadges").checked,
    collectWhileBrowsing: field("collectWhileBrowsing").checked,
    hunt: field("hunt").checked,
    notify: field("notify").checked,
    threshold: num("threshold", 0, 100, 40),
    dailyLimit: num("dailyLimit", 5, 200, 40),
    zones: field("zones").value.split(",").map((z) => z.trim()).filter(Boolean),
    sectors: Array.from(sectorsBox.querySelectorAll<HTMLInputElement>("input:checked")).map((b) => b.value as Sector),
  };
}

form.onsubmit = async (e) => {
  e.preventDefault();
  await saveSettings(read());
  status.textContent = "Guardado ✓";
  setTimeout(() => (status.textContent = ""), 1500);
};

document.querySelector<HTMLButtonElement>("#now")!.onclick = async (e) => {
  const btn = e.currentTarget as HTMLButtonElement;
  await saveSettings(read());
  btn.disabled = true;
  btn.textContent = "Buscando…";
  await chrome.runtime.sendMessage({ type: "hunt-now" } satisfies Message);
  btn.disabled = false;
  btn.textContent = "Buscar ahora";
  await showStats();
};

chrome.storage.onChanged.addListener(() => void showStats());
void fill().then(showStats);

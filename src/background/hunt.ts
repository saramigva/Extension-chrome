import type { Analysis } from "../core/analyze";
import { mergeContacts } from "../core/contacts";
import { hasLead, saveLead, type Lead, type LeadSource } from "../core/leads";
import { areaIdFromNominatim, buildOverpassQuery, parseOverpass, type Candidate, type Sector } from "../core/osm";
import { loadSettings } from "../core/settings";

// Radar automático: cada 30 min, sin que hagas nada.
// 1) Si hace más de 7 días, pide a OpenStreetMap los negocios con web de tus zonas y sectores.
// 2) Revisa unas pocas webs pendientes (con límite diario) y guarda las anticuadas.
// 3) Te avisa con una notificación cuando hay leads nuevos.

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const REFRESH_MS = 7 * 24 * 3600 * 1000;
const PER_RUN = 6;
const K = { areas: "hunt:areas", queue: "hunt:queue", refreshed: "hunt:refreshed", stats: "hunt:stats" } as const;

export type Analyze = (url: string) => Promise<Analysis | null>;

interface Queued extends Candidate {
  source: LeadSource;
  state: "pending" | "done" | "failed";
}
interface Stats {
  day: string;
  scanned: number;
  found: number;
  lastRun?: string;
  lastError?: string;
}

async function get<T>(key: string, fallback: T): Promise<T> {
  return ((await chrome.storage.local.get(key))[key] as T | undefined) ?? fallback;
}
async function put(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function huntStats(): Promise<Stats> {
  const s = await get<Stats>(K.stats, { day: today(), scanned: 0, found: 0 });
  return s.day === today() ? s : { day: today(), scanned: 0, found: 0, lastRun: s.lastRun };
}

/** Área de la zona; si Nominatim falla, se busca el municipio por nombre en Overpass. */
async function areaFor(zone: string): Promise<number | string> {
  try {
    return await areaFromNominatim(zone);
  } catch {
    return zone.trim();
  }
}

async function areaFromNominatim(zone: string): Promise<number> {
  const areas = await get<Record<string, number>>(K.areas, {});
  const cached = areas[zone.toLowerCase()];
  if (cached) return cached;
  const url = `${NOMINATIM}?format=jsonv2&limit=3&q=${encodeURIComponent(zone)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "es,pt" } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const found = areaIdFromNominatim(await res.json());
  if (!found) throw new Error(`No encuentro la zona «${zone}» en OpenStreetMap.`);
  areas[zone.toLowerCase()] = found.areaId;
  await put(K.areas, areas);
  return found.areaId;
}

/** Añade candidatos a la cola sin duplicar dominios. Devuelve cuántos son nuevos. */
export async function enqueue(cands: Candidate[], source: LeadSource): Promise<number> {
  const queue = await get<Record<string, Queued>>(K.queue, {});
  let added = 0;
  for (const c of cands) {
    if (queue[c.domain] || (await hasLead(c.domain))) continue;
    queue[c.domain] = { ...c, source, state: "pending" };
    added++;
  }
  await put(K.queue, queue);
  return added;
}

/** Una consulta a Overpass como mucho por ejecución (uso moderado del servicio público). */
async function refreshOne(zones: string[], sectors: Sector[]): Promise<void> {
  const refreshed = await get<Record<string, number>>(K.refreshed, {});
  const key = (z: string) => `${z.toLowerCase()}|${[...sectors].sort().join(",")}`;
  const zone = zones.find((z) => Date.now() - (refreshed[key(z)] ?? 0) > REFRESH_MS);
  if (!zone) return;
  const areaId = await areaFor(zone);
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(buildOverpassQuery(areaId, sectors)),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  await enqueue(parseOverpass(await res.json(), sectors, zone), "radar");
  refreshed[key(zone)] = Date.now();
  await put(K.refreshed, refreshed);
}

function withOsmData(a: Analysis, c: Queued): Analysis {
  // El nombre de OpenStreetMap suele ser más limpio que el <title> de la web.
  const name = c.source === "radar" && c.name ? c.name : a.name;
  return {
    ...a,
    name,
    contacts: mergeContacts(a.contacts, { emails: c.emails, phones: c.phones, socials: {}, contactPages: [], hasContactForm: false }),
    profile: {
      ...a.profile,
      name,
      type: a.profile.type === "otro" && c.sector ? c.sector : a.profile.type,
      address: a.profile.address ?? c.address,
    },
  };
}

let busy = false;

export async function runHunt(analyze: Analyze, notifyFound: (leads: Lead[]) => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  const stats = await huntStats();
  try {
    const s = await loadSettings();
    if (s.hunt && s.zones.length && s.sectors.length) {
      try {
        await refreshOne(s.zones, s.sectors);
      } catch (e) {
        stats.lastError = String(e instanceof Error ? e.message : e);
      }
    }
    const queue = await get<Record<string, Queued>>(K.queue, {});
    // Lo encontrado al navegar va primero; luego el radar, hasta el límite diario.
    const pending = Object.values(queue)
      .filter((q) => q.state === "pending" && (q.source !== "radar" || s.hunt))
      .sort((a, b) => Number(a.source === "radar") - Number(b.source === "radar"));
    const budget = Math.max(0, s.dailyLimit - stats.scanned);
    const found: Lead[] = [];
    for (const c of pending.slice(0, Math.min(PER_RUN, budget))) {
      const a = await analyze(c.website).catch(() => null);
      queue[c.domain] = { ...c, state: a ? "done" : "failed" };
      stats.scanned++;
      if (a && a.score >= s.threshold) {
        const { lead, isNew } = await saveLead(withOsmData(a, c), { source: c.source, zone: c.zone });
        if (isNew) found.push(lead);
      }
      await put(K.queue, queue);
    }
    stats.found += found.length;
    stats.lastRun = new Date().toISOString();
    if (found.length && s.notify) await notifyFound(found);
  } finally {
    await put(K.stats, stats);
    busy = false;
  }
}

export async function queueSize(): Promise<number> {
  return Object.values(await get<Record<string, Queued>>(K.queue, {})).filter((q) => q.state === "pending").length;
}

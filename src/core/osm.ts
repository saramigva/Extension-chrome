import { normalizeEmail, normalizePhone } from "./contacts";
import type { BusinessType } from "./profile";

// Búsqueda de negocios con web en OpenStreetMap (datos abiertos, licencia ODbL).
// Nominatim: convertir "Lisboa" en un área. Overpass: listar negocios del área.
// Políticas: https://operations.osmfoundation.org/policies/nominatim/ (máx. 1 petición/s)
// y https://dev.overpass-api.de/overpass-doc/en/preface/commons.html (uso moderado, sin paralelismo).

export const OSM_ATTRIBUTION = "Datos de negocios © OpenStreetMap contributors (ODbL)";
export const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";

export type Sector = Exclude<BusinessType, "otro">;

export const SECTOR_LABELS: Record<Sector, string> = {
  restaurante: "Restaurantes, bares y cafés",
  hotel: "Hoteles y alojamientos",
  clinica: "Clínicas y salud",
  dental: "Dentistas",
  legal: "Abogados, gestorías y asesorías",
  inmobiliaria: "Inmobiliarias",
  taller: "Talleres",
  belleza: "Peluquerías y estética",
  tienda: "Tiendas",
  formacion: "Academias y autoescuelas",
  reformas: "Reformas y oficios",
  gimnasio: "Gimnasios",
};

/** Filtros de etiquetas OSM por sector (clave, expresión regular del valor). */
const SECTOR_TAGS: Record<Sector, Array<[string, string]>> = {
  restaurante: [["amenity", "^(restaurant|cafe|bar|pub|fast_food|ice_cream)$"]],
  hotel: [["tourism", "^(hotel|guest_house|hostel|apartment|motel|chalet)$"]],
  clinica: [["amenity", "^(clinic|doctors|veterinary)$"], ["healthcare", "^(clinic|doctor|physiotherapist|psychotherapist|podiatrist|centre)$"]],
  dental: [["amenity", "^dentist$"], ["healthcare", "^dentist$"]],
  legal: [["office", "^(lawyer|accountant|notary|tax_advisor)$"]],
  inmobiliaria: [["office", "^estate_agent$"]],
  taller: [["shop", "^(car_repair|tyres|motorcycle_repair)$"]],
  belleza: [["shop", "^(hairdresser|beauty|massage|cosmetics)$"]],
  tienda: [["shop", "^(clothes|shoes|furniture|bakery|butcher|florist|optician|jewelry|gift|books|hardware|interior_decoration|bicycle)$"]],
  formacion: [["amenity", "^(language_school|driving_school|music_school|prep_school|training)$"]],
  reformas: [["craft", "^(carpenter|electrician|plumber|painter|builder|tiler|roofer|glaziery|hvac)$"], ["shop", "^(kitchen|bathroom_furnishing|doityourself)$"]],
  gimnasio: [["leisure", "^(fitness_centre|sports_centre)$"]],
};

const WEBSITE_KEYS = ["website", "contact:website", "url"];

/**
 * `area`: id de área de Overpass (vía Nominatim) o, si Nominatim no responde,
 * el nombre del municipio (límite administrativo de nivel 7 u 8: municipios en PT y ES).
 */
export function buildOverpassQuery(area: number | string, sectors: Sector[], limit = 400): string {
  const lines: string[] = [];
  for (const s of sectors) {
    for (const [k, v] of SECTOR_TAGS[s]) {
      for (const w of WEBSITE_KEYS) lines.push(`  nwr["${k}"~"${v}"]["${w}"](area.a);`);
    }
  }
  const areaLine =
    typeof area === "number"
      ? `area(${area})->.a;`
      : `area["name"="${area.replace(/["\\]/g, "")}"]["boundary"="administrative"]["admin_level"~"^(7|8)$"]->.a;`;
  return `[out:json][timeout:90];\n${areaLine}\n(\n${lines.join("\n")}\n);\nout tags center ${limit};`;
}

/** Área de Overpass a partir del primer resultado de Nominatim (relación o vía administrativa). */
export function areaIdFromNominatim(results: unknown): { areaId: number; label: string } | null {
  if (!Array.isArray(results)) return null;
  for (const r of results as Array<{ osm_type?: string; osm_id?: number; display_name?: string }>) {
    if (!r.osm_id) continue;
    if (r.osm_type === "relation") return { areaId: 3_600_000_000 + r.osm_id, label: r.display_name ?? "" };
    if (r.osm_type === "way") return { areaId: 2_400_000_000 + r.osm_id, label: r.display_name ?? "" };
  }
  return null;
}

export interface Candidate {
  /** "node/123", "way/456"… */
  key: string;
  name: string;
  website: string;
  domain: string;
  /** Sector según OpenStreetMap (no se conoce en lo encontrado al buscar en Google). */
  sector?: Sector;
  zone: string;
  phones: string[];
  emails: string[];
  address?: string;
}

/** Webs que en realidad son perfiles de redes o directorios: no hay web propia que analizar. */
const NOT_A_WEBSITE = /(^|\.)(facebook|instagram|linkedin|twitter|x|tiktok|youtube|tripadvisor|booking|google|wa|whatsapp|linktr|thefork|eltenedor|ubereats|glovo|justeat)\.[a-z.]+$/i;

function sectorOf(tags: Record<string, string>, sectors: Sector[]): Sector | null {
  for (const s of sectors) {
    if (SECTOR_TAGS[s].some(([k, v]) => tags[k] !== undefined && new RegExp(v).test(tags[k]!))) return s;
  }
  return null;
}

export function parseOverpass(json: unknown, sectors: Sector[], zone: string): Candidate[] {
  const elements = (json as { elements?: Array<{ type: string; id: number; tags?: Record<string, string> }> })?.elements ?? [];
  const byDomain = new Map<string, Candidate>();
  for (const e of elements) {
    const tags = e.tags ?? {};
    const raw = WEBSITE_KEYS.map((k) => tags[k]).find(Boolean);
    const name = tags.name?.trim();
    const sector = sectorOf(tags, sectors);
    if (!raw || !name || !sector) continue;
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      continue;
    }
    const domain = url.hostname.replace(/^www\./, "").toLowerCase();
    if (!domain.includes(".") || NOT_A_WEBSITE.test(domain) || byDomain.has(domain)) continue;
    const country =
      domain.endsWith(".pt") || tags["addr:country"] === "PT" || /^(\+?351|00351)/.test(tags.phone ?? tags["contact:phone"] ?? "") ? "PT" : "ES";
    const phones = [tags.phone, tags["contact:phone"], tags["contact:mobile"]]
      .filter(Boolean)
      .flatMap((p) => p!.split(/[;,]/))
      .map((p) => normalizePhone(p, country))
      .filter((p): p is string => p !== null);
    const emails = [tags.email, tags["contact:email"]].filter(Boolean).map((m) => normalizeEmail(m!)).filter((m): m is string => m !== null);
    const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
    const address = [street, [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ")].filter(Boolean).join(", ") || undefined;
    byDomain.set(domain, {
      key: `${e.type}/${e.id}`,
      name,
      // Siempre probamos HTTPS primero; scanUrl recurre a HTTP si no responde.
      website: `https://${url.host}/`,
      domain,
      sector,
      zone,
      phones: [...new Set(phones)],
      emails: [...new Set(emails)],
      address,
    });
  }
  return [...byDomain.values()];
}

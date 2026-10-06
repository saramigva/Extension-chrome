import type { Sector } from "./osm";

export interface Settings {
  senderName: string;
  senderRole: string;
  senderPhone: string;
  senderWeb: string;
  /** Mostrar el panel flotante automáticamente al abrir webs mejorables. */
  autoPanel: boolean;
  /** Nota mínima para que aparezca el panel flotante. */
  threshold: number;
  /** Etiquetas con la nota junto a los resultados de Google. */
  serpBadges: boolean;
  /** Guardar solo en la bandeja las webs anticuadas que aparecen al navegar o buscar. */
  collectWhileBrowsing: boolean;
  /** Radar automático: busca negocios con web en estas zonas y sectores. */
  hunt: boolean;
  zones: string[];
  sectors: Sector[];
  /** Máximo de webs que el radar revisa al día. */
  dailyLimit: number;
  notify: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  senderName: "",
  senderRole: "",
  senderPhone: "",
  senderWeb: "",
  autoPanel: true,
  threshold: 40,
  serpBadges: true,
  collectWhileBrowsing: true,
  hunt: true,
  zones: [],
  sectors: ["restaurante", "clinica", "dental", "belleza", "taller", "legal"],
  dailyLimit: 40,
  notify: true,
};

export async function loadSettings(): Promise<Settings> {
  const raw = (await chrome.storage.local.get("settings")).settings as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...raw };
}

export async function saveSettings(s: Settings): Promise<void> {
  await chrome.storage.local.set({ settings: s });
}

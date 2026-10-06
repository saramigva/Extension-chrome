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
}

export const DEFAULT_SETTINGS: Settings = {
  senderName: "",
  senderRole: "",
  senderPhone: "",
  senderWeb: "",
  autoPanel: true,
  threshold: 40,
  serpBadges: true,
};

export async function loadSettings(): Promise<Settings> {
  const raw = (await chrome.storage.local.get("settings")).settings as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...raw };
}

export async function saveSettings(s: Settings): Promise<void> {
  await chrome.storage.local.set({ settings: s });
}

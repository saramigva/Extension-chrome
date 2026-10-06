import type { Analysis } from "./analyze";

export interface Summary {
  domain: string;
  score: number;
  verdict: Analysis["verdict"];
  /** Ids de las 3 señales principales. */
  top: string[];
  ts: number;
}

export type Message =
  | { type: "analysis"; analysis: Analysis } // página → background: nota para el icono
  | { type: "get-analysis" } // popup → página
  | { type: "hide-panel"; hidden: boolean } // popup → página: oculta el panel durante la captura
  | { type: "save-lead"; analysis: Analysis }
  | { type: "demo"; analysis: Analysis; tabId?: number; shot?: boolean } // captura "antes" y abre la demo
  | { type: "summarize"; url: string } // resultados de Google → background
  | { type: "offscreen-scan"; target: "offscreen"; url: string };

export function summarize(a: Analysis): Summary {
  return { domain: a.domain, score: a.score, verdict: a.verdict, top: a.signals.slice(0, 3).map((s) => s.id), ts: Date.now() };
}

/** Dominios grandes donde no tiene sentido buscar leads (y no queremos ruido). */
export const SKIP_HOSTS =
  /(^|\.)(google\.[a-z.]+|youtube\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|linkedin\.com|tiktok\.com|whatsapp\.com|amazon\.[a-z.]+|wikipedia\.org|github\.com|reddit\.com|idealista\.(com|pt)|booking\.com|tripadvisor\.[a-z.]+|airbnb\.[a-z.]+|chatgpt\.com|openai\.com|claude\.ai|gmail\.com|outlook\.(com|live\.com)|microsoft\.com|apple\.com|netflix\.com|spotify\.com|wallapop\.com|olx\.pt|elcorteingles\.es|zara\.com|bing\.com|duckduckgo\.com)$/i;

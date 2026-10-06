export function t(key: string, substitutions?: string | string[]): string {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

/** Formatea una fecha ISO con el idioma del navegador, sin desplazamientos de zona horaria. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(chrome.i18n.getUILanguage(), {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

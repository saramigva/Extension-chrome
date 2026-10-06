import type { Country } from "./holidays";

// Base de conocimiento de errores técnicos frecuentes en las sedes electrónicas.
// Cada entrada cita de dónde sale la solución. Añadir solo entradas con fuente.

export interface KnownError {
  id: string;
  country: Country;
  pattern: RegExp;
  /** Claves i18n del título y la solución. */
  titleKey: string;
  fixKey: string;
  source: string;
}

export const KNOWN_ERRORS: KnownError[] = [
  {
    id: "es-autofirma-saf09-saf20",
    country: "ES",
    pattern: /SAF[_\s-]?(09|20)\b/i,
    titleKey: "errSafTitle",
    fixKey: "errSafFix",
    source: "https://sede.gva.es/va/-/12.-an-error-occurred-during-the-configuration-of-autofirm-",
  },
  {
    id: "es-autofirma-no-arranca",
    country: "ES",
    pattern: /no se ha podido (conectar|iniciar) con autofirma|autofirma no (est[aá] instalad|responde)/i,
    titleKey: "errAutofirmaTitle",
    fixKey: "errAutofirmaFix",
    source: "https://firmaelectronica.gob.es/Home/Descargas.html",
  },
  {
    id: "es-sesion-caducada",
    country: "ES",
    pattern: /sesi[oó]n (ha )?(caducad|expirad|finalizad)/i,
    titleKey: "errSessionTitle",
    fixKey: "errSessionFix",
    source: "https://sedeelectronica.unavarra.es/opencms/system/modules/sede/contents/ayuda/problemas_instancias_electronicas",
  },
  {
    id: "pt-plugin-autenticacao",
    country: "PT",
    pattern: /plugin autentica[cç][aã]o\.?gov|instal(e|ar) o plugin|leitor de cart[oõ]es n[aã]o (foi )?detetado/i,
    titleKey: "errPtPluginTitle",
    fixKey: "errPtPluginFix",
    source: "https://www.autenticacao.gov.pt/",
  },
  {
    id: "pt-sessao-expirada",
    country: "PT",
    pattern: /sess[aã]o (expirou|expirada|terminou)/i,
    titleKey: "errSessionTitle",
    fixKey: "errSessionFixPt",
    source: "https://www.portaldasfinancas.gov.pt/",
  },
];

export function matchKnownErrors(text: string, country: Country): KnownError[] {
  return KNOWN_ERRORS.filter((e) => e.country === country && e.pattern.test(text));
}

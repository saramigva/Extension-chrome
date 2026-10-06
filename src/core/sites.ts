import type { Country } from "./holidays";
import type { DeliveryRuleId } from "./rules";

export interface Site {
  host: RegExp;
  country: Country;
  issuer: string;
  defaultRule: DeliveryRuleId;
  /** Si el sitio tiene un buzón de notificaciones donde buscar candidatas. */
  inbox: boolean;
}

// Mantener sincronizado con content_scripts.matches en public/manifest.json.
export const SITES: Site[] = [
  { host: /^dehu\.redsara\.es$/, country: "ES", issuer: "DEHú", defaultRule: "es-ley39-art43", inbox: true },
  { host: /^notificaciones\.060\.es$/, country: "ES", issuer: "Carpeta 060", defaultRule: "es-ley39-art43", inbox: true },
  { host: /^sede\.agenciatributaria\.gob\.es$/, country: "ES", issuer: "AEAT", defaultRule: "es-ley39-art43", inbox: true },
  { host: /^sede\.seg-social\.gob\.es$/, country: "ES", issuer: "Seguridad Social", defaultRule: "es-ley39-art43", inbox: true },
  { host: /^sede\.dgt\.gob\.es$/, country: "ES", issuer: "DGT", defaultRule: "es-ley39-art43", inbox: true },
  { host: /(^|\.)portaldasfinancas\.gov\.pt$/, country: "PT", issuer: "Portal das Finanças", defaultRule: "pt-cppt39-notificacao", inbox: true },
  { host: /^(www\.)?viactt\.pt$/, country: "PT", issuer: "ViaCTT", defaultRule: "pt-cppt39-notificacao", inbox: true },
];

export function siteFor(hostname: string): Site | undefined {
  return SITES.find((s) => s.host.test(hostname));
}

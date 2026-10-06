import { addDays, addMonths, type IsoDate } from "./dates";
import {
  addBusinessDays,
  nextBusinessDay,
  sameOrNextBusinessDay,
  type Country,
} from "./holidays";

// Principio de diseño: ante la duda, calculamos la fecha MÁS TEMPRANA posible.
// Avisar antes de tiempo es una molestia; avisar tarde puede costar una sanción.

export type DeliveryRuleId = "es-ley39-art43" | "pt-cppt39-notificacao" | "pt-cppt39-citacao";

export interface DeliveryRule {
  id: DeliveryRuleId;
  country: Country;
  /** Clave i18n del nombre de la regla. */
  labelKey: string;
  source: string;
}

export const DELIVERY_RULES: Record<DeliveryRuleId, DeliveryRule> = {
  // Ley 39/2015, art. 43.2: rechazada (y por tanto practicada) a los 10 días
  // naturales desde la puesta a disposición sin acceder. Art. 41.6: la falta
  // del aviso por email/SMS no invalida la notificación.
  "es-ley39-art43": {
    id: "es-ley39-art43",
    country: "ES",
    labelKey: "ruleEsLey39",
    source: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a43",
  },
  // CPPT, art. 39.º, n.º 10: notificações na caixa postal eletrónica (ViaCTT) ou
  // no serviço público de notificações eletrónicas consideram-se efetuadas no
  // 15.º dia posterior à disponibilização; a contagem inicia-se no 1.º dia útil seguinte.
  "pt-cppt39-notificacao": {
    id: "pt-cppt39-notificacao",
    country: "PT",
    labelKey: "rulePtNotificacao",
    source: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/Folheto_Notificacoes_Eletronicas.pdf",
  },
  // CPPT, art. 39.º: as citações eletrónicas consideram-se efetuadas no 5.º dia.
  "pt-cppt39-citacao": {
    id: "pt-cppt39-citacao",
    country: "PT",
    labelKey: "rulePtCitacao",
    source: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/Folheto_Notificacoes_Eletronicas.pdf",
  },
};

export interface NotifiedResult {
  /** Fecha en la que la notificación se tiene por practicada. */
  date: IsoDate;
  basis: "accessed" | "presumed";
}

/**
 * Fecha en que la notificación se considera practicada.
 * Si el usuario ya la abrió, usamos la fecha de acceso cuando sea anterior a la
 * presunción legal (criterio conservador: el plazo empieza antes).
 */
export function notifiedDate(
  ruleId: DeliveryRuleId,
  availableOn: IsoDate,
  accessedOn?: IsoDate,
): NotifiedResult {
  const rule = DELIVERY_RULES[ruleId];
  let presumed: IsoDate;
  switch (rule.id) {
    case "es-ley39-art43":
      presumed = addDays(availableOn, 10);
      break;
    case "pt-cppt39-notificacao":
      presumed = addDays(nextBusinessDay("PT", availableOn), 14);
      break;
    case "pt-cppt39-citacao":
      presumed = addDays(nextBusinessDay("PT", availableOn), 4);
      break;
  }
  if (accessedOn && accessedOn < presumed) {
    return { date: accessedOn < availableOn ? availableOn : accessedOn, basis: "accessed" };
  }
  return { date: presumed, basis: "presumed" };
}

export type ResponseUnit = "business-days" | "calendar-days" | "months";

export interface ResponseRule {
  amount: number;
  unit: ResponseUnit;
}

export interface ResponsePreset extends ResponseRule {
  id: string;
  country: Country;
  labelKey: string;
  /** URL o cita legal verificable. */
  source: string;
}

export const RESPONSE_PRESETS: ResponsePreset[] = [
  {
    id: "es-recurso-reposicion",
    country: "ES",
    labelKey: "presetEsReposicion",
    amount: 1,
    unit: "months",
    source: "https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186#a223",
  },
  {
    id: "es-alegaciones-10",
    country: "ES",
    labelKey: "presetEsAlegaciones10",
    amount: 10,
    unit: "business-days",
    source: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a82",
  },
  {
    id: "pt-reclamacao-graciosa",
    country: "PT",
    labelKey: "presetPtReclamacaoGraciosa",
    amount: 120,
    unit: "calendar-days",
    source: "CPPT, art. 70.º, n.º 1",
  },
  {
    id: "pt-audicao-previa",
    country: "PT",
    labelKey: "presetPtAudicaoPrevia",
    amount: 15,
    unit: "calendar-days",
    source: "LGT, art. 60.º (o ofício indica o prazo concreto)",
  },
];

/**
 * Último día para responder. El plazo empieza a contar el día siguiente a la
 * notificación. Si termina en día inhábil, se traslada al siguiente hábil
 * (art. 30.5 Ley 39/2015; art. 279.º e) Código Civil PT, por remisión del art. 20.º CPPT).
 */
export function responseDeadline(country: Country, notifiedOn: IsoDate, rule: ResponseRule): IsoDate {
  if (rule.amount <= 0 || !Number.isInteger(rule.amount)) {
    throw new Error(`Plazo no válido: ${rule.amount}`);
  }
  switch (rule.unit) {
    case "business-days":
      return addBusinessDays(country, notifiedOn, rule.amount);
    case "calendar-days":
      return sameOrNextBusinessDay(country, addDays(notifiedOn, rule.amount));
    case "months":
      return sameOrNextBusinessDay(country, addMonths(notifiedOn, rule.amount));
  }
}

import { diffDays, isIsoDate, type IsoDate } from "./dates";
import { DELIVERY_RULES, notifiedDate, responseDeadline, type DeliveryRuleId, type ResponseRule } from "./rules";

/** Una notificación que el usuario sigue. Vive solo en chrome.storage.local. */
export interface TrackedItem {
  id: string;
  title: string;
  /** Organismo o portal: "AEAT", "Portal das Finanças", "DGT"… */
  issuer: string;
  ruleId: DeliveryRuleId;
  /** Fecha de puesta a disposición en el buzón. */
  availableOn: IsoDate;
  /** Fecha en que el usuario la abrió, si lo hizo. */
  accessedOn?: IsoDate;
  response?: ResponseRule;
  notes?: string;
  origin: "manual" | "detected";
  done: boolean;
  createdAt: string;
}

export type Urgency = "overdue" | "today" | "soon" | "ok" | "done";

export interface ItemStatus {
  notifiedOn: IsoDate;
  notifiedBasis: "accessed" | "presumed";
  /** Fecha clave a vigilar: fin del plazo de respuesta, o la notificación si no hay plazo. */
  keyDate: IsoDate;
  keyKind: "response" | "notified";
  daysLeft: number;
  urgency: Urgency;
}

export const SOON_DAYS = 3;

export function itemStatus(item: TrackedItem, today: IsoDate): ItemStatus {
  const country = DELIVERY_RULES[item.ruleId].country;
  const notified = notifiedDate(item.ruleId, item.availableOn, item.accessedOn);
  const keyDate = item.response ? responseDeadline(country, notified.date, item.response) : notified.date;
  const daysLeft = diffDays(today, keyDate);
  let urgency: Urgency;
  if (item.done) urgency = "done";
  else if (daysLeft < 0) urgency = "overdue";
  else if (daysLeft === 0) urgency = "today";
  else if (daysLeft <= SOON_DAYS) urgency = "soon";
  else urgency = "ok";
  return {
    notifiedOn: notified.date,
    notifiedBasis: notified.basis,
    keyDate,
    keyKind: item.response ? "response" : "notified",
    daysLeft,
    urgency,
  };
}

const URGENCY_ORDER: Record<Urgency, number> = { overdue: 0, today: 1, soon: 2, ok: 3, done: 4 };

export function sortByUrgency(items: TrackedItem[], today: IsoDate): Array<{ item: TrackedItem; status: ItemStatus }> {
  return items
    .map((item) => ({ item, status: itemStatus(item, today) }))
    .sort(
      (a, b) =>
        URGENCY_ORDER[a.status.urgency] - URGENCY_ORDER[b.status.urgency] ||
        a.status.keyDate.localeCompare(b.status.keyDate),
    );
}

/** Valida datos que vienen de formularios o de chrome.storage (pueden estar corruptos). */
export function validateItem(value: unknown): value is TrackedItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.issuer === "string" &&
    typeof v.ruleId === "string" &&
    v.ruleId in DELIVERY_RULES &&
    typeof v.availableOn === "string" &&
    isIsoDate(v.availableOn) &&
    (v.accessedOn === undefined || (typeof v.accessedOn === "string" && isIsoDate(v.accessedOn))) &&
    typeof v.done === "boolean"
  );
}

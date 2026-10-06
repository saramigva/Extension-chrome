import { describe, expect, it } from "vitest";
import { itemStatus, sortByUrgency, validateItem, type TrackedItem } from "../src/core/items";
import { buildIcs } from "../src/core/ics";

const base: TrackedItem = {
  id: "a",
  title: "Requerimiento",
  issuer: "AEAT",
  ruleId: "es-ley39-art43",
  availableOn: "2026-10-01",
  origin: "manual",
  done: false,
  createdAt: "2026-10-01T00:00:00Z",
};

describe("estado de una notificación", () => {
  it("clasifica la urgencia según los días que quedan", () => {
    expect(itemStatus(base, "2026-10-01").urgency).toBe("ok"); // vence el 11
    expect(itemStatus(base, "2026-10-08").urgency).toBe("soon");
    expect(itemStatus(base, "2026-10-11").urgency).toBe("today");
    expect(itemStatus(base, "2026-10-12").urgency).toBe("overdue");
    expect(itemStatus({ ...base, done: true }, "2026-10-12").urgency).toBe("done");
  });

  it("con plazo de respuesta, vigila el fin del plazo", () => {
    const s = itemStatus({ ...base, response: { amount: 1, unit: "months" } }, "2026-10-01");
    expect(s).toMatchObject({ keyKind: "response", keyDate: "2026-11-11", notifiedOn: "2026-10-11" });
  });

  it("ordena lo vencido primero y lo hecho al final", () => {
    const items = [
      { ...base, id: "done", done: true },
      { ...base, id: "late", availableOn: "2026-09-01" },
      { ...base, id: "later", availableOn: "2026-10-05" },
    ];
    expect(sortByUrgency(items, "2026-10-06").map((x) => x.item.id)).toEqual(["late", "later", "done"]);
  });

  it("descarta datos corruptos del almacenamiento", () => {
    expect(validateItem(base)).toBe(true);
    expect(validateItem({ ...base, availableOn: "2026-02-30" })).toBe(false);
    expect(validateItem({ ...base, ruleId: "otra" })).toBe(false);
    expect(validateItem(null)).toBe(false);
  });
});

it("genera un .ics de día completo con alarmas", () => {
  const ics = buildIcs({ uid: "x", date: "2026-11-11", summary: "AEAT: a, b; c", description: "d", stamp: new Date("2026-10-06T10:00:00Z") });
  expect(ics).toContain("DTSTART;VALUE=DATE:20261111");
  expect(ics).toContain("DTEND;VALUE=DATE:20261112");
  expect(ics).toContain(String.raw`SUMMARY:AEAT: a\, b\; c`);
  expect(ics).toContain("TRIGGER:-P3D");
  expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
});

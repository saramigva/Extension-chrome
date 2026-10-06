import { describe, expect, it } from "vitest";
import { addMonths, easterSunday } from "../src/core/dates";
import { isBusinessDay } from "../src/core/holidays";
import { notifiedDate, responseDeadline } from "../src/core/rules";

describe("calendario", () => {
  it("calcula el domingo de Pascua", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
  });

  it("aplica festivos nacionales por país", () => {
    expect(isBusinessDay("ES", "2026-10-12")).toBe(false); // Fiesta Nacional
    expect(isBusinessDay("PT", "2026-10-12")).toBe(true);
    expect(isBusinessDay("PT", "2026-10-05")).toBe(false); // Implantação da República
    expect(isBusinessDay("PT", "2026-06-04")).toBe(false); // Corpo de Deus (Pascua + 60)
    expect(isBusinessDay("ES", "2026-04-03")).toBe(false); // Viernes Santo
  });

  it("suma meses de fecha a fecha y recorta a fin de mes", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-10-11", 1)).toBe("2026-11-11");
  });
});

describe("España — Ley 39/2015 art. 43", () => {
  it("se da por rechazada a los 10 días naturales", () => {
    expect(notifiedDate("es-ley39-art43", "2026-10-01")).toEqual({ date: "2026-10-11", basis: "presumed" });
  });

  it("si se abrió antes, cuenta desde la apertura", () => {
    expect(notifiedDate("es-ley39-art43", "2026-10-01", "2026-10-03")).toEqual({ date: "2026-10-03", basis: "accessed" });
  });

  it("abrirla después del día 10 no retrasa la notificación", () => {
    expect(notifiedDate("es-ley39-art43", "2026-10-01", "2026-10-20").date).toBe("2026-10-11");
  });

  it("recurso de reposición: 1 mes, trasladado si acaba en inhábil", () => {
    expect(responseDeadline("ES", "2026-10-11", { amount: 1, unit: "months" })).toBe("2026-11-11");
    expect(responseDeadline("ES", "2026-01-31", { amount: 1, unit: "months" })).toBe("2026-03-02");
  });

  it("días hábiles saltan fines de semana y festivos (8 de diciembre)", () => {
    expect(responseDeadline("ES", "2026-12-03", { amount: 10, unit: "business-days" })).toBe("2026-12-18");
  });
});

describe("Portugal — CPPT art. 39.º", () => {
  it("notificação: 15.º dia, contado desde o 1.º dia útil seguinte", () => {
    // Sexta 2/10; segunda 5/10 é feriado → dia 1 = terça 6/10 → dia 15 = 20/10.
    expect(notifiedDate("pt-cppt39-notificacao", "2026-10-02").date).toBe("2026-10-20");
  });

  it("citação: 5.º dia", () => {
    expect(notifiedDate("pt-cppt39-citacao", "2026-10-02").date).toBe("2026-10-10");
  });

  it("reclamação graciosa: 120 dias seguidos", () => {
    expect(responseDeadline("PT", "2026-10-20", { amount: 120, unit: "calendar-days" })).toBe("2027-02-17");
  });

  it("prazo que termina ao fim de semana passa para o dia útil seguinte", () => {
    // 2026-10-10 + 15 = 2026-10-25 (domingo) → 2026-10-26.
    expect(responseDeadline("PT", "2026-10-10", { amount: 15, unit: "calendar-days" })).toBe("2026-10-26");
  });
});

it("rechaza plazos no válidos", () => {
  expect(() => responseDeadline("ES", "2026-10-01", { amount: 0, unit: "months" })).toThrow();
});

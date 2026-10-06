// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { detectCandidates, findDates } from "../src/core/detect";
import { matchKnownErrors } from "../src/core/errors";

describe("detector de notificaciones", () => {
  it("extrae fechas en formatos habituales y descarta las imposibles", () => {
    expect(findDates("puesta 01/10/2026, caduca 2026-10-11, mal 31/02/2026")).toEqual(["2026-10-01", "2026-10-11"]);
  });

  it("propone filas de un buzón español con la fecha más antigua", () => {
    document.body.innerHTML = `
      <table>
        <tr><th>Asunto</th><th>Fecha</th></tr>
        <tr><td>Requerimiento de documentación IRPF 2025</td><td>Puesta a disposición: 01/10/2026</td><td>Caduca: 11/10/2026</td></tr>
        <tr><td>Menú principal</td><td>Ayuda</td></tr>
      </table>`;
    const c = detectCandidates(document.body, "ES", "2026-10-06");
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ availableOn: "2026-10-01", title: "Requerimiento de documentación IRPF 2025" });
  });

  it("funciona con listas portuguesas e ignora fechas futuras", () => {
    document.body.innerHTML = `
      <ul>
        <li><span>Notificação - Liquidação de IRS 2025</span> <span>Data de envio: 2026-10-02</span></li>
        <li><span>Notificação futura</span> <span>2026-12-01</span></li>
      </ul>`;
    const c = detectCandidates(document.body, "PT", "2026-10-06");
    expect(c.map((x) => x.availableOn)).toEqual(["2026-10-02"]);
    expect(c[0]!.title).toContain("Liquidação de IRS");
  });

  it("no inventa candidatas sin palabras clave", () => {
    document.body.innerHTML = `<table><tr><td>Noticia publicada</td><td>01/10/2026</td></tr></table>`;
    expect(detectCandidates(document.body, "ES", "2026-10-06")).toEqual([]);
  });
});

describe("errores conocidos", () => {
  it("reconoce errores de AutoFirma y de sesión", () => {
    expect(matchKnownErrors("Se ha producido el error SAF_09", "ES").map((e) => e.id)).toEqual(["es-autofirma-saf09-saf20"]);
    expect(matchKnownErrors("La sesión ha caducado", "ES").map((e) => e.id)).toEqual(["es-sesion-caducada"]);
    expect(matchKnownErrors("A sua sessão expirou", "PT").map((e) => e.id)).toEqual(["pt-sessao-expirada"]);
    expect(matchKnownErrors("Todo correcto", "ES")).toEqual([]);
  });
});

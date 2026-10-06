// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { analyzeDocument, copyrightYear, explain } from "../src/core/analyze";
import { MODERN, now, oldSite, parse } from "./fixtures";

describe("análisis de antigüedad", () => {
  it("detecta una web antigua y explica por qué", () => {
    const a = oldSite();
    expect(a.verdict).toBe("anticuada");
    expect(a.score).toBe(100);
    expect(a.signals.map((s) => s.id)).toEqual(
      expect.arrayContaining(["no-https", "no-mobile", "stale-copyright", "obsolete-tags", "table-layout", "legacy-markup", "old-wordpress", "old-jquery", "old-analytics"]),
    );
    expect(a.copyrightYear).toBe(2014);
    expect(a.tech).toEqual(expect.arrayContaining(["WordPress 4.9.8", "jQuery 1.12.4"]));
    expect(a.name).toBe("Restaurante Casa Pepe");
    expect(a.country).toBe("ES");
  });

  it("explica las señales en español y portugués", () => {
    const s = oldSite().signals.find((x) => x.id === "stale-copyright")!;
    expect(explain(s)).toBe("El pie de página dice © 2014: parece abandonada.");
    expect(explain(s, "pt")).toBe("O rodapé diz © 2014: parece abandonado.");
  });

  it("extrae contactos y descarta enlaces de compartir", () => {
    const a = oldSite();
    expect(a.contacts.emails).toEqual(["info@casapepe.es"]);
    expect(a.contacts.phones).toEqual(["+34958123456"]);
    expect(a.contacts.socials).toEqual({ facebook: "https://www.facebook.com/casapepe" });
    expect(a.contacts.contactPages).toEqual(["http://www.casapepe.es/contacto.html"]);
  });

  it("saca la ficha del negocio para personalizar", () => {
    const p = oldSite().profile;
    expect(p.type).toBe("restaurante");
    expect(p.services).toEqual(["Nuestra carta", "Menú del día", "Celebraciones"]);
    expect(p.logo).toBe("http://www.casapepe.es/img/logo-casapepe.jpg");
    expect(p.images).toEqual(["http://www.casapepe.es/img/comedor.jpg", "http://www.casapepe.es/img/paella.jpg"]);
    expect(p.paragraphs[0]).toMatch(/^Desde 1998/);
    expect(p.address).toBe("C/ Real 12, 18001 Granada");
    expect(p.since).toBe(2004);
  });

  it("no penaliza una web moderna", () => {
    const a = analyzeDocument(parse(MODERN), MODERN, "https://estudioluz.pt/", { now });
    expect(a).toMatchObject({ verdict: "moderna", score: 0, name: "Estudio Luz", country: "PT" });
    expect(a.contacts.hasContactForm).toBe(true);
  });

  it("marca webs lentas solo si se conoce el tiempo de carga", () => {
    expect(analyzeDocument(parse(MODERN), MODERN, "https://x.pt/", { now, loadMs: 6500 }).signals.map((s) => s.id)).toEqual(["slow"]);
  });

  it("lee el año del copyright, también en rangos", () => {
    expect(copyrightYear("© 2009-2017 Empresa", 2026)).toBe(2017);
    expect(copyrightYear("Copyright 2021. Todos los derechos", 2026)).toBe(2021);
    expect(copyrightYear("Fundada en 1998", 2026)).toBeUndefined();
  });
});

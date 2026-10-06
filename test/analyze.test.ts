// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { analyzeDocument, copyrightYear } from "../src/core/analyze";
import { buildPitch } from "../src/core/pitch";

const now = new Date("2026-10-06T12:00:00Z");
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

const OLD = `<html><head><title>Restaurante Casa Pepe - Bienvenidos</title>
<meta name="generator" content="WordPress 4.9.8">
<script src="/wp-includes/js/jquery/jquery-1.12.4.min.js"></script>
<script src="http://www.google-analytics.com/ga.js"></script></head>
<body><table width="800" bgcolor="#fff"><tr><td><table><tr><td>
<center><font face="Comic Sans MS">Menú del día</font></center><font>Tapas</font><font>Vinos</font>
<marquee>¡Ofertas!</marquee></td></tr></table></td></tr></table>
<a href="mailto:info@casapepe.es">Escríbenos</a> · Tel. 958 12 34 56 · <a href="/contacto.html">Contacto</a>
<a href="https://www.facebook.com/casapepe">Facebook</a> <a href="https://www.facebook.com/sharer.php?u=x">Compartir</a>
<p>© 2014 Casa Pepe</p></body></html>`;

const MODERN = `<html lang="es"><head><title>Estudio Luz | Fotografía</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Estudio de fotografía en Lisboa">
<meta property="og:site_name" content="Estudio Luz"><link rel="icon" href="/f.svg"></head>
<body><form><input type="email" name="email"><textarea></textarea></form><footer>© 2026 Estudio Luz</footer></body></html>`;

describe("análisis de antigüedad", () => {
  it("detecta una web antigua y explica por qué", () => {
    const a = analyzeDocument(parse(OLD), OLD, "http://www.casapepe.es/", { now });
    expect(a.verdict).toBe("anticuada");
    expect(a.score).toBe(100);
    const ids = a.signals.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["no-https", "no-mobile", "stale-copyright", "obsolete-tags", "table-layout", "legacy-markup", "old-wordpress", "old-jquery", "old-analytics"]));
    expect(a.copyrightYear).toBe(2014);
    expect(a.tech).toEqual(expect.arrayContaining(["WordPress 4.9.8", "jQuery 1.12.4"]));
    expect(a.name).toBe("Restaurante Casa Pepe");
    expect(a.country).toBe("ES");
  });

  it("extrae contactos y descarta enlaces de compartir", () => {
    const a = analyzeDocument(parse(OLD), OLD, "http://www.casapepe.es/", { now });
    expect(a.contacts.emails).toEqual(["info@casapepe.es"]);
    expect(a.contacts.phones).toEqual(["+34958123456"]);
    expect(a.contacts.socials).toEqual({ facebook: "https://www.facebook.com/casapepe" });
    expect(a.contacts.contactPages).toEqual(["http://www.casapepe.es/contacto.html"]);
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

  it("genera el guion en el idioma del país", () => {
    const es = analyzeDocument(parse(OLD), OLD, "http://www.casapepe.es/", { now });
    expect(buildPitch(es)).toMatch(/^Hola, equipo de Restaurante Casa Pepe/);
    const pt = { ...es, country: "PT" as const };
    expect(buildPitch(pt)).toMatch(/^Olá, equipa de/);
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildDemoHtml } from "../src/core/demo";
import { bestChannel, callDraft, drafts, emailDraft, whatsappDraft } from "../src/core/outreach";
import { DEFAULT_SETTINGS } from "../src/core/settings";
import { oldSite } from "./fixtures";

const me = { ...DEFAULT_SETTINGS, senderName: "Sara", senderRole: "diseñadora web", senderPhone: "+351 912 000 000" };

describe("mensajes por canal", () => {
  it("email personalizado con asunto, motivos, tipo de negocio y firma", () => {
    const d = emailDraft(oldSite(), me);
    expect(d.subject).toBe("Restaurante Casa Pepe: 3 mejoras rápidas para vuestra web");
    expect(d.body).toContain("Soy Sara, diseñadora web.");
    expect(d.body).toContain("desde al menos 2004");
    expect(d.body).toContain("1. Chrome la muestra como «No segura»");
    expect(d.body).toContain("mira la carta y reserva desde el móvil");
    expect(d.body.trim().endsWith("Sara · diseñadora web\n+351 912 000 000")).toBe(true);
    expect(d.link).toMatch(/^mailto:info@casapepe\.es\?subject=/);
  });

  it("si no hay email pero sí móvil, recomienda WhatsApp con un pitch corto", () => {
    const a = oldSite();
    a.contacts.emails = [];
    a.contacts.phones = ["+34958123456", "+34612345678"];
    expect(bestChannel(a)).toBe("whatsapp");
    const w = whatsappDraft(a, me);
    expect(w.body.length).toBeLessThan(320);
    expect(w.link).toMatch(/^https:\/\/wa\.me\/34612345678\?text=/);
    expect(drafts(a, me)[0]!.channel).toBe("whatsapp");
  });

  it("solo con fijo, guion de llamada", () => {
    const a = oldSite();
    a.contacts.emails = [];
    expect(bestChannel(a)).toBe("call");
    expect(callDraft(a, me).link).toBe("tel:+34958123456");
  });

  it("escribe en portugués para webs de Portugal", () => {
    const a = { ...oldSite(), country: "PT" as const };
    expect(emailDraft(a, me).body).toMatch(/^Olá, equipa de Restaurante Casa Pepe/);
    expect(emailDraft(a, me).body).toContain("1. O Chrome mostra-o como «Não seguro»");
    expect(whatsappDraft(a, { ...DEFAULT_SETTINGS }).body).toContain("Trabalho em design web");
  });
});

describe("demo", () => {
  it("monta la web nueva con el contenido real y escapa el HTML", () => {
    const a = oldSite();
    a.name = 'Casa <Pepe> & "Hijos"';
    const html = buildDemoHtml(a, me, 2026);
    expect(html).toContain("<h1>Casa &lt;Pepe&gt; &amp; &quot;Hijos&quot;</h1>");
    expect(html).toContain('name="viewport"');
    expect(html).toContain("Nuestra carta");
    expect(html).toContain('url("http://www.casapepe.es/img/comedor.jpg")');
    expect(html).toContain('href="tel:+34958123456"');
    expect(html).toContain("Desde 1998 cocinamos");
    expect(html).toContain("preparada por Sara");
    expect(html).toContain("© 2026");
    expect(html).not.toContain("<script");
  });
});

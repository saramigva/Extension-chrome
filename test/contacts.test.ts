// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { extractContacts, isGenericEmail, normalizeEmail, normalizePhone } from "../src/core/contacts";
import { toCsv, type Lead } from "../src/core/leads";
import { toUrl } from "../src/core/scan";

const doc = (body: string) => new DOMParser().parseFromString(`<body>${body}</body>`, "text/html");

describe("teléfonos", () => {
  it("normaliza formatos de España y Portugal", () => {
    expect(normalizePhone("+34 612 345 678")).toBe("+34612345678");
    expect(normalizePhone("0034-912-345-678")).toBe("+34912345678");
    expect(normalizePhone("(+351) 912 345 678")).toBe("+351912345678");
    expect(normalizePhone("21 345 6789")).toBe("+351213456789");
    expect(normalizePhone("912 345 678", "PT")).toBe("+351912345678");
    expect(normalizePhone("912 345 678", "ES")).toBe("+34912345678");
    expect(normalizePhone("12345")).toBeNull();
  });
});

describe("emails", () => {
  it("descarta falsos positivos", () => {
    expect(normalizeEmail("logo@2x.png")).toBeNull();
    expect(normalizeEmail("tu@ejemplo.com")).toBeNull();
    expect(normalizeEmail("mailto:Geral@Loja.pt?subject=Ola")).toBe("geral@loja.pt");
  });

  it("descifra emails ofuscados", () => {
    const c = extractContacts(doc("Escríbenos a reservas [arroba] hotelmar [punto] es<br>Móvil 612 345 678"), "https://hotelmar.es/", "ES");
    expect(c.emails).toEqual(["reservas@hotelmar.es"]);
    expect(c.phones).toEqual(["+34612345678"]);
  });

  it("distingue emails genéricos de personales", () => {
    expect(isGenericEmail("info@x.es")).toBe(true);
    expect(isGenericEmail("geral@x.pt")).toBe(true);
    expect(isGenericEmail("maria.lopez@x.es")).toBe(false);
  });
});

it("normaliza lo que pega el usuario", () => {
  expect(toUrl("tienda.es")).toBe("https://tienda.es/");
  expect(toUrl(" https://www.loja.pt/sobre ")).toBe("https://www.loja.pt/sobre");
  expect(toUrl("# comentario")).toBeNull();
  expect(toUrl("hola")).toBeNull();
});

it("exporta CSV compatible con Excel en español", () => {
  const lead = {
    url: "http://a.es/", domain: "a.es", name: 'Bar "El; Sol"', country: "ES", score: 60, verdict: "anticuada",
    signals: [{ id: "no-https", points: 20 }], tech: [], analyzedAt: "2026-10-06T00:00:00Z",
    profile: { name: "x", tagline: "", type: "otro", services: [], paragraphs: [], images: [] },
    contacts: { emails: ["info@a.es"], phones: ["+34958123456"], socials: {}, contactPages: [], hasContactForm: false },
    status: "nuevo", notes: "",
  } as Lead;
  const csv = toCsv([lead]);
  expect(csv.startsWith("﻿Nombre;Dominio")).toBe(true);
  expect(csv).toContain('"Bar ""El; Sol""";a.es');
});

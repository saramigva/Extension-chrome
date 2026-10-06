import { textOf } from "./contacts";

// "Ficha" del negocio sacada de su propia web: sirve para personalizar el
// mensaje y para montar la demo de la web renovada con su contenido real.

export type BusinessType =
  | "restaurante" | "hotel" | "clinica" | "dental" | "legal" | "inmobiliaria" | "taller"
  | "belleza" | "tienda" | "formacion" | "reformas" | "gimnasio" | "otro";

export interface Profile {
  name: string;
  tagline: string;
  type: BusinessType;
  /** Títulos de secciones/servicios de la web (para la demo). */
  services: string[];
  /** Párrafos con contenido (para la demo). */
  paragraphs: string[];
  images: string[];
  logo?: string;
  /** Color de marca (#rrggbb) si la web lo declara. */
  color?: string;
  address?: string;
  /** Primer año del rango © (p. ej. 2004 en «© 2004-2016»): antigüedad del negocio. */
  since?: number;
}

const TYPES: Array<[BusinessType, RegExp]> = [
  ["dental", /dental|dentista|odontol|ortodon|implante/i],
  ["clinica", /cl[ií]nica|fisioterap|psic[oó]log|m[eé]dic|veterin|podolog|nutricion|consult[oó]rio/i],
  ["restaurante", /restaurante|bar |cafeter[ií]a|tapas|men[uú] del d[ií]a|marisquer|pizzer|asador|tasca|pastelar|churrasq/i],
  ["hotel", /hotel|hostal|alojamiento|apartamentos tur|casa rural|alojamento|pousada|turismo rural|guest ?house/i],
  ["legal", /abogad|advogad|asesor[ií]a|gestor[ií]a|contabilid|notar|solicitador/i],
  ["inmobiliaria", /inmobiliaria|imobili[aá]ria|pisos en venta|alquiler de pisos|im[oó]veis/i],
  ["taller", /taller mec|oficina autom|neum[aá]ticos|pneus|chapa y pintura|mec[aá]nica auto/i],
  ["belleza", /peluquer|cabeleirei|est[eé]tica|barber|u[ñn]as|spa |manicur/i],
  ["formacion", /academia|escuela|escola|formaci[oó]n|forma[cç][aã]o|cursos|explica[cç][oõ]es|clases particulares/i],
  ["reformas", /reformas|remodela|construc|constru[cç][aã]o|fontaner|canaliza|electricista|carpinter|pintores/i],
  ["gimnasio", /gimnasio|gin[aá]sio|crossfit|pilates|yoga|entrenador personal|personal trainer/i],
  ["tienda", /tienda|loja|comprar online|carrito|cat[aá]logo de productos|ferreter|librer/i],
];

export function guessType(text: string): BusinessType {
  return TYPES.find(([, re]) => re.test(text))?.[0] ?? "otro";
}

function clean(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function absolute(src: string | null, base: string): string | undefined {
  if (!src || src.startsWith("data:")) return undefined;
  try {
    const u = new URL(src, base);
    return /^https?:$/.test(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}

const ADDRESS_RE = /\b(?:C\/|Calle|Avda\.?|Avenida|Plaza|Pza\.?|Paseo|Ctra\.?|Carretera|Rua|R\.|Av\.|Largo|Travessa|Praça|Estrada)\s+[^|•·]{4,80}?\d{1,4}[^|•·]{0,60}?(?:\b\d{5}\b|\b\d{4}-\d{3}\b)(?:[ ,]+(?!(?:Tel|Telf|Telefone|Teléfono|Email|E-mail|Copyright)\b)[A-ZÁÉÍÓÚÑÇ][\p{L}-]+){0,3}/u;

export function extractProfile(doc: Document, pageUrl: string, name: string): Profile {
  const description = clean(
    doc.querySelector('meta[name="description" i]')?.getAttribute("content") ||
      doc.querySelector('meta[property="og:description" i]')?.getAttribute("content"),
  );
  const h1 = clean(doc.querySelector("h1")?.textContent);

  const services = [
    ...new Set(
      Array.from(doc.querySelectorAll("h2, h3, nav a, .menu a, #menu a"))
        .map((e) => clean(e.textContent))
        .filter((t) => t.length >= 3 && t.length <= 40 && !/^(inicio|home|in[ií]cio|contacto|contactos|contact|aviso legal|privacidad|cookies|blog|english|español|português|ver m[aá]s|leer m[aá]s)$/i.test(t)),
    ),
  ].slice(0, 6);

  const paragraphs = Array.from(doc.querySelectorAll("p"))
    .map((p) => clean(p.textContent))
    .filter((t) => t.length >= 60 && t.length <= 600 && !/cookie|copyright|©|derechos reservados|direitos reservados/i.test(t))
    .slice(0, 3);

  // Titular: su descripción, su h1 o, si no hay, la primera frase de su propio texto.
  const firstSentence = /^.{20,160}?[.!?](?=\s|$)/.exec(paragraphs[0] ?? "")?.[0] ?? "";
  const tagline = (description || (h1 && h1 !== name ? h1 : "") || firstSentence).slice(0, 180);

  const imgs = Array.from(doc.querySelectorAll("img"));
  const logoImg = imgs.find((i) => /logo/i.test(`${i.getAttribute("src")} ${i.alt} ${i.className} ${i.id}`));
  const logo = absolute(logoImg?.getAttribute("src") ?? null, pageUrl);
  const ogImage = absolute(doc.querySelector('meta[property="og:image" i]')?.getAttribute("content") ?? null, pageUrl);
  const images = [
    ...new Set(
      [
        ogImage,
        ...imgs
          .filter((i) => i !== logoImg)
          .filter((i) => {
            const w = Number(i.getAttribute("width") || i.naturalWidth || 0);
            const src = i.getAttribute("src") ?? "";
            return (w === 0 || w >= 200) && !/icon|sprite|pixel|spacer|blank|\.gif$|\.svg$|facebook|twitter|whatsapp|flag/i.test(src);
          })
          .map((i) => absolute(i.getAttribute("src"), pageUrl)),
      ].filter((x): x is string => !!x),
    ),
  ].slice(0, 6);

  const theme = doc.querySelector('meta[name="theme-color" i]')?.getAttribute("content") ?? "";
  const color = /^#[0-9a-f]{6}$/i.test(theme) ? theme.toLowerCase() : undefined;

  const text = textOf(doc.body);
  const address = clean(ADDRESS_RE.exec(text)?.[0]) || undefined;
  const range = /(?:©|copyright)\s*((?:19|20)\d{2})\s*[-–]/i.exec(text);

  return {
    name,
    tagline,
    type: guessType(`${name} ${doc.title} ${description} ${h1} ${services.join(" ")}`),
    services,
    paragraphs,
    images,
    logo,
    color,
    address,
    since: range ? Number(range[1]) : undefined,
  };
}

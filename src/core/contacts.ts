// Extracción de datos de contacto públicos de una página.

export interface Contacts {
  emails: string[];
  phones: string[];
  socials: Record<string, string>;
  /** Enlaces internos que parecen la página de contacto. */
  contactPages: string[];
  /** Formulario de contacto presente en la página. */
  hasContactForm: boolean;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi;
// Ofuscaciones habituales: "info [at] dominio [dot] es", "info(arroba)dominio.es".
const OBFUSCATED_RE = /([a-z0-9._%+-]+)\s*[[(]\s*(?:at|arroba)\s*[\])]\s*([a-z0-9-]+(?:\s*(?:[[(]\s*(?:dot|punto|ponto)\s*[\])]|\.)\s*[a-z0-9-]+)+)/gi;
// Falsos positivos típicos: imágenes con @2x, emails de ejemplo o de plataformas.
const EMAIL_BLOCKLIST = /\.(png|jpe?g|gif|svg|webp|css|js)$|@(example|ejemplo|exemplo|domain|dominio|sentry|wixpress|sentry-next)\.|^(you|your|tu|seu|nombre|name|email|correo)@/i;

const SOCIALS: Array<[string, RegExp]> = [
  ["facebook", /(^|\.)facebook\.com$/],
  ["instagram", /(^|\.)instagram\.com$/],
  ["linkedin", /(^|\.)linkedin\.com$/],
  ["x", /(^|\.)(twitter|x)\.com$/],
  ["youtube", /(^|\.)youtube\.com$/],
  ["tiktok", /(^|\.)tiktok\.com$/],
  ["whatsapp", /(^|\.)(wa\.me|whatsapp\.com)$/],
];

const CONTACT_LINK_RE = /contact|contacto|contactos|contactar|contacte|fale-connosco|onde-estamos|donde-estamos|localizacion/i;

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().replace(/^mailto:/i, "").split("?")[0]!.toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/.test(email)) return null;
  if (EMAIL_BLOCKLIST.test(email)) return null;
  return email;
}

export type Country = "ES" | "PT";

/**
 * Normaliza teléfonos de España (+34, 9 dígitos que empiezan por 6-9) y
 * Portugal (+351, 9 dígitos que empiezan por 2 o 9) a formato E.164.
 * Sin prefijo, un 9xx puede ser de los dos países: decide `country`.
 */
export function normalizePhone(raw: string, country: Country = "ES"): string | null {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (/^\+34[6-9]\d{8}$/.test(digits) || /^\+351[29]\d{8}$/.test(digits)) return digits;
  if (/^[29]\d{8}$/.test(digits) && (country === "PT" || digits.startsWith("2"))) return "+351" + digits;
  if (/^[6-9]\d{8}$/.test(digits)) return "+34" + digits;
  return null;
}

const PHONE_TEXT_RE = /(?:\+|00)?(?:34|351)?[\s.-]?(?:\d[\s.-]?){9}/g;

/** Texto visible separando nodos: "es<br>Móvil" no debe leerse como "esMóvil". */
export function textOf(node: Node | null): string {
  if (!node) return "";
  const doc = node.ownerDocument ?? (node as Document);
  const walker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest("script, style, noscript") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const parts: string[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push(n.nodeValue ?? "");
  return parts.join(" ");
}

export function extractContacts(doc: Document, pageUrl: string, country: Country = "ES"): Contacts {
  const base = new URL(pageUrl);
  const emails = new Set<string>();
  const phones = new Set<string>();
  const socials: Record<string, string> = {};
  const contactPages = new Set<string>();

  for (const a of Array.from(doc.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
    const href = a.getAttribute("href") ?? "";
    if (/^mailto:/i.test(href)) {
      const e = normalizeEmail(decodeURIComponent(href));
      if (e) emails.add(e);
      continue;
    }
    if (/^tel:/i.test(href)) {
      const p = normalizePhone(decodeURIComponent(href.slice(4)), country);
      if (p) phones.add(p);
      continue;
    }
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol)) continue;
    const social = SOCIALS.find(([, re]) => re.test(url.hostname));
    if (social && !socials[social[0]] && !/sharer|share\?|intent\/tweet|\/plugins\//.test(url.href)) {
      socials[social[0]] = url.href;
      continue;
    }
    if (url.hostname === base.hostname && url.pathname !== base.pathname && CONTACT_LINK_RE.test(url.pathname + " " + (a.textContent ?? ""))) {
      url.hash = "";
      contactPages.add(url.href);
    }
  }

  const text = textOf(doc.body);
  for (const m of text.matchAll(EMAIL_RE)) {
    const e = normalizeEmail(m[0]);
    if (e) emails.add(e);
  }
  for (const m of text.matchAll(OBFUSCATED_RE)) {
    const domain = m[2]!.replace(/\s*[[(]\s*(?:dot|punto|ponto)\s*[\])]\s*/gi, ".").replace(/\s+/g, "");
    const e = normalizeEmail(`${m[1]}@${domain}`);
    if (e) emails.add(e);
  }
  for (const m of text.matchAll(PHONE_TEXT_RE)) {
    const p = normalizePhone(m[0], country);
    if (p) phones.add(p);
  }

  const hasContactForm = Array.from(doc.querySelectorAll("form")).some(
    (f) => f.querySelector("textarea") !== null && f.querySelector("input[type=email], input[name*=mail i]") !== null,
  );

  return {
    emails: [...emails],
    phones: [...phones],
    socials,
    contactPages: [...contactPages].slice(0, 3),
    hasContactForm,
  };
}

export function mergeContacts(a: Contacts, b: Contacts): Contacts {
  return {
    emails: [...new Set([...a.emails, ...b.emails])],
    phones: [...new Set([...a.phones, ...b.phones])],
    socials: { ...b.socials, ...a.socials },
    contactPages: a.contactPages,
    hasContactForm: a.hasContactForm || b.hasContactForm,
  };
}

/** Email genérico de empresa (info@, geral@…) frente a uno que identifica a una persona. */
export function isGenericEmail(email: string): boolean {
  return /^(info|informacion|informacao|geral|hola|ola|contact[oa]?|contactos|admin|administracion|reservas?|ventas|vendas|comercial|office|oficina|secretaria|atencion|apoio|clientes?|pedidos|encomendas|hello)@/i.test(email);
}

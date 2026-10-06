import { langOf, type Analysis } from "./analyze";
import type { BusinessType } from "./profile";
import type { Settings } from "./settings";
import { signalText, type Lang } from "./signals";

// Mensajes de primer contacto según el canal disponible:
// email (completo) > WhatsApp/móvil (corto) > teléfono fijo (guion de llamada).

export type Channel = "email" | "whatsapp" | "call";

export interface Draft {
  channel: Channel;
  subject?: string;
  body: string;
  /** Enlace que abre el canal con el mensaje ya escrito (mailto:, wa.me, tel:). */
  link?: string;
}

const WHY: Record<BusinessType, Record<Lang, string>> = {
  restaurante: { es: "En hostelería casi todo el mundo mira la carta y reserva desde el móvil antes de ir.", pt: "Na restauração quase toda a gente vê a ementa e reserva pelo telemóvel antes de ir." },
  hotel: { es: "Cada reserva directa desde vuestra web es una comisión menos para Booking.", pt: "Cada reserva direta no vosso site é uma comissão a menos para o Booking." },
  clinica: { es: "Un paciente nuevo decide en segundos si confía en una clínica según lo que ve en su web.", pt: "Um paciente novo decide em segundos se confia numa clínica pelo que vê no site." },
  dental: { es: "Un paciente nuevo decide en segundos si confía en una clínica dental según lo que ve en su web.", pt: "Um paciente novo decide em segundos se confia numa clínica dentária pelo que vê no site." },
  legal: { es: "En servicios profesionales la web es la primera prueba de seriedad para un cliente nuevo.", pt: "Em serviços profissionais o site é a primeira prova de seriedade para um cliente novo." },
  inmobiliaria: { es: "Quien busca piso compara agencias en el móvil y descarta las que parecen desfasadas.", pt: "Quem procura casa compara agências no telemóvel e descarta as que parecem desatualizadas." },
  taller: { es: "Cuando alguien tiene una avería busca «taller cerca» en el móvil y llama al primero que le da confianza.", pt: "Quando alguém tem uma avaria procura «oficina perto» no telemóvel e liga à primeira que inspira confiança." },
  belleza: { es: "Vuestros clientes quieren ver trabajos, precios y pedir cita desde el móvil en un minuto.", pt: "Os vossos clientes querem ver trabalhos, preços e marcar pelo telemóvel num minuto." },
  tienda: { es: "Una tienda online que no inspira confianza pierde la venta en el último clic.", pt: "Uma loja online que não inspira confiança perde a venda no último clique." },
  formacion: { es: "Las familias y alumnos comparan centros en el móvil antes de pedir información.", pt: "Famílias e alunos comparam escolas no telemóvel antes de pedir informações." },
  reformas: { es: "Antes de pedir presupuesto, la gente mira los trabajos anteriores en la web.", pt: "Antes de pedir orçamento, as pessoas veem os trabalhos anteriores no site." },
  gimnasio: { es: "La gente compara horarios, precios y ambiente en el móvil antes de apuntarse.", pt: "As pessoas comparam horários, preços e ambiente no telemóvel antes de se inscreverem." },
  otro: { es: "Hoy la web es lo primero que mira un cliente nuevo antes de llamaros.", pt: "Hoje o site é a primeira coisa que um cliente novo vê antes de vos contactar." },
};

/** Móviles (para WhatsApp): ES 6xx/7xx, PT 9xx. */
export function isMobile(phone: string): boolean {
  return /^\+34[67]\d{8}$/.test(phone) || /^\+3519\d{8}$/.test(phone);
}

function whatsappNumber(a: Analysis): string | undefined {
  const wa = a.contacts.socials.whatsapp;
  const fromLink = wa ? /(?:wa\.me\/|phone=)\+?(\d{9,15})/.exec(wa)?.[1] : undefined;
  return fromLink ?? a.contacts.phones.find(isMobile)?.slice(1);
}

function signature(s: Settings, lang: Lang): string {
  const lines = [s.senderName && (s.senderRole ? `${s.senderName} · ${s.senderRole}` : s.senderName), s.senderPhone, s.senderWeb].filter(Boolean);
  return lines.length ? lines.join("\n") : lang === "pt" ? "[O teu nome]" : "[Tu nombre]";
}

function intro(s: Settings, lang: Lang): string {
  if (lang === "pt") {
    if (!s.senderName) return "Trabalho em design web";
    return s.senderRole ? `Chamo-me ${s.senderName}, ${s.senderRole}` : `Chamo-me ${s.senderName} e trabalho em design web`;
  }
  if (!s.senderName) return "Me dedico al diseño web";
  return s.senderRole ? `Soy ${s.senderName}, ${s.senderRole}` : `Soy ${s.senderName} y me dedico al diseño web`;
}

function pains(a: Analysis, lang: Lang, n: number): string[] {
  return a.signals.slice(0, n).map((s) => signalText(s.id, lang, s.params, "short"));
}

export function emailDraft(a: Analysis, s: Settings): Draft {
  const lang = langOf(a);
  const top = pains(a, lang, 3);
  const since = a.profile.since;
  const why = WHY[a.profile.type][lang];
  const email = a.contacts.emails[0];
  let subject: string;
  let body: string;
  if (lang === "pt") {
    subject = `${a.name}: ${top.length} melhorias rápidas para o vosso site`;
    body = [
      `Olá, equipa de ${a.name}:`,
      "",
      `${intro(s, "pt")}. Estive a ver o vosso site (${a.domain})${since ? ` e vi que estão no ativo desde pelo menos ${since}, o que diz muito do vosso trabalho` : ""}.`,
      "",
      `Reparei em ${top.length === 1 ? "algo que pode" : "algumas coisas que podem"} estar a fazer-vos perder clientes:`,
      ...top.map((p, i) => `${i + 1}. ${p[0]!.toUpperCase()}${p.slice(1)}.`),
      "",
      why,
      "",
      "Preparei uma ideia de como poderia ficar o site renovado, com os vossos textos e fotos. Posso enviar-vos ou mostrar-vos em 10 minutos esta semana?",
      "",
      "Cumprimentos,",
      signature(s, "pt"),
    ].join("\n");
  } else {
    subject = `${a.name}: ${top.length} mejoras rápidas para vuestra web`;
    body = [
      `Hola, equipo de ${a.name}:`,
      "",
      `${intro(s, "es")}. He estado viendo vuestra web (${a.domain})${since ? ` y veo que lleváis en marcha desde al menos ${since}, que dice mucho de vuestro trabajo` : ""}.`,
      "",
      `He visto ${top.length === 1 ? "algo que puede" : "algunas cosas que pueden"} estar haciéndoos perder clientes:`,
      ...top.map((p, i) => `${i + 1}. ${p[0]!.toUpperCase()}${p.slice(1)}.`),
      "",
      why,
      "",
      "Os he preparado una idea de cómo quedaría la web renovada, con vuestros propios textos y fotos. ¿Os la envío o la vemos en 10 minutos esta semana?",
      "",
      "Un saludo,",
      signature(s, "es"),
    ].join("\n");
  }
  return {
    channel: "email",
    subject,
    body,
    link: email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : undefined,
  };
}

/** Mensaje corto (≈300 caracteres) para WhatsApp. */
export function whatsappDraft(a: Analysis, s: Settings): Draft {
  const lang = langOf(a);
  const [p1, p2] = pains(a, lang, 2);
  const issues = [p1, p2].filter(Boolean).join(lang === "pt" ? " e " : " y ");
  const body =
    lang === "pt"
      ? `Olá! ${intro(s, "pt")}. Vi o site de ${a.name} e reparei que ${issues}. Preparei uma ideia rápida de como ficaria renovado, posso enviar-vos? 🙂`
      : `¡Hola! ${intro(s, "es")}. He visto la web de ${a.name} y me he fijado en que ${issues}. Os he preparado una idea rápida de cómo quedaría renovada, ¿os la paso? 🙂`;
  const num = whatsappNumber(a);
  return { channel: "whatsapp", body, link: num ? `https://wa.me/${num}?text=${encodeURIComponent(body)}` : undefined };
}

export function callDraft(a: Analysis, s: Settings): Draft {
  const lang = langOf(a);
  const top = pains(a, lang, 2);
  const body =
    lang === "pt"
      ? [
          `«Bom dia, falo com ${a.name}? ${intro(s, "pt")}. Liguei porque estive a ver o vosso site e reparei que ${top.join(" e ")}.`,
          `${WHY[a.profile.type].pt}`,
          "Preparei uma ideia de como ficaria renovado. Posso enviar-vos por email ou WhatsApp para verem com calma?»",
          "",
          "Se disserem que não: «Sem problema, obrigada pelo vosso tempo.» (e marca o lead como descartado)",
        ].join("\n")
      : [
          `«Buenos días, ¿hablo con ${a.name}? ${intro(s, "es")}. Os llamo porque he estado viendo vuestra web y me he fijado en que ${top.join(" y ")}.`,
          `${WHY[a.profile.type].es}`,
          "Os he preparado una idea de cómo quedaría renovada. ¿Os la puedo enviar por email o WhatsApp para que la veáis con calma?»",
          "",
          "Si dicen que no: «Sin problema, gracias por vuestro tiempo.» (y marca el lead como descartado)",
        ].join("\n");
  const phone = a.contacts.phones[0];
  return { channel: "call", body, link: phone ? `tel:${phone}` : undefined };
}

/** Canal recomendado con lo que haya disponible. */
export function bestChannel(a: Analysis): Channel {
  if (a.contacts.emails.length) return "email";
  if (whatsappNumber(a)) return "whatsapp";
  return "call";
}

export function drafts(a: Analysis, s: Settings): Draft[] {
  const all = [emailDraft(a, s), whatsappDraft(a, s), callDraft(a, s)];
  const best = bestChannel(a);
  return all.sort((x, y) => Number(y.channel === best) - Number(x.channel === best));
}

/** Recordatorio legal según el país (ver docs/LEGAL.md). */
export function outreachNote(a: Analysis): string {
  if (a.country === "PT") {
    return "Portugal: puedes escribir a empresas salvo que estén en la lista de oposición de la DGC o se hayan opuesto. A emails o móviles personales, solo con consentimiento.";
  }
  return "España: email y WhatsApp comerciales sin consentimiento previo están prohibidos también entre empresas (LSSI art. 21). Lo seguro es llamar o ir en persona y enviar la propuesta cuando te digan que sí.";
}

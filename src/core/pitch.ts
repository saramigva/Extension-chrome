import type { Analysis } from "./analyze";

/** Guion breve para llamada o formulario de contacto, con los 3 motivos de más peso. */
export function buildPitch(a: Analysis, sender = ""): string {
  const top = a.signals.slice(0, 3).map((s) => `• ${s.pitch}`);
  if (a.country === "PT") {
    return [
      `Olá, equipa de ${a.name}.`,
      "",
      `Estive a ver o vosso site (${a.domain}) e reparei em algumas coisas que podem estar a afastar clientes:`,
      ...top,
      "",
      "Posso enviar-vos, sem compromisso, uma proposta para o modernizar. Faz sentido falarmos 10 minutos esta semana?",
      sender ? `\n${sender}` : "",
    ].join("\n").trim();
  }
  return [
    `Hola, equipo de ${a.name}.`,
    "",
    `He estado mirando vuestra web (${a.domain}) y he visto algunas cosas que pueden estar haciéndoos perder clientes:`,
    ...top,
    "",
    "Si os interesa, os preparo sin compromiso una propuesta para modernizarla. ¿Os viene bien hablar 10 minutos esta semana?",
    sender ? `\n${sender}` : "",
  ].join("\n").trim();
}

/** Recordatorio legal según el país (ver docs/LEGAL.md). */
export function outreachNote(a: Analysis): string {
  if (a.country === "PT") {
    return "Portugal: puedes escribir por email a empresas salvo que estén en la lista de oposición de la DGC o se hayan opuesto. Con emails personales (nombre@gmail…) necesitas consentimiento.";
  }
  return "España: el email comercial sin consentimiento previo está prohibido también entre empresas (LSSI art. 21). Mejor teléfono o visita; usar su formulario de contacto para vender es una zona gris.";
}

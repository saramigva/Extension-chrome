import { langOf, type Analysis } from "./analyze";
import { isMobile } from "./outreach";
import type { BusinessType } from "./profile";
import type { Settings } from "./settings";

// Genera una web de demostración moderna con el contenido real del negocio
// (nombre, textos, fotos, contactos). HTML autónomo: se puede descargar y enviar.

const PALETTE: Record<BusinessType, string> = {
  restaurante: "#b54708", hotel: "#155eef", clinica: "#0e9384", dental: "#0086c9", legal: "#344054",
  inmobiliaria: "#c11574", taller: "#d92d20", belleza: "#dd2590", tienda: "#6938ef", formacion: "#3e4784",
  reformas: "#dc6803", gimnasio: "#e62e05", otro: "#6941c6",
};

const DEFAULT_SERVICES: Record<BusinessType, { es: string[]; pt: string[] }> = {
  restaurante: { es: ["Nuestra carta", "Menú del día", "Reservas", "Eventos"], pt: ["A nossa ementa", "Menu do dia", "Reservas", "Eventos"] },
  hotel: { es: ["Habitaciones", "Servicios", "Ubicación", "Reserva directa"], pt: ["Quartos", "Serviços", "Localização", "Reserva direta"] },
  clinica: { es: ["Especialidades", "Equipo", "Primera visita", "Pedir cita"], pt: ["Especialidades", "Equipa", "Primeira consulta", "Marcar consulta"] },
  dental: { es: ["Tratamientos", "Implantes", "Ortodoncia", "Pedir cita"], pt: ["Tratamentos", "Implantes", "Ortodontia", "Marcar consulta"] },
  legal: { es: ["Áreas de práctica", "Equipo", "Primera consulta", "Contacto"], pt: ["Áreas de prática", "Equipa", "Primeira consulta", "Contacto"] },
  inmobiliaria: { es: ["Comprar", "Alquilar", "Vender tu casa", "Valoración gratis"], pt: ["Comprar", "Arrendar", "Vender casa", "Avaliação grátis"] },
  taller: { es: ["Mecánica general", "Neumáticos", "Revisión pre-ITV", "Pedir cita"], pt: ["Mecânica geral", "Pneus", "Pré-inspeção", "Marcar"] },
  belleza: { es: ["Servicios", "Tarifas", "Trabajos", "Reservar cita"], pt: ["Serviços", "Preços", "Trabalhos", "Marcar"] },
  tienda: { es: ["Novedades", "Categorías", "Envíos", "Atención al cliente"], pt: ["Novidades", "Categorias", "Envios", "Apoio ao cliente"] },
  formacion: { es: ["Cursos", "Horarios", "Profesorado", "Matrícula"], pt: ["Cursos", "Horários", "Professores", "Inscrições"] },
  reformas: { es: ["Reformas integrales", "Cocinas y baños", "Trabajos realizados", "Presupuesto"], pt: ["Remodelações", "Cozinhas e WC", "Trabalhos feitos", "Orçamento"] },
  gimnasio: { es: ["Actividades", "Horarios", "Tarifas", "Clase de prueba"], pt: ["Atividades", "Horários", "Preços", "Aula experimental"] },
  otro: { es: ["Servicios", "Quiénes somos", "Opiniones", "Contacto"], pt: ["Serviços", "Quem somos", "Opiniões", "Contacto"] },
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** URL segura dentro de un url("…") en CSS (las entidades HTML no se decodifican en <style>). */
function cssUrl(u: string): string {
  return u.replace(/["'\\\n\r<>()]/g, (c) => encodeURIComponent(c));
}

export function buildDemoHtml(a: Analysis, s: Settings, year = new Date().getFullYear()): string {
  const lang = langOf(a);
  const pt = lang === "pt";
  const p = a.profile;
  const color = p.color ?? PALETTE[p.type];
  const services = p.services.length >= 3 ? p.services.slice(0, 6) : DEFAULT_SERVICES[p.type][lang];
  const phone = a.contacts.phones[0];
  const mobile = a.contacts.phones.find(isMobile);
  const email = a.contacts.emails[0];
  const mapsQuery = encodeURIComponent(p.address ?? a.name);
  const tagline = p.tagline || (pt ? `Bem-vindos a ${a.name}` : `Bienvenidos a ${a.name}`);
  const about = p.paragraphs.slice(0, 2);
  const hero = p.images[0];
  const gallery = p.images.slice(1, 7);
  const t = {
    call: pt ? "Ligar agora" : "Llamar ahora",
    wa: "WhatsApp",
    route: pt ? "Como chegar" : "Cómo llegar",
    services: pt ? "O que fazemos" : "Qué hacemos",
    about: pt ? "Quem somos" : "Quiénes somos",
    gallery: pt ? "Galeria" : "Galería",
    contact: pt ? "Fale connosco" : "Contacto",
    write: pt ? "Escrever email" : "Escribir email",
    banner: pt ? "Proposta de redesign" : "Propuesta de rediseño",
    by: pt ? "preparada por" : "preparada por",
    rights: pt ? "Todos os direitos reservados." : "Todos los derechos reservados.",
  };
  const ctas = [
    phone ? `<a class="btn" href="tel:${esc(phone)}">${t.call}</a>` : "",
    mobile ? `<a class="btn ghost" href="https://wa.me/${esc(mobile.slice(1))}">${t.wa}</a>` : "",
    `<a class="btn ghost" href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}">${t.route}</a>`,
  ].join("");

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(a.name)}</title>
<meta name="description" content="${esc(tagline)}">
<style>
:root { --c: ${color}; --ink: #101828; --soft: #f5f5f6; }
* { box-sizing: border-box; }
body { margin: 0; font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--ink); background: #fff; }
a { color: inherit; }
.banner { background: #101828; color: #fff; font-size: 13px; text-align: center; padding: 6px 12px; }
header { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 6vw; background: rgba(255,255,255,.92); backdrop-filter: blur(8px); border-bottom: 1px solid #eaecf0; }
header .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; text-decoration: none; }
header img { height: 36px; width: auto; }
nav { display: flex; gap: 18px; font-size: 14px; }
nav a { text-decoration: none; opacity: .8; }
.hero { position: relative; min-height: 72vh; display: grid; place-items: center; text-align: center; color: #fff; padding: 80px 6vw;
  background: ${hero ? `linear-gradient(rgba(16,24,40,.55), rgba(16,24,40,.65)), url("${cssUrl(hero)}") center/cover` : `linear-gradient(135deg, var(--c), #101828)`}; }
.hero h1 { font-size: clamp(34px, 6vw, 64px); line-height: 1.05; margin: 0 0 16px; letter-spacing: -.02em; }
.hero p { font-size: clamp(17px, 2.2vw, 21px); max-width: 680px; margin: 0 auto 28px; opacity: .92; }
.btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.btn { display: inline-block; padding: 13px 24px; border-radius: 999px; background: var(--c); color: #fff; text-decoration: none; font-weight: 600; }
.btn.ghost { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.5); }
section { padding: 72px 6vw; }
h2 { font-size: clamp(26px, 3.5vw, 38px); margin: 0 0 28px; letter-spacing: -.01em; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }
.card { background: var(--soft); border-radius: 16px; padding: 26px; font-weight: 600; font-size: 18px; border-top: 4px solid var(--c); }
.about { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 40px; align-items: center; background: var(--soft); }
.about img { width: 100%; border-radius: 16px; aspect-ratio: 4/3; object-fit: cover; }
.gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.gallery img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 12px; }
.contact { background: #101828; color: #fff; text-align: center; }
.contact p { opacity: .85; margin: 6px 0; }
footer { text-align: center; font-size: 13px; color: #667085; padding: 24px; }
@media (max-width: 720px) { nav { display: none; } section { padding: 56px 6vw; } }
</style>
</head>
<body>
<div class="banner">${t.banner} · ${esc(a.domain)}${s.senderName ? ` · ${t.by} ${esc(s.senderName)}` : ""}</div>
<header>
  <a class="brand" href="#">${p.logo ? `<img src="${esc(p.logo)}" alt="">` : ""}<span>${esc(a.name)}</span></a>
  <nav><a href="#servicios">${t.services}</a>${about.length ? `<a href="#nosotros">${t.about}</a>` : ""}<a href="#contacto">${t.contact}</a></nav>
</header>
<div class="hero"><div><h1>${esc(a.name)}</h1><p>${esc(tagline)}</p><div class="btns">${ctas}</div></div></div>
<section id="servicios"><h2>${t.services}</h2><div class="grid">${services.map((x) => `<div class="card">${esc(x)}</div>`).join("")}</div></section>
${about.length ? `<section id="nosotros" class="about"><div><h2>${t.about}</h2>${about.map((x) => `<p>${esc(x)}</p>`).join("")}</div>${gallery[0] ? `<img src="${esc(gallery[0])}" alt="">` : ""}</section>` : ""}
${gallery.length >= 2 ? `<section><h2>${t.gallery}</h2><div class="gallery">${gallery.map((g) => `<img src="${esc(g)}" alt="" loading="lazy">`).join("")}</div></section>` : ""}
<section id="contacto" class="contact"><h2>${t.contact}</h2>
${phone ? `<p>☎ <a href="tel:${esc(phone)}">${esc(phone)}</a></p>` : ""}
${email ? `<p>✉ <a href="mailto:${esc(email)}">${esc(email)}</a></p>` : ""}
${p.address ? `<p>📍 ${esc(p.address)}</p>` : ""}
<div class="btns" style="margin-top:20px">${ctas}</div>
</section>
<footer>© ${year} ${esc(a.name)}. ${t.rights}</footer>
</body>
</html>`;
}

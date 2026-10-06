import { explain, type Analysis } from "../core/analyze";
import { isGenericEmail } from "../core/contacts";
import { bestChannel, drafts, outreachNote, type Channel, type Draft } from "../core/outreach";
import type { Settings } from "../core/settings";
import { el } from "./dom";

// Informe compartido por el popup y el panel flotante dentro de la página.

export interface ReportActions {
  save: () => Promise<void>;
  demo: () => Promise<void>;
  /** Reescritura con IA local; solo se pasa si está disponible. */
  rewrite?: (draft: Draft) => Promise<string>;
}

const CHANNEL_LABEL: Record<Channel, string> = { email: "Email", whatsapp: "WhatsApp", call: "Llamada" };
const OPEN_LABEL: Record<Channel, string> = { email: "Abrir en el correo", whatsapp: "Abrir WhatsApp", call: "Llamar" };

/** Copia al portapapeles; en páginas http (sin API de portapapeles) usa execCommand. */
export async function copyText(text: string, button?: HTMLButtonElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = el("textarea", { value: text });
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    const root = button?.getRootNode();
    (root instanceof ShadowRoot ? root : document.body).append(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  if (button) {
    const prev = button.textContent;
    button.textContent = "¡Copiado!";
    setTimeout(() => (button.textContent = prev), 1200);
  }
}

function contactRow(label: string, value: string, href?: string): HTMLElement {
  const btn = el("button", { textContent: "Copiar" });
  btn.onclick = () => void copyText(value, btn);
  return el("div", { className: "contact" }, el("span", {}, href ? el("a", { href, target: "_blank", rel: "noopener" }, label) : label), btn);
}

function draftsBox(a: Analysis, settings: Settings, actions: ReportActions): HTMLElement {
  const list = drafts(a, settings);
  const best = bestChannel(a);
  const box = el("div");
  const tabs = el("div", { className: "tabs" });
  const body = el("div");
  const show = (d: Draft) => {
    for (const b of Array.from(tabs.children)) b.setAttribute("aria-pressed", String((b as HTMLElement).dataset.ch === d.channel));
    const subject = d.subject !== undefined ? el("input", { className: "subject", value: d.subject }) : null;
    const text = el("textarea", { className: "draft", value: d.body });
    const current = (): Draft => ({ ...d, subject: subject?.value, body: text.value });
    const copyBtn = el("button", { className: "primary", textContent: "Copiar" });
    copyBtn.onclick = () => void copyText(subject ? `Asunto: ${subject.value}\n\n${text.value}` : text.value, copyBtn);
    const buttons: HTMLElement[] = [copyBtn];
    const link = linkFor(current());
    if (link) {
      const open = el("button", { textContent: OPEN_LABEL[d.channel] });
      open.onclick = () => window.open(linkFor(current()), "_blank", "noopener");
      buttons.push(open);
    }
    if (actions.rewrite && d.channel !== "call") {
      const ai = el("button", { textContent: "✨ Reescribir con IA" });
      ai.onclick = async () => {
        ai.disabled = true;
        ai.textContent = "Escribiendo…";
        try {
          text.value = await actions.rewrite!(current());
        } catch (err) {
          ai.title = String(err);
        } finally {
          ai.disabled = false;
          ai.textContent = "✨ Reescribir con IA";
        }
      };
      buttons.push(ai);
    }
    body.replaceChildren(...(subject ? [subject] : []), text, el("div", { className: "row" }, ...buttons));
  };
  for (const d of list) {
    const b = el("button", { textContent: CHANNEL_LABEL[d.channel] });
    b.dataset.ch = d.channel;
    if (d.channel === best) b.append(el("span", { className: "best" }, "mejor"));
    b.onclick = () => show(d);
    tabs.append(b);
  }
  box.append(tabs, body);
  show(list[0]!);
  return box;
}

/** Recalcula el enlace con el texto editado por el usuario. */
function linkFor(d: Draft): string | undefined {
  if (!d.link) return undefined;
  if (d.channel === "email") return d.link.replace(/\?.*$/, `?subject=${encodeURIComponent(d.subject ?? "")}&body=${encodeURIComponent(d.body)}`);
  if (d.channel === "whatsapp") return d.link.replace(/\?.*$/, `?text=${encodeURIComponent(d.body)}`);
  return d.link;
}

export function renderReport(a: Analysis, settings: Settings, actions: ReportActions): HTMLElement {
  const contacts: HTMLElement[] = [];
  for (const e of a.contacts.emails) contacts.push(contactRow(`${e}${isGenericEmail(e) ? "" : " · personal"}`, e, `mailto:${e}`));
  for (const p of a.contacts.phones) contacts.push(contactRow(p, p, `tel:${p}`));
  for (const [net, url] of Object.entries(a.contacts.socials)) contacts.push(contactRow(net, url, url));
  if (a.contacts.hasContactForm) contacts.push(el("p", { className: "small muted" }, "Tiene formulario de contacto."));
  if (contacts.length === 0) contacts.push(el("p", { className: "muted" }, "No hay contactos públicos en la web ni en su página de contacto."));

  const save = el("button", { textContent: "Guardar lead" });
  save.onclick = async () => {
    await actions.save();
    save.textContent = "Guardado ✓";
    save.disabled = true;
  };
  const demo = el("button", { className: "primary", textContent: "Ver demo antes/después" });
  demo.onclick = () => void actions.demo();

  return el(
    "div",
    { className: "rw" },
    el(
      "div",
      { className: `score ${a.verdict}` },
      el("div", { className: "num" }, String(a.score)),
      el(
        "div",
        {},
        el("strong", {}, a.name),
        el("div", { className: "muted small" }, [a.domain, a.country === "?" ? "" : a.country, a.profile.type !== "otro" ? a.profile.type : "", ...a.tech].filter(Boolean).join(" · ")),
        el("div", { className: `tag ${a.verdict}` }, `Web ${a.verdict}`),
      ),
    ),
    el("h2", {}, a.signals.length ? "Puntos de dolor" : "Sin problemas evidentes"),
    a.signals.length
      ? el("ul", { className: "signals" }, ...a.signals.map((s) => el("li", {}, explain(s), " ", el("span", { className: "pts" }, `+${s.points}`))))
      : el("p", { className: "muted" }, "Parece moderna: probablemente no sea un buen lead."),
    el("h2", {}, "Contacto"),
    ...contacts,
    el("h2", {}, "Mensaje listo para enviar"),
    draftsBox(a, settings, actions),
    el("p", { className: "note" }, outreachNote(a)),
    el("div", { className: "row" }, demo, save),
  );
}

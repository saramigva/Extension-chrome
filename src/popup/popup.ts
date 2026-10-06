import type { Analysis } from "../core/analyze";
import { isGenericEmail } from "../core/contacts";
import { saveLead } from "../core/leads";
import { buildPitch, outreachNote } from "../core/pitch";
import { scanTab } from "../core/scan";
import { copy, el } from "../ui/dom";

const out = document.querySelector<HTMLElement>("#out")!;

function contactRow(label: string, value: string, href?: string): HTMLElement {
  const btn = el("button", { textContent: "Copiar" });
  btn.onclick = () => void copy(value, btn);
  return el(
    "div",
    { className: "contact" },
    el("span", {}, href ? el("a", { href, target: "_blank", rel: "noopener" }, label) : label),
    btn,
  );
}

function render(a: Analysis): void {
  const contacts: HTMLElement[] = [];
  for (const e of a.contacts.emails) contacts.push(contactRow(`${e}${isGenericEmail(e) ? "" : " · personal"}`, e));
  for (const p of a.contacts.phones) contacts.push(contactRow(p, p, `tel:${p}`));
  for (const [net, url] of Object.entries(a.contacts.socials)) contacts.push(contactRow(net, url, url));
  if (a.contacts.hasContactForm) contacts.push(el("p", { className: "small muted" }, "Tiene formulario de contacto."));
  if (contacts.length === 0) contacts.push(el("p", { className: "muted" }, "No se han encontrado contactos públicos en la página ni en su página de contacto."));

  const save = el("button", { className: "primary", textContent: "Guardar lead" });
  save.onclick = async () => {
    await saveLead(a);
    save.textContent = "Guardado ✓";
    save.disabled = true;
  };
  const pitchBtn = el("button", { textContent: "Copiar guion" });
  pitchBtn.onclick = () => void copy(buildPitch(a), pitchBtn);
  if (a.signals.length === 0) pitchBtn.disabled = true;

  out.replaceChildren(
    el(
      "div",
      { className: `score ${a.verdict}` },
      el("div", { className: "num" }, String(a.score)),
      el(
        "div",
        {},
        el("strong", {}, a.name),
        el("div", { className: "muted small" }, `${a.domain} · ${a.country === "?" ? "país desconocido" : a.country}${a.tech.length ? " · " + a.tech.join(", ") : ""}`),
        el("div", { className: `tag ${a.verdict}` }, `Web ${a.verdict}`),
      ),
    ),
    el("h2", {}, a.signals.length ? "Por qué (argumentos de venta)" : "Sin problemas evidentes"),
    a.signals.length
      ? el("ul", { className: "signals" }, ...a.signals.map((s) => el("li", {}, s.pitch, " ", el("span", { className: "pts" }, `+${s.points}`))))
      : el("p", { className: "muted" }, "Esta web parece moderna: probablemente no sea un buen lead."),
    el("h2", {}, "Contacto"),
    ...contacts,
    el("p", { className: "note" }, outreachNote(a)),
    el("div", { className: "row actions" }, save, pitchBtn),
  );
}

async function main(): Promise<void> {
  // ?tab=<id> permite abrir el popup como página para depurar otra pestaña.
  const forced = Number(new URLSearchParams(location.search).get("tab"));
  const [tab] = forced ? [{ id: forced }] : await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No hay pestaña activa.");
  render(await scanTab(tab.id));
}

main().catch((err: unknown) => {
  out.replaceChildren(el("p", { className: "error" }, err instanceof Error ? err.message : String(err)));
});

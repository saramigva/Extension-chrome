import type { Analysis } from "../core/analyze";
import { buildDemoHtml } from "../core/demo";
import { loadSettings } from "../core/settings";
import { download, el } from "../ui/dom";

const domain = new URLSearchParams(location.search).get("d") ?? "";
const stage = document.querySelector<HTMLElement>("#stage")!;
const before = document.querySelector<HTMLElement>("#before")!;
const after = document.querySelector<HTMLElement>("#after")!;
const frame = document.querySelector<HTMLIFrameElement>("#frame")!;
const frameWrap = document.querySelector<HTMLElement>("#frame-wrap")!;

function pressGroup(group: HTMLElement, attr: string, value: string): void {
  for (const b of Array.from(group.querySelectorAll<HTMLButtonElement>("button"))) b.setAttribute("aria-pressed", String(b.dataset[attr] === value));
}

async function main(): Promise<void> {
  const data = (await chrome.storage.local.get(`demo:${domain}`))[`demo:${domain}`] as { analysis: Analysis; shot?: string } | undefined;
  if (!data) {
    stage.replaceChildren(el("p", { className: "missing muted" }, "No hay datos para esta demo. Ábrela desde el panel de Radar en la web del negocio."));
    return;
  }
  const { analysis: a, shot } = data;
  const settings = await loadSettings();
  const html = buildDemoHtml(a, settings);
  document.title = `Demo · ${a.name}`;
  document.querySelector("#title")!.textContent = `${a.name} · ${a.score}/100`;
  frame.srcdoc = html;

  document.querySelector("#before-body")!.replaceChildren(
    shot
      ? el("img", { src: shot, alt: `Captura de ${a.domain}` })
      : el("p", { className: "missing muted" }, "Sin captura. ", el("a", { href: a.url, target: "_blank", rel: "noopener" }, `Abrir ${a.domain}`), " y pulsa «Ver demo» desde allí para incluirla."),
  );

  const views = document.querySelector<HTMLElement>("#views")!;
  views.onclick = (e) => {
    const v = (e.target as HTMLElement).closest("button")?.dataset.v;
    if (!v) return;
    pressGroup(views, "v", v);
    stage.classList.toggle("both", v === "both");
    before.hidden = v === "after";
    after.hidden = v === "before";
  };
  const device = document.querySelector<HTMLElement>("#device")!;
  device.onclick = (e) => {
    const d = (e.target as HTMLElement).closest("button")?.dataset.d;
    if (!d) return;
    pressGroup(device, "d", d);
    frameWrap.classList.toggle("mobile", d === "mobile");
  };
  document.querySelector<HTMLButtonElement>("#download")!.onclick = () =>
    download(`propuesta-${a.domain}.html`, html, "text/html;charset=utf-8");
}

void main();

import { todayIso } from "../core/dates";
import { detectCandidates, type Candidate } from "../core/detect";
import { matchKnownErrors, type KnownError } from "../core/errors";
import { t, formatDate } from "../core/i18n";
import { siteFor, type Site } from "../core/sites";
import type { AddDetectedMessage } from "../background/index";
import css from "./panel.css";

// Este script solo LEE la página y muestra avisos propios en un Shadow DOM.
// No rellena campos, no pulsa botones, no envía nada a ningún servidor.

const site = siteFor(location.hostname);
if (site) start(site);

function start(site: Site): void {
  const host = document.createElement("tramita-root");
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = css;
  const container = document.createElement("div");
  container.className = "stack";
  shadow.append(style, container);
  document.documentElement.append(host);

  const dismissed = new Set<string>();
  let lastSignature = "";

  const scan = (): void => {
    const text = document.body?.innerText ?? "";
    const errors = matchKnownErrors(text, site.country).filter((e) => !dismissed.has(e.id));
    const candidates = site.inbox ? detectCandidates(document.body, site.country, todayIso()) : [];
    const signature = errors.map((e) => e.id).join() + "|" + candidates.map((c) => c.availableOn + c.title).join();
    if (signature === lastSignature) return;
    lastSignature = signature;
    render(container, site, errors, candidates, (id) => {
      dismissed.add(id);
      lastSignature = "";
      scan();
    });
  };

  let timer: number | undefined;
  new MutationObserver((mutations) => {
    // Ignora los cambios que hacemos nosotros mismos.
    if (mutations.every((m) => host.contains(m.target))) return;
    clearTimeout(timer);
    timer = window.setTimeout(scan, 800);
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  scan();
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function render(
  container: HTMLElement,
  site: Site,
  errors: KnownError[],
  candidates: Candidate[],
  dismiss: (id: string) => void,
): void {
  container.replaceChildren();

  for (const e of errors) {
    container.append(
      el(
        "div",
        { className: "card error" },
        el("strong", {}, `Tramita · ${t(e.titleKey)}`),
        el("p", {}, t(e.fixKey)),
        el("a", { href: e.source, target: "_blank", rel: "noopener" }, t("source")),
        el("button", { className: "close", title: t("dismiss"), onclick: () => dismiss(e.id) }, "×"),
      ),
    );
  }

  if (candidates.length === 0) return;
  const list = el("ul");
  const boxes: Array<[HTMLInputElement, Candidate]> = [];
  for (const c of candidates) {
    const box = el("input", { type: "checkbox", checked: true });
    boxes.push([box, c]);
    list.append(el("li", {}, el("label", { title: c.context }, box, ` ${formatDate(c.availableOn)} — ${c.title}`)));
  }
  const status = el("p", { className: "status" });
  const add = el("button", { className: "primary" }, t("addSelected"));
  add.onclick = async () => {
    const chosen = boxes.filter(([b]) => b.checked).map(([, c]) => c);
    if (chosen.length === 0) return;
    add.disabled = true;
    const msg: AddDetectedMessage = { type: "add-detected", issuer: site.issuer, ruleId: site.defaultRule, candidates: chosen };
    const res = (await chrome.runtime.sendMessage(msg)) as { added?: number; error?: string };
    status.textContent = res.error ? res.error : t("addedN", String(res.added ?? 0));
  };
  const details = el(
    "details",
    { className: "card" },
    el("summary", {}, `Tramita · ${t("foundN", String(candidates.length))}`),
    el("p", { className: "hint" }, t("detectHint")),
    list,
    add,
    status,
  );
  container.append(details);
}

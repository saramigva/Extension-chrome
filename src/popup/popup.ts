import { todayIso } from "../core/dates";
import { buildIcs } from "../core/ics";
import { sortByUrgency, type ItemStatus, type TrackedItem } from "../core/items";
import { t, formatDate } from "../core/i18n";
import { DELIVERY_RULES, RESPONSE_PRESETS, type DeliveryRuleId, type ResponseUnit } from "../core/rules";
import { loadItems, newId, removeItem, upsertItem } from "../core/storage";

const form = document.querySelector<HTMLFormElement>("#form")!;
const list = document.querySelector<HTMLElement>("#list")!;
const toggle = document.querySelector<HTMLButtonElement>("#toggle-form")!;
const ruleSelect = form.elements.namedItem("ruleId") as HTMLSelectElement;
const presetSelect = form.elements.namedItem("preset") as HTMLSelectElement;
const custom = document.querySelector<HTMLElement>("#custom")!;

for (const node of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
  node.textContent = t(node.dataset.i18n!);
}

// Por defecto, la regla del país que coincide con el idioma del navegador.
const preferred = chrome.i18n.getUILanguage().startsWith("pt") ? "PT" : "ES";
const rules = Object.values(DELIVERY_RULES).sort((a, b) => Number(a.country !== preferred) - Number(b.country !== preferred));
for (const r of rules) ruleSelect.append(new Option(`${r.country} · ${t(r.labelKey)}`, r.id));

function fillPresets(): void {
  const country = DELIVERY_RULES[ruleSelect.value as DeliveryRuleId].country;
  presetSelect.replaceChildren(new Option(t("presetNone"), ""));
  for (const p of RESPONSE_PRESETS.filter((p) => p.country === country)) presetSelect.append(new Option(t(p.labelKey), p.id));
  presetSelect.append(new Option(t("presetCustom"), "custom"));
  custom.hidden = true;
}
ruleSelect.onchange = fillPresets;
presetSelect.onchange = () => (custom.hidden = presetSelect.value !== "custom");
fillPresets();

toggle.onclick = () => {
  form.hidden = !form.hidden;
  if (!form.hidden) (form.elements.namedItem("title") as HTMLInputElement).focus();
};

form.onsubmit = async (ev) => {
  ev.preventDefault();
  const data = new FormData(form);
  const str = (k: string) => String(data.get(k) ?? "").trim();
  const availableOn = str("availableOn");
  const accessedOn = str("accessedOn") || undefined;
  if (accessedOn && accessedOn < availableOn) {
    alert(t("errAccessedBefore"));
    return;
  }
  let response: TrackedItem["response"];
  const preset = RESPONSE_PRESETS.find((p) => p.id === str("preset"));
  if (preset) response = { amount: preset.amount, unit: preset.unit };
  else if (str("preset") === "custom") {
    const amount = Number(str("amount"));
    if (!Number.isInteger(amount) || amount < 1) {
      alert(t("errAmount"));
      return;
    }
    response = { amount, unit: str("unit") as ResponseUnit };
  }
  await upsertItem({
    id: newId(),
    title: str("title"),
    issuer: str("issuer"),
    ruleId: str("ruleId") as DeliveryRuleId,
    availableOn,
    accessedOn,
    response,
    notes: str("notes") || undefined,
    origin: "manual",
    done: false,
    createdAt: new Date().toISOString(),
  });
  form.reset();
  fillPresets();
  form.hidden = true;
  await render();
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function statusText(s: ItemStatus): string {
  if (s.urgency === "done") return t("stDone");
  if (s.daysLeft < 0) return t("stOverdue", String(-s.daysLeft));
  if (s.daysLeft === 0) return t("stToday");
  return t("stDaysLeft", String(s.daysLeft));
}

function downloadIcs(item: TrackedItem, s: ItemStatus): void {
  const ics = buildIcs({
    uid: item.id,
    date: s.keyDate,
    summary: `${item.issuer}: ${item.title}`,
    description: `${t(s.keyKind === "response" ? "keyResponse" : "keyNotified")}. ${t("disclaimer")}`,
    stamp: new Date(),
  });
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = el("a", { href: url, download: `tramita-${s.keyDate}.ics` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function render(): Promise<void> {
  const rows = sortByUrgency(await loadItems(), todayIso());
  if (rows.length === 0) {
    list.replaceChildren(el("p", { className: "empty" }, t("empty")));
    return;
  }
  list.replaceChildren(
    ...rows.map(({ item, status }) => {
      const rule = DELIVERY_RULES[item.ruleId];
      const notified =
        `${t("notifiedOn")}: ${formatDate(status.notifiedOn)} ` +
        `(${t(status.notifiedBasis === "accessed" ? "basisAccessed" : "basisPresumed")})`;
      const lines = [el("p", { className: "meta" }, `${t("availableOn")}: ${formatDate(item.availableOn)}`), el("p", { className: "meta" }, notified)];
      if (status.keyKind === "response") lines.push(el("p", { className: "meta strong" }, `${t("keyResponse")}: ${formatDate(status.keyDate)}`));
      if (item.notes) lines.push(el("p", { className: "meta" }, item.notes));
      const actions = el(
        "div",
        { className: "actions" },
        el("button", {
          textContent: t(item.done ? "reopen" : "markDone"),
          onclick: async () => {
            await upsertItem({ ...item, done: !item.done });
            await render();
          },
        }),
        el("button", { textContent: t("calendar"), onclick: () => downloadIcs(item, status) }),
        el("a", { href: rule.source.startsWith("http") ? rule.source : "#", target: "_blank", rel: "noopener", textContent: t("source"), title: rule.source }),
        el("button", {
          className: "danger",
          textContent: t("delete"),
          onclick: async () => {
            if (!confirm(t("confirmDelete"))) return;
            await removeItem(item.id);
            await render();
          },
        }),
      );
      return el(
        "article",
        { className: `item ${status.urgency}` },
        el("div", { className: "top" }, el("strong", {}, item.title), el("span", { className: "badge" }, statusText(status))),
        el("p", { className: "meta" }, `${item.issuer} · ${rule.country} · ${t(rule.labelKey)}${item.origin === "detected" ? ` · ${t("detected")}` : ""}`),
        ...lines,
        actions,
      );
    }),
  );
}

void render();

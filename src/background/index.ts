import { todayIso } from "../core/dates";
import { sortByUrgency, type TrackedItem } from "../core/items";
import { t, formatDate } from "../core/i18n";
import { loadItems, newId, saveItems } from "../core/storage";
import type { Candidate } from "../core/detect";
import type { DeliveryRuleId } from "../core/rules";

const ALARM = "tramita-check";
const NOTIFIED_KEY = "lastNotified";

export interface AddDetectedMessage {
  type: "add-detected";
  issuer: string;
  ruleId: DeliveryRuleId;
  candidates: Candidate[];
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.alarms.create(ALARM, { periodInMinutes: 6 * 60, delayInMinutes: 1 });
  void refresh();
});

chrome.runtime.onStartup.addListener(() => void refresh());
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) void refresh();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && "items" in changes) void updateBadge();
});

chrome.runtime.onMessage.addListener((msg: AddDetectedMessage, _sender, sendResponse) => {
  if (msg?.type !== "add-detected") return false;
  addDetected(msg).then(sendResponse, (err: unknown) => sendResponse({ error: String(err) }));
  return true; // respuesta asíncrona
});

async function addDetected(msg: AddDetectedMessage): Promise<{ added: number }> {
  const items = await loadItems();
  const exists = new Set(items.map((i) => `${i.issuer}|${i.availableOn}|${i.title}`));
  let added = 0;
  for (const c of msg.candidates) {
    const key = `${msg.issuer}|${c.availableOn}|${c.title}`;
    if (exists.has(key)) continue;
    exists.add(key);
    const item: TrackedItem = {
      id: newId(),
      title: c.title,
      issuer: msg.issuer,
      ruleId: msg.ruleId,
      availableOn: c.availableOn,
      origin: "detected",
      done: false,
      createdAt: new Date().toISOString(),
    };
    items.push(item);
    added++;
  }
  await saveItems(items);
  return { added };
}

async function refresh(): Promise<void> {
  await updateBadge();
  await notifyUrgent();
}

async function updateBadge(): Promise<void> {
  const today = todayIso();
  const urgent = sortByUrgency(await loadItems(), today).filter((x) =>
    ["overdue", "today", "soon"].includes(x.status.urgency),
  );
  await chrome.action.setBadgeText({ text: urgent.length ? String(urgent.length) : "" });
  const overdue = urgent.some((x) => x.status.urgency === "overdue" || x.status.urgency === "today");
  await chrome.action.setBadgeBackgroundColor({ color: overdue ? "#b42318" : "#b54708" });
}

/** Una notificación del sistema por elemento y día, como máximo. */
async function notifyUrgent(): Promise<void> {
  const today = todayIso();
  const stored = (await chrome.storage.local.get(NOTIFIED_KEY))[NOTIFIED_KEY] as Record<string, string> | undefined;
  const last: Record<string, string> = stored ?? {};
  for (const { item, status } of sortByUrgency(await loadItems(), today)) {
    if (!["overdue", "today", "soon"].includes(status.urgency) || last[item.id] === today) continue;
    const when =
      status.urgency === "overdue"
        ? t("notifOverdue", formatDate(status.keyDate))
        : status.urgency === "today"
          ? t("notifToday")
          : t("notifSoon", String(status.daysLeft));
    await chrome.notifications.create(`tramita-${item.id}-${today}`, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: `${item.issuer}: ${item.title}`.slice(0, 80),
      message: `${t(status.keyKind === "response" ? "keyResponse" : "keyNotified")} — ${when}`,
      priority: status.urgency === "soon" ? 1 : 2,
    });
    last[item.id] = today;
  }
  await chrome.storage.local.set({ [NOTIFIED_KEY]: last });
}

chrome.notifications.onClicked.addListener(() => {
  void chrome.action.openPopup?.().catch(() => undefined);
});

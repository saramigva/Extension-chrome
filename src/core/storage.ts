import { validateItem, type TrackedItem } from "./items";

const KEY = "items";

export async function loadItems(): Promise<TrackedItem[]> {
  const data = await chrome.storage.local.get(KEY);
  const raw: unknown = data[KEY];
  return Array.isArray(raw) ? raw.filter(validateItem) : [];
}

export async function saveItems(items: TrackedItem[]): Promise<void> {
  await chrome.storage.local.set({ [KEY]: items });
}

export async function upsertItem(item: TrackedItem): Promise<void> {
  const items = await loadItems();
  const i = items.findIndex((x) => x.id === item.id);
  if (i >= 0) items[i] = item;
  else items.push(item);
  await saveItems(items);
}

export async function removeItem(id: string): Promise<void> {
  await saveItems((await loadItems()).filter((x) => x.id !== id));
}

export function newId(): string {
  return crypto.randomUUID();
}

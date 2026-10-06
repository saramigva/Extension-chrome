import { loadSettings, saveSettings, type Settings } from "../core/settings";

const form = document.querySelector<HTMLFormElement>("#form")!;
const status = document.querySelector<HTMLElement>("#status")!;
const field = (name: keyof Settings) => form.elements.namedItem(name) as HTMLInputElement;

void loadSettings().then((s) => {
  for (const k of ["senderName", "senderRole", "senderPhone", "senderWeb"] as const) field(k).value = s[k];
  field("autoPanel").checked = s.autoPanel;
  field("serpBadges").checked = s.serpBadges;
  field("threshold").value = String(s.threshold);
});

form.onsubmit = async (e) => {
  e.preventDefault();
  const threshold = Math.min(100, Math.max(0, Number(field("threshold").value) || 0));
  await saveSettings({
    senderName: field("senderName").value.trim(),
    senderRole: field("senderRole").value.trim(),
    senderPhone: field("senderPhone").value.trim(),
    senderWeb: field("senderWeb").value.trim(),
    autoPanel: field("autoPanel").checked,
    serpBadges: field("serpBadges").checked,
    threshold,
  });
  status.textContent = "Guardado ✓";
  setTimeout(() => (status.textContent = ""), 1500);
};

import { addDays, type IsoDate } from "./dates";

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Evento de día completo con dos alarmas (3 días y 1 día antes), compatible con Google/Apple/Outlook. */
export function buildIcs(opts: { uid: string; date: IsoDate; summary: string; description: string; stamp: Date }): string {
  const d = opts.date.replace(/-/g, "");
  const end = addDays(opts.date, 1).replace(/-/g, "");
  const stamp = opts.stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const alarm = (trigger: string) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escape(opts.summary)}`, `TRIGGER:${trigger}`, "END:VALARM"];
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tramita//ES-PT//",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@tramita`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escape(opts.summary)}`,
    `DESCRIPTION:${escape(opts.description)}`,
    ...alarm("-P3D"),
    ...alarm("-P1D"),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

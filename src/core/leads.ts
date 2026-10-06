import { explain, type Analysis } from "./analyze";

export type LeadStatus = "nuevo" | "contactado" | "interesado" | "descartado" | "cliente";
export const STATUSES: LeadStatus[] = ["nuevo", "contactado", "interesado", "descartado", "cliente"];

export type LeadSource = "radar" | "google" | "visita" | "manual";

export interface Lead extends Analysis {
  status: LeadStatus;
  notes: string;
  source?: LeadSource;
  /** Zona del radar automático en la que se encontró. */
  zone?: string;
  /** Fecha en que entró en la bandeja (para avisar solo de los nuevos). */
  foundAt?: string;
}

const KEY = "leads";

export async function loadLeads(): Promise<Lead[]> {
  const raw = (await chrome.storage.local.get(KEY))[KEY] as Record<string, Lead> | undefined;
  // Leads de la v0.1 (sin ficha del negocio) se descartan: basta con volver a analizarlos.
  return Object.values(raw ?? {}).filter((l) => l.profile).sort((a, b) => b.score - a.score || b.analyzedAt.localeCompare(a.analyzedAt));
}

/**
 * Guarda o actualiza por dominio, conservando estado, notas y origen si ya existía.
 * Devuelve `isNew` si el dominio no estaba en la bandeja.
 */
export async function saveLead(
  analysis: Analysis,
  patch: Partial<Pick<Lead, "status" | "notes" | "source" | "zone">> = {},
): Promise<{ lead: Lead; isNew: boolean }> {
  const all = ((await chrome.storage.local.get(KEY))[KEY] as Record<string, Lead> | undefined) ?? {};
  const prev = all[analysis.domain];
  const lead: Lead = {
    ...analysis,
    status: prev?.status ?? "nuevo",
    notes: prev?.notes ?? "",
    source: prev?.source ?? patch.source ?? "manual",
    zone: prev?.zone ?? patch.zone,
    foundAt: prev?.foundAt ?? new Date().toISOString(),
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
  };
  all[analysis.domain] = lead;
  await chrome.storage.local.set({ [KEY]: all });
  return { lead, isNew: !prev };
}

export async function hasLead(domain: string): Promise<boolean> {
  const all = ((await chrome.storage.local.get(KEY))[KEY] as Record<string, Lead> | undefined) ?? {};
  return domain in all;
}

export async function updateLead(domain: string, patch: Partial<Pick<Lead, "status" | "notes">>): Promise<void> {
  const all = ((await chrome.storage.local.get(KEY))[KEY] as Record<string, Lead> | undefined) ?? {};
  const lead = all[domain];
  if (!lead) return;
  all[domain] = { ...lead, ...patch };
  await chrome.storage.local.set({ [KEY]: all });
}

export async function deleteLead(domain: string): Promise<void> {
  const all = ((await chrome.storage.local.get(KEY))[KEY] as Record<string, Lead> | undefined) ?? {};
  delete all[domain];
  await chrome.storage.local.set({ [KEY]: all });
}

function cell(value: string | number): string {
  const s = String(value);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV con «;» y BOM: se abre bien en Excel configurado en español o portugués. */
export function toCsv(leads: Lead[]): string {
  const header = ["Nombre", "Dominio", "URL", "Origen", "Zona", "País", "Puntuación", "Veredicto", "Motivos", "Emails", "Teléfonos", "Redes", "Formulario de contacto", "Tecnología", "Estado", "Notas", "Analizada"];
  const rows = leads.map((l) => [
    l.name,
    l.domain,
    l.url,
    l.source ?? "",
    l.zone ?? "",
    l.country,
    l.score,
    l.verdict,
    l.signals.map((s) => explain(s)).join(" | "),
    l.contacts.emails.join(", "),
    l.contacts.phones.join(", "),
    Object.values(l.contacts.socials).join(", "),
    l.contacts.hasContactForm ? "sí" : "no",
    l.tech.join(", "),
    l.status,
    l.notes,
    l.analyzedAt.slice(0, 10),
  ]);
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

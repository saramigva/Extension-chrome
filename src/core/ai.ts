// IA integrada de Chrome (Gemini Nano, Prompt API). Gratis y local: el texto no
// sale del ordenador. Solo existe en equipos compatibles; si no, se usa la plantilla.
// Gemini Nano admite inglés, español y japonés (no portugués).

interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy(): void;
}
interface LanguageModelStatic {
  availability(opts?: unknown): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
  create(opts?: unknown): Promise<LanguageModelSession>;
}

function api(): LanguageModelStatic | undefined {
  return (globalThis as { LanguageModel?: LanguageModelStatic }).LanguageModel;
}

const LANG_OPTS = {
  expectedInputs: [{ type: "text", languages: ["es"] }],
  expectedOutputs: [{ type: "text", languages: ["es"] }],
};

export async function aiAvailable(): Promise<boolean> {
  const lm = api();
  if (!lm) return false;
  try {
    return (await lm.availability(LANG_OPTS)) !== "unavailable";
  } catch {
    return false;
  }
}

/**
 * Reescribe un borrador para que suene más natural, sin inventar datos.
 * `facts` son los únicos hechos que puede usar.
 */
export async function aiRewrite(draft: string, facts: string[], kind: "email" | "whatsapp"): Promise<string> {
  const lm = api();
  if (!lm) throw new Error("La IA integrada de Chrome no está disponible en este equipo.");
  const session = await lm.create({
    ...LANG_OPTS,
    initialPrompts: [
      {
        role: "system",
        content:
          "Eres una profesional del diseño web que escribe mensajes de primer contacto a pequeños negocios en español de España. " +
          "Tono cercano, respetuoso y concreto; nada de frases de marketing vacías. " +
          "Usa SOLO los hechos que te dan; no inventes datos, cifras, nombres ni ofertas. " +
          (kind === "email"
            ? "Máximo 140 palabras. Mantén la línea de saludo y la firma tal cual. Devuelve solo el cuerpo del email."
            : "Máximo 300 caracteres, una sola frase de saludo y una pregunta final. Devuelve solo el mensaje."),
      },
    ],
  });
  try {
    const out = await session.prompt(`Hechos:\n- ${facts.join("\n- ")}\n\nBorrador a mejorar:\n${draft}`);
    return out.trim();
  } finally {
    session.destroy();
  }
}

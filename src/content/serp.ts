import { SKIP_HOSTS, type Message, type Summary } from "../core/messages";
import { loadSettings } from "../core/settings";

// Etiqueta con la nota junto a cada resultado de Google, para ver leads sin entrar.

const COLORS: Record<Summary["verdict"], string> = { anticuada: "#d92d20", mejorable: "#dc6803", moderna: "#079455" };
const SHORT: Record<string, string> = {
  "no-https": "sin HTTPS",
  "no-mobile": "no móvil",
  "stale-copyright": "abandonada",
  "obsolete-tags": "Flash/marcos",
  "table-layout": "tablas",
  "old-wordpress": "WP viejo",
  "old-cms": "CMS viejo",
  "old-jquery": "jQuery viejo",
  slow: "lenta",
};
const DONE = "data-radar";

function badge(text: string, color: string, title = ""): HTMLElement {
  const b = document.createElement("span");
  b.textContent = text;
  b.title = title;
  Object.assign(b.style, {
    display: "inline-block", marginLeft: "8px", padding: "1px 8px", borderRadius: "999px", fontSize: "12px",
    fontWeight: "600", lineHeight: "18px", color: "#fff", background: color, verticalAlign: "middle", fontFamily: "system-ui, sans-serif",
  });
  return b;
}

async function annotate(): Promise<void> {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("#search a[href^='http']:has(h3)")).filter((a) => !a.hasAttribute(DONE));
  for (const a of links) {
    a.setAttribute(DONE, "1");
    let url: URL;
    try {
      url = new URL(a.href);
    } catch {
      continue;
    }
    if (SKIP_HOSTS.test(url.hostname)) continue;
    const h3 = a.querySelector("h3")!;
    const pending = badge("Radar…", "#98a2b3");
    h3.after(pending);
    chrome.runtime
      .sendMessage({ type: "summarize", url: url.origin + "/" } satisfies Message)
      .then((s: Summary | null) => {
        if (!s) return pending.replaceWith(badge("Radar: sin respuesta", "#98a2b3"));
        const why = s.top.map((id) => SHORT[id]).filter(Boolean).join(" · ");
        pending.replaceWith(badge(`Radar ${s.score}${why ? " · " + why : ""}`, COLORS[s.verdict], `Web ${s.verdict}`));
      })
      .catch(() => pending.remove());
  }
}

void loadSettings().then((s) => {
  if (!s.serpBadges) return;
  void annotate();
  // Google carga más resultados al hacer scroll.
  let t: number | undefined;
  new MutationObserver(() => {
    clearTimeout(t);
    t = window.setTimeout(() => void annotate(), 500);
  }).observe(document.body, { childList: true, subtree: true });
});

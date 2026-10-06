import { build, context } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const watch = process.argv.includes("--watch");
const outdir = "dist";

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });
cpSync("public", outdir, { recursive: true });
cpSync("src/popup/popup.html", `${outdir}/popup.html`);
cpSync("src/popup/popup.css", `${outdir}/popup.css`);

const common = {
  bundle: true,
  target: "chrome120",
  outdir,
  loader: { ".css": "text" },
  legalComments: "none",
  logLevel: "info",
};

const configs = [
  { ...common, entryPoints: { background: "src/background/index.ts", popup: "src/popup/popup.ts" }, format: "esm" },
  // Los content scripts no admiten módulos ES.
  { ...common, entryPoints: { content: "src/content/index.ts" }, format: "iife" },
];

if (watch) {
  for (const c of configs) await (await context(c)).watch();
} else {
  await Promise.all(configs.map((c) => build(c)));
}

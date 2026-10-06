import { build, context } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const watch = process.argv.includes("--watch");
const outdir = "dist";

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });
cpSync("public", outdir, { recursive: true });
for (const f of [
  "src/popup/popup.html",
  "src/leads/leads.html",
  "src/demo/demo.html",
  "src/options/options.html",
  "src/offscreen/offscreen.html",
  "src/ui/report.css",
]) {
  cpSync(f, `${outdir}/${f.split("/").pop()}`);
}

const common = { bundle: true, target: "chrome120", outdir, legalComments: "none", logLevel: "info", loader: { ".css": "text" } };
const configs = [
  {
    ...common,
    format: "esm",
    entryPoints: {
      background: "src/background/index.ts",
      popup: "src/popup/popup.ts",
      leads: "src/leads/leads.ts",
      demo: "src/demo/demo.ts",
      options: "src/options/options.ts",
      offscreen: "src/offscreen/offscreen.ts",
    },
  },
  // Los content scripts no admiten módulos ES.
  { ...common, format: "iife", entryPoints: { page: "src/content/page.ts", serp: "src/content/serp.ts" } },
];

if (watch) for (const c of configs) await (await context(c)).watch();
else await Promise.all(configs.map((c) => build(c)));

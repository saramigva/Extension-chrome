import { build, context } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const watch = process.argv.includes("--watch");
const outdir = "dist";

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });
cpSync("public", outdir, { recursive: true });
for (const f of ["src/popup/popup.html", "src/leads/leads.html", "src/ui/ui.css"]) cpSync(f, `${outdir}/${f.split("/").pop()}`);

const config = {
  entryPoints: { popup: "src/popup/popup.ts", leads: "src/leads/leads.ts" },
  bundle: true,
  format: "esm",
  target: "chrome120",
  outdir,
  legalComments: "none",
  logLevel: "info",
};

if (watch) await (await context(config)).watch();
else await build(config);

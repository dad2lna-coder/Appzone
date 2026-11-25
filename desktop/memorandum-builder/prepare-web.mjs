import { build } from "esbuild";
import sveltePlugin from "esbuild-svelte";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, "..", "..", "apps", "memorandum-builder");
const www = join(here, "www");

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

cpSync(join(app, "index.html"), join(www, "index.html"));
for (const dir of ["css", "js", "vendor", "assets", "samples"]) {
  const from = join(app, dir);
  if (existsSync(from)) cpSync(from, join(www, dir), { recursive: true });
}

await build({
  entryPoints: [join(here, "main.js")],
  outfile: join(www, "app.js"),
  bundle: true,
  format: "esm",
  minify: true,
  // The app's .svelte files live outside this folder, so point bare imports
  // like "svelte" at this package's node_modules.
  nodePaths: [join(here, "node_modules")],
  conditions: ["svelte", "browser"],
  mainFields: ["svelte", "browser", "module", "main"],
  plugins: [sveltePlugin({ compilerOptions: { css: "injected" } })],
  logLevel: "info",
});

const indexPath = join(www, "index.html");
let html = readFileSync(indexPath, "utf8");
const bootTag = /<script type="module" src="boot\.js"><\/script>/;
if (!bootTag.test(html)) {
  console.error('prepare-web: could not find <script type="module" src="boot.js"></script> in index.html');
  process.exit(1);
}
html = html.replace(bootTag, '<script type="module" src="app.js"></script>');
html = html.replace(/\s*<noscript>[\s\S]*?<\/noscript>/, "");
writeFileSync(indexPath, html);
console.log("prepare-web: wrote " + www);

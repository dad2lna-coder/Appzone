const SVELTE = "https://esm.sh/svelte@5.59.1";

function svelteUrl(spec) {
  if (spec === "svelte") return SVELTE;
  return SVELTE + spec.slice("svelte".length);
}

const cache = new Map();

async function loadSvelte(url) {
  if (cache.has(url)) return cache.get(url);
  const task = (async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not load " + url + " (" + response.status + ")");
    const source = await response.text();
    const { compile } = await import(SVELTE + "/compiler");
    const result = compile(source, {
      filename: url,
      generate: "client",
      css: "injected",
      dev: false,
    });
    const problems = (result.warnings || []).filter((warning) => warning.code && !String(warning.code).startsWith("a11y"));
    if (problems.length) console.warn(url, problems);
    let code = result.js.code;
    const specs = new Set();
    for (const match of code.matchAll(/(?:from\s+|import\s+)['"]([^'"]+)['"]/g)) specs.add(match[1]);
    const map = {};
    for (const spec of specs) {
      if (spec === "svelte" || spec.startsWith("svelte/")) map[spec] = svelteUrl(spec);
      else if (spec.startsWith(".")) {
        const abs = new URL(spec, url).href;
        map[spec] = abs.endsWith(".svelte") ? await loadSvelte(abs) : abs;
      }
    }
    code = code.replace(/(from\s+|import\s+)['"]([^'"]+)['"]/g, (full, prefix, spec) => {
      return map[spec] ? prefix + '"' + map[spec] + '"' : full;
    });
    return URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  })();
  cache.set(url, task);
  return task;
}

const target = document.getElementById("app");
try {
  const { mount } = await import(SVELTE);
  const blob = await loadSvelte(new URL("./src/App.svelte", import.meta.url).href);
  const mod = await import(blob);
  mount(mod.default, { target });
} catch (error) {
  target.textContent = "Svelte failed to start. This page needs a local web address (not file://) and access to esm.sh. " + (error && error.message ? error.message : error);
  console.error(error);
}

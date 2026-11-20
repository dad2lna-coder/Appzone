/**
 * Load LeaveBid.html in jsdom and snapshot the rendered Results and 5B tables.
 * jsdom is not a leave-bid dependency. Resolve it from
 * apps/example-app/baseline/node_modules (`npm install` in that folder).
 * Does not write apps/example-app/baseline/.
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(here, "../../example-app/LeaveBid.html");
const outDir = path.resolve(here, "../src/domain/__tests__/reference");

function loadJsdom() {
  const candidates = [
    "jsdom",
    path.resolve(here, "../../example-app/baseline/node_modules/jsdom"),
  ];
  const require = createRequire(import.meta.url);
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      /* try the next location */
    }
  }
  throw new Error("jsdom not found. Run npm install in apps/example-app/baseline.");
}

function stubSheetJs(html) {
  const re = /<script[^>]*src=["'][^"']*xlsx[^"']*["'][^>]*>\s*<\/script>/i;
  if (!re.test(html)) throw new Error("SheetJS CDN script tag not found");
  const stub = `<script>window.XLSX={read:function(){return{SheetNames:[],Sheets:{}};},utils:{sheet_to_json:function(){return[];},aoa_to_sheet:function(){return{};},book_new:function(){return{SheetNames:[],Sheets:{}};},book_append_sheet:function(){},sheet_to_csv:function(){return "";}}};</script>`;
  return html.replace(re, stub);
}

function cells(tbody) {
  if (!tbody) throw new Error("missing tbody");
  return [...tbody.querySelectorAll("tr")].map((tr) => [...tr.children].map((cell) => cell.textContent ?? ""));
}

export function captureReference() {
  const { JSDOM, VirtualConsole } = loadJsdom();
  const html = stubSheetJs(fs.readFileSync(htmlPath, "utf8"));
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on("jsdomError", (err) => errors.push(err && err.message ? err.message : String(err)));
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "http://127.0.0.1/LeaveBid.html",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.clear();
      window.alert = () => {};
      window.confirm = () => false;
      window.prompt = () => null;
      window.print = () => {};
      window.scrollTo = () => {};
    },
  });
  const { window } = dom;
  if (typeof window.renderResultsTab !== "function" || typeof window.exportResultsCSV !== "function") {
    throw new Error(`LeaveBid scripts did not install results functions. ${errors.join(" | ")}`);
  }
  window.renderResultsTab();
  window.renderCalendar5BTab();

  let csv = null;
  window.downloadFile = (filename, text, mime) => {
    csv = { filename, text, mime };
  };
  window.exportResultsCSV();
  if (!csv) throw new Error("exportResultsCSV did not call downloadFile");

  const doc = window.document;
  const roleSel = doc.getElementById("cal5bRoleFilter");
  const snapshot = {
    "results-group": cells(doc.getElementById("resultsGroupSummaryTbody")),
    "results-fcfs": cells(doc.getElementById("resultsFcfsSummaryTbody")),
    "results-participants": cells(doc.getElementById("resultsParticipantsTbody")),
    "results-csv": csv,
    "leave-list": {
      roles: [...roleSel.options].map((option) => option.value),
      rows: cells(doc.getElementById("calendarTbody")),
    },
  };
  if (errors.length) throw new Error(`jsdom errors during load: ${errors.join(" | ")}`);
  return snapshot;
}

function writeSnapshots(snapshot) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of Object.keys(snapshot)) {
    fs.writeFileSync(path.join(outDir, `${name}.json`), `${JSON.stringify(snapshot[name], null, 2)}\n`);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  writeSnapshots(captureReference());
  console.log(`wrote reference snapshots to ${outDir}`);
}

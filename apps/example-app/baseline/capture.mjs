/**
 * Load LeaveBid.html in jsdom and snapshot pure-ish outputs of the live page.
 * The SheetJS CDN tag is replaced inline so nothing is fetched. localStorage
 * is cleared before either script runs. Snapshots are taken after both script
 * blocks, including the multiAirportAndPrintFixScript overrides.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { JSDOM, VirtualConsole } from "jsdom";

const here = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(here, "../LeaveBid.html");
export const SNAPSHOT_DIR = path.join(here, "snapshots");

export const SNAPSHOT_FILES = {
  "liability-rows": "computeEmployeeLiabilityRow for every liabilityEmployees entry",
  "ranked-bid-employees": "computeRankedBidEmployees()",
  allocations: "computeWorkgroupAllocations() / recalculateAllocation() per airport",
  "appointment-schedule": "generateAppointmentSchedule()",
  "default-state": "getDefaultState()",
};

function stubSheetJs(html) {
  const re = /<script[^>]*src=["'][^"']*xlsx[^"']*["'][^>]*>\s*<\/script>/i;
  if (!re.test(html)) throw new Error("SheetJS CDN script tag not found");
  const stub = `<script>window.XLSX={read:function(){return{SheetNames:[],Sheets:{}};},utils:{sheet_to_json:function(){return[];},aoa_to_sheet:function(){return{};},book_new:function(){return{SheetNames:[],Sheets:{}};},book_append_sheet:function(){},sheet_to_csv:function(){return "";}}};</script>`;
  return html.replace(re, stub);
}

function canonicalize(value) {
  const tag = Object.prototype.toString.call(value);
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      return { __type: "Number", value: String(value) };
    }
    return value;
  }
  if (tag === "[object Set]") {
    const values = Array.from(value).map(canonicalize);
    values.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return { __type: "Set", values };
  }
  if (tag === "[object Map]") {
    const entries = Array.from(value.entries()).map(([k, v]) => [canonicalize(k), canonicalize(v)]);
    entries.sort((a, b) => JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0])));
    return { __type: "Map", entries };
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}

export function loadLeaveBidWindow() {
  const raw = fs.readFileSync(htmlPath, "utf8");
  const html = stubSheetJs(raw).replace(
    "</body>",
    "<script>window.__STATE = STATE;</script></body>"
  );
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on("jsdomError", (err) => {
    errors.push(err && err.message ? err.message : String(err));
  });
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
  const STATE = window.__STATE;
  if (!STATE) {
    throw new Error(`live STATE was not visible after scripts. ${errors.join(" | ")}`);
  }
  if (typeof window.computeEmployeeLiabilityRow !== "function") {
    throw new Error(`scripts did not install computeEmployeeLiabilityRow. ${errors.join(" | ")}`);
  }
  if (window.computeEmployeeLiabilityRow.length < 5) {
    throw new Error("capture ran before multiAirportAndPrintFixScript overrode computeEmployeeLiabilityRow");
  }
  if (typeof window.getAllKnownAirports !== "function" || !/knownAirportSlots/.test(window.getAllKnownAirports.toString())) {
    throw new Error("capture ran before getAllKnownAirports override");
  }
  if (errors.length) {
    throw new Error(`jsdom errors during load: ${errors.join(" | ")}`);
  }
  return window;
}

export function captureSnapshots() {
  const window = loadLeaveBidWindow();
  const STATE = window.__STATE;
  const params = STATE.liabilityParams;
  if (!params) throw new Error("STATE.liabilityParams missing");

  const liabilityRows = STATE.liabilityEmployees.map((emp) => ({
    id: emp.id,
    airport: emp.airport,
    group: emp.group,
    row: window.computeEmployeeLiabilityRow(emp, params.startDate, params.ppCount, params.airportCat, params.phase),
  }));

  const ranked = window.computeRankedBidEmployees();
  const appointments = window.generateAppointmentSchedule();

  const airports = window.getAllKnownAirports();
  const allocations = {};
  for (const airport of airports) {
    allocations[airport] = window.withAirportScope(airport, () => {
      const workgroupAllocations = window.computeWorkgroupAllocations();
      window.recalculateAllocation();
      return {
        workgroupAllocations,
        allocConfig: STATE.allocConfig,
        liabilityParams: STATE.liabilityParams,
      };
    });
  }

  const defaultState = window.getDefaultState();

  return canonicalize({
    "liability-rows": {
      params: {
        startDate: params.startDate,
        ppCount: params.ppCount,
        airportCat: params.airportCat,
        phase: params.phase,
      },
      rows: liabilityRows,
    },
    "ranked-bid-employees": ranked,
    allocations: { airports: allocations },
    "appointment-schedule": appointments,
    "default-state": defaultState,
  });
}

export function writeSnapshots(snapshots) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  for (const name of Object.keys(SNAPSHOT_FILES)) {
    if (!(name in snapshots)) throw new Error(`missing snapshot ${name}`);
    const file = path.join(SNAPSHOT_DIR, `${name}.json`);
    fs.writeFileSync(file, `${JSON.stringify(snapshots[name], null, 2)}\n`);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const snapshots = captureSnapshots();
  writeSnapshots(snapshots);
  const files = Object.keys(SNAPSHOT_FILES).map((name) => `snapshots/${name}.json`);
  console.log(`wrote ${files.length} snapshots:`);
  for (const file of files) console.log(`  ${file}`);
}

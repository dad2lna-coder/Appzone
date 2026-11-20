#!/usr/bin/env node
/**
 * One-off, reproducible roster scrub for apps/example-app/LeaveBid.html.
 *
 * Reads liabilityEmployees and bidEmployees from the file (no embedded roster).
 * Replaces each record's name, eod, and scd:
 *   - name: "Last, First" from a fixed fictional pool, indexed by employee id
 *   - eod/scd: both dates shifted by the same deterministic per-id offset
 *     in [-400, +400] days, then ordered so eod <= scd. If that lands on a
 *     date already present in the roster, the offset walks away from the
 *     preferred value (still inside the range) until both dates are new.
 * A person who appears in both arrays (matched by current name) gets the same
 * fake name and the same shifted dates. Every other field is left untouched.
 *
 * Usage: node tools/scrub-roster.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(repoRoot, "apps/example-app/LeaveBid.html");

const LASTS = [
  "Adler", "Bennett", "Carter", "Dalton", "Ellis", "Foster", "Griffin", "Hayes",
  "Ingram", "Jensen", "Keller", "Lawson", "Mercer", "Nolan", "Oakley", "Parker",
];
const FIRSTS = [
  "Avery", "Blair", "Casey", "Drew", "Emery", "Finley", "Gray", "Harper",
  "Indigo", "Jordan", "Kelly", "Logan", "Morgan", "Nico",
];

function fakeName(id) {
  const i = Number(id) - 1;
  if (!Number.isInteger(i) || i < 0 || i >= LASTS.length * FIRSTS.length) {
    throw new Error(`employee id out of synthetic name range: ${id}`);
  }
  const last = LASTS[i % LASTS.length];
  const first = FIRSTS[Math.floor(i / LASTS.length)];
  return `${last}, ${first}`;
}

function offsetDays(id) {
  let x = (Number(id) * 2654435761) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return (x % 801) - 400;
}

function shiftIso(iso, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`not an ISO date: ${iso}`);
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(dt.getTime())) throw new Error(`invalid date: ${iso}`);
  dt.setUTCDate(dt.getUTCDate() + days);
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function syntheticDates(id, eod, scd, forbidden) {
  const preferred = offsetDays(id);
  for (let step = 0; step <= 800; step++) {
    const sign = step % 2 === 0 ? 1 : -1;
    const delta = Math.ceil(step / 2) * sign;
    const off = preferred + delta;
    if (off < -400 || off > 400) continue;
    let a = shiftIso(eod, off);
    let b = shiftIso(scd, off);
    if (a > b) [a, b] = [b, a];
    if (forbidden.has(a) || forbidden.has(b)) continue;
    return { eod: a, scd: b, offset: off };
  }
  throw new Error(`no collision-free offset for id ${id}`);
}

function extractArraySpan(html, label) {
  const key = `${label}:`;
  const idx = html.indexOf(key);
  if (idx < 0) throw new Error(`missing ${label}`);
  const br = html.indexOf("[", idx);
  if (br < 0) throw new Error(`missing [ for ${label}`);
  let i = br;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  if (depth !== 0) throw new Error(`unbalanced array ${label}`);
  return { start: br, end: i, text: html.slice(br, i) };
}

function topLevelObjectSpans(arrayText) {
  const spans = [];
  let depth = 0;
  let inStr = false;
  let esc = false;
  let objStart = -1;
  for (let i = 0; i < arrayText.length; i++) {
    const c = arrayText[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && objStart >= 0) {
        spans.push([objStart, i + 1]);
        objStart = -1;
      }
    }
  }
  return spans;
}

function employeeNumber(record, source) {
  if (source === "liability") {
    const id = Number(record.id);
    if (!Number.isInteger(id)) throw new Error("liability id is not an integer");
    return id;
  }
  const m = /^Employee (\d+)$/.exec(String(record.id));
  if (!m) throw new Error(`unexpected bid id shape`);
  return Number(m[1]);
}

function replaceJsonStringField(objectText, field, newValue) {
  const re = new RegExp(`("${field}"\\s*:\\s*)"(?:\\\\.|[^"\\\\])*"`);
  if (!re.test(objectText)) throw new Error(`missing string field ${field}`);
  return objectText.replace(re, `$1${JSON.stringify(newValue)}`);
}

function roleCounts(records, roleKey) {
  const counts = {};
  for (const rec of records) {
    const airport = String(rec.airport || "").toUpperCase();
    const role = String(rec[roleKey] || "");
    const key = `${airport} / ${role}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function scrubArrayText(arrayText, source, canonicalByName, forbidden) {
  const records = JSON.parse(arrayText);
  const spans = topLevelObjectSpans(arrayText);
  if (spans.length !== records.length) {
    throw new Error(`${source}: parsed ${records.length} records but found ${spans.length} objects`);
  }
  let next = arrayText;
  let nameHits = 0;
  for (let i = spans.length - 1; i >= 0; i--) {
    const rec = records[i];
    const [a, b] = spans[i];
    const id = employeeNumber(rec, source);
    let canon = canonicalByName.get(rec.name);
    if (!canon) {
      canon = { id, eod: rec.eod, scd: rec.scd };
      canonicalByName.set(rec.name, canon);
    }
    const dates = syntheticDates(canon.id, canon.eod, canon.scd, forbidden);
    const name = fakeName(canon.id);
    let obj = arrayText.slice(a, b);
    obj = replaceJsonStringField(obj, "name", name);
    obj = replaceJsonStringField(obj, "eod", dates.eod);
    obj = replaceJsonStringField(obj, "scd", dates.scd);
    nameHits++;
    next = next.slice(0, a) + obj + next.slice(b);
  }
  return { text: next, nameHits, records };
}

const original = fs.readFileSync(target, "utf8");
const liabSpan = extractArraySpan(original, "liabilityEmployees");
const bidSpan = extractArraySpan(original, "bidEmployees");
if (bidSpan.start < liabSpan.end) throw new Error("expected bidEmployees after liabilityEmployees");

const canonicalByName = new Map();
const forbiddenDates = new Set();
for (const rec of JSON.parse(liabSpan.text)) {
  forbiddenDates.add(rec.eod);
  forbiddenDates.add(rec.scd);
}
for (const rec of JSON.parse(bidSpan.text)) {
  forbiddenDates.add(rec.eod);
  forbiddenDates.add(rec.scd);
}
const liab = scrubArrayText(liabSpan.text, "liability", canonicalByName, forbiddenDates);
const bid = scrubArrayText(bidSpan.text, "bid", canonicalByName, forbiddenDates);

let html = original.slice(0, liabSpan.start) + liab.text + original.slice(liabSpan.end, bidSpan.start) + bid.text + original.slice(bidSpan.end);

const nameHits = liab.nameHits + bid.nameHits;
const originalNames = [...canonicalByName.keys()];
const leaked = originalNames.filter((name) => html.includes(name));
if (leaked.length) {
  throw new Error(`${leaked.length} original names still present after scrub`);
}

const liabAfter = JSON.parse(extractArraySpan(html, "liabilityEmployees").text);
const bidAfter = JSON.parse(extractArraySpan(html, "bidEmployees").text);

function assertSameExceptIdentity(before, after, label) {
  if (before.length !== after.length) throw new Error(`${label} length changed`);
  for (let i = 0; i < before.length; i++) {
    const keysB = Object.keys(before[i]).sort();
    const keysA = Object.keys(after[i]).sort();
    if (keysB.join("|") !== keysA.join("|")) throw new Error(`${label} field set changed at ${i}`);
    for (const k of keysB) {
      if (k === "name" || k === "eod" || k === "scd") continue;
      if (JSON.stringify(before[i][k]) !== JSON.stringify(after[i][k])) {
        throw new Error(`${label} field ${k} changed at record ${i}`);
      }
    }
    if (!/^[A-Za-z]+, [A-Za-z]+$/.test(after[i].name)) throw new Error(`${label} name not synthetic at ${i}`);
    if (after[i].eod > after[i].scd) throw new Error(`${label} eod > scd at ${i}`);
  }
}

assertSameExceptIdentity(liab.records, liabAfter, "liability");
assertSameExceptIdentity(bid.records, bidAfter, "bid");

const byBidName = new Map(bidAfter.map((r) => [r.name, r]));
for (const rec of liabAfter) {
  const other = byBidName.get(rec.name);
  if (!other) throw new Error("synthetic name missing from bid roster");
  if (other.eod !== rec.eod || other.scd !== rec.scd) {
    throw new Error("paired records diverged on dates");
  }
}

if (html === original) throw new Error("scrub made no changes");
fs.writeFileSync(target, html);

function printCounts(title, counts) {
  console.log(title);
  for (const key of Object.keys(counts).sort()) console.log(`  ${key}: ${counts[key]}`);
}

const beforeL = roleCounts(liab.records, "group");
const afterL = roleCounts(liabAfter, "group");
const beforeB = roleCounts(bid.records, "leaveGroup");
const afterB = roleCounts(bidAfter, "leaveGroup");

console.log(`replaced names = ${nameHits}`);
console.log(`liabilityEmployees ${liab.records.length} -> ${liabAfter.length}`);
console.log(`bidEmployees ${bid.records.length} -> ${bidAfter.length}`);
printCounts("liability airport/role before", beforeL);
printCounts("liability airport/role after", afterL);
printCounts("bid airport/role before", beforeB);
printCounts("bid airport/role after", afterB);
if (JSON.stringify(beforeL) !== JSON.stringify(afterL) || JSON.stringify(beforeB) !== JSON.stringify(afterB)) {
  throw new Error("airport/role counts changed");
}
if (nameHits !== 448) {
  throw new Error(`expected 448 name replacements, got ${nameHits}`);
}

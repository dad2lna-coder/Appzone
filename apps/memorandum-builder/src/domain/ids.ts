export function uid(prefix: string): string {
  const time = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${time}-${rand}`;
}

export function safeStem(value: string, max = 72): string {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (cleaned || "memorandum").slice(0, max);
}

export function uniqueFilename(stem: string, ext: string, taken: Set<string>): string {
  const base = safeStem(stem);
  let name = `${base}.${ext}`;
  let n = 2;
  while (taken.has(name.toLowerCase())) {
    name = `${base}-${n}.${ext}`;
    n += 1;
  }
  taken.add(name.toLowerCase());
  return name;
}

export function formatLongDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function mmToPoints(mm: number): number {
  return (mm / 25.4) * 72;
}

export function mmToTwip(mm: number): number {
  return Math.round((mm / 25.4) * 1440);
}

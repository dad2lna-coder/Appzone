export function parseDelimitedTextToGrid(text: string | null | undefined): string[][] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const sep = lines[0].includes("\t") ? "\t" : ",";
  return lines.map((line) => {
    const row: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuote = !inQuote;
      else if (c === sep && !inQuote) {
        row.push(cur.trim());
        cur = "";
      } else cur += c;
    }
    row.push(cur.trim());
    return row;
  });
}

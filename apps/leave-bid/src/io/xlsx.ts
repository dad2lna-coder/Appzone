import * as XLSX from "xlsx";

export interface WorkbookData {
  SheetNames: string[];
  Sheets: Record<string, unknown>;
}

/** Bundled SheetJS. The rest of the app imports this module, never `xlsx`. */
export function readWorkbook(file: ArrayBuffer | Uint8Array): WorkbookData {
  const book = XLSX.read(file, { type: "array" });
  return { SheetNames: book.SheetNames, Sheets: book.Sheets };
}

export function sheetToGrid(sheet: unknown): string[][] {
  const rows = XLSX.utils.sheet_to_json(sheet as XLSX.WorkSheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as unknown[][];
  return rows.map((row) => (Array.isArray(row) ? row.map((cell) => (cell == null ? "" : String(cell))) : []));
}

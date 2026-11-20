export function toCsv(rows: readonly (readonly (string | number)[])[], columns: readonly string[]): string {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(row.join(","));
  return lines.join("\n");
}

/** Same download path as LeaveBid.html downloadFile. */
export function downloadFile(name: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

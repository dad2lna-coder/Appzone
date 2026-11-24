const AMP = "&" + "amp;";
const LT = "&" + "lt;";
const GT = "&" + "gt;";
const QUOT = "&" + "quot;";
const APOS = "&" + "apos;";

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, AMP)
    .replace(/</g, LT)
    .replace(/>/g, GT)
    .replace(/"/g, QUOT);
}

export function decodeXml(value: string): string {
  return value
    .replaceAll(QUOT, '"')
    .replaceAll(APOS, "'")
    .replaceAll(LT, "<")
    .replaceAll(GT, ">")
    .replaceAll(AMP, "&");
}

export function extractParagraphs(xml: string): string[] {
  const paragraphs = xml.split(/<\/w:p>/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const texts = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((match) =>
      decodeXml(match[1] ?? ""),
    );
    const line = texts.join("");
    if (line.trim()) lines.push(line);
  }
  return lines;
}

export interface DocxInspection {
  paragraphs: string[];
  warnings: string[];
}

const COMPLEX: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /<w:tbl[\s>]/, message: "Tables are kept in the original package. Cell text can become a placeholder, but table layout is not rebuilt by the fallback generator." },
  { pattern: /<w:drawing[\s>]/, message: "Drawings or images were found. They stay in the original DOCX package and are not reconstructed if generation falls back to a new document." },
  { pattern: /<w:pict[\s>]/, message: "Legacy VML pictures were found. They are preserved only while the original package can be updated." },
  { pattern: /<w:txbxContent[\s>]/, message: "Text boxes were found. Their text is included when it is stored as normal runs; floating position is not edited visually." },
  { pattern: /<mc:AlternateContent[\s>]/, message: "Alternate content blocks were found. Replacement touches the text runs inside them and may not update every fallback branch." },
];

export function inspectWordXml(xmlFiles: string[]): DocxInspection {
  const joined = xmlFiles.join("\n");
  const paragraphs = xmlFiles.flatMap((xml) => extractParagraphs(xml));
  const warnings = COMPLEX.filter((item) => item.pattern.test(joined)).map((item) => item.message);
  if (paragraphs.length === 0) {
    warnings.push("No paragraph text could be read. The file may be empty or use a structure this importer does not extract.");
  }
  return { paragraphs, warnings };
}

/**
 * Replace a literal phrase inside WordprocessingML.
 * If the phrase is split across runs, the paragraph's text is collapsed into the first run.
 * Run-level formatting inside that phrase can be lost. Paragraph style is kept.
 */
export function replaceLiteralInWordXml(
  xml: string,
  literal: string,
  replacement: string,
): { xml: string; found: boolean } {
  if (!literal) return { xml, found: false };
  const escapedLiteral = escapeXml(literal);
  if (xml.includes(escapedLiteral)) {
    return { xml: xml.split(escapedLiteral).join(escapeXml(replacement)), found: true };
  }
  let found = false;
  const next = xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph) => {
    const texts = [...paragraph.matchAll(/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g)];
    const combined = texts.map((match) => decodeXml(match[2] ?? "")).join("");
    if (!combined.includes(literal)) return paragraph;
    found = true;
    const updated = combined.replace(literal, replacement);
    let used = false;
    return paragraph.replace(/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g, (_full, attrs: string | undefined) => {
      if (!used) {
        used = true;
        const attr = attrs?.includes("xml:space") ? attrs : `${attrs ?? ""} xml:space="preserve"`;
        return `<w:t${attr}>${escapeXml(updated)}</w:t>`;
      }
      return `<w:t${attrs ?? ""}></w:t>`;
    });
  });
  return { xml: next, found };
}

export function replaceTokensInWordXml(xml: string, tokens: Record<string, string>): string {
  let next = xml;
  const entries = Object.entries(tokens).sort((a, b) => b[0].length - a[0].length);
  for (const [key, value] of entries) {
    const token = `{{${key}}}`;
    if (next.includes(token)) next = next.split(token).join(escapeXml(value));
  }
  return next;
}

export function findUnresolvedTokens(text: string): string[] {
  return [...text.matchAll(/\{\{([a-zA-Z][\w.]*)\}\}/g)].map((match) => match[1] ?? "");
}

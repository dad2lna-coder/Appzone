import {
  PDFDocument,
  PDFDict,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { mmToPoints } from "@/domain/ids";
import type { ResolvedMemorandum } from "@/domain/types";

export interface PdfLogo {
  png: Uint8Array;
  widthPx: number;
  heightPx: number;
  placement: "left" | "center" | "right";
  marginTopMm: number;
  marginSideMm: number;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export function addEmptySignatureField(
  pdf: PDFDocument,
  page: PDFPage,
  rect: [number, number, number, number],
  fieldName: string,
) {
  const ctx = pdf.context;
  const widget = ctx.obj({
    Type: "Annot",
    Subtype: "Widget",
    FT: "Sig",
    Rect: rect,
    T: PDFString.of(fieldName),
    F: 4,
    P: page.ref,
  });
  const ref = ctx.register(widget);
  const existing = page.node.get(PDFName.of("Annots"));
  if (existing) {
    const array = pdf.context.lookup(existing);
    if (array && "push" in array && typeof array.push === "function") {
      array.push(ref);
    }
  } else {
    page.node.set(PDFName.of("Annots"), ctx.obj([ref]));
  }
  const acroExisting = pdf.catalog.get(PDFName.of("AcroForm"));
  if (acroExisting) {
    const acro = pdf.context.lookup(acroExisting, PDFDict);
    const fields = acro.get(PDFName.of("Fields"));
    if (fields) {
      const list = pdf.context.lookup(fields);
      if (list && "push" in list && typeof list.push === "function") list.push(ref);
    } else {
      acro.set(PDFName.of("Fields"), ctx.obj([ref]));
    }
  } else {
    pdf.catalog.set(
      PDFName.of("AcroForm"),
      ctx.obj({
        Fields: [ref],
        SigFlags: 3,
      }),
    );
  }
}

export function pdfHasSignatureField(bytes: Uint8Array): boolean {
  const raw = new TextDecoder("latin1").decode(bytes);
  return raw.includes("/FT /Sig") && raw.includes("/AcroForm") && raw.includes("/Subtype /Widget");
}

export async function buildMemorandumPdf(memo: ResolvedMemorandum, logo: PdfLogo | null): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = mmToPoints(logo?.marginSideMm ?? 19);
  const marginTop = mmToPoints(logo?.marginTopMm ?? 16);
  const marginBottom = mmToPoints(18);
  const ink = rgb(0.078, 0.169, 0.302);
  const muted = rgb(0.384, 0.459, 0.557);
  const line = rgb(0.843, 0.886, 0.937);

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop;

  const ensure = (needed: number) => {
    if (y - needed < marginBottom) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - marginTop;
    }
  };

  if (memo.formatting.includeHeader && logo?.png?.length) {
    const image = await pdf.embedPng(logo.png);
    const width = Math.min(logo.widthPx, pageWidth - marginX * 2);
    const height = width * (logo.heightPx / logo.widthPx);
    let x = marginX;
    if (logo.placement === "center") x = (pageWidth - width) / 2;
    if (logo.placement === "right") x = pageWidth - marginX - width;
    ensure(height + 16);
    page.drawImage(image, { x, y: y - height, width, height });
    y -= height + 16;
  }

  const title = memo.formatting.title || "MEMORANDUM";
  ensure(28);
  page.drawText(title, { x: marginX, y: y - 16, size: 16, font: fontBold, color: ink });
  y -= 28;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: pageWidth - marginX, y },
    thickness: 1,
    color: line,
  });
  y -= 16;

  const labels = memo.formatting.labels;
  const rows = [
    [labels.to, memo.recipients],
    [labels.from, memo.issuingOfficial],
    [labels.cc, memo.cc || "—"],
    [labels.date, memo.memoDate],
    [labels.subject, memo.subject],
  ];
  const contentWidth = pageWidth - marginX * 2;
  for (const [label, value] of rows) {
    const labelText = `${label}: `;
    const labelWidth = sans.widthOfTextAtSize(labelText, 11);
    const valueLines = wrap(value || " ", font, 11, contentWidth - labelWidth);
    for (let index = 0; index < valueLines.length; index += 1) {
      ensure(16);
      if (index === 0) {
        page.drawText(labelText, { x: marginX, y: y - 11, size: 11, font: sans, color: muted });
      }
      page.drawText(valueLines[index] ?? "", {
        x: marginX + (index === 0 ? labelWidth : labelWidth),
        y: y - 11,
        size: 11,
        font: label === labels.subject ? fontBold : font,
        color: ink,
      });
      y -= 16;
    }
  }

  y -= 8;
  ensure(8);
  page.drawLine({
    start: { x: marginX, y },
    end: { x: pageWidth - marginX, y },
    thickness: 0.6,
    color: line,
  });
  y -= 18;

  const bodyLines = wrap(memo.body || " ", font, 12, contentWidth);
  for (const bodyLine of bodyLines) {
    ensure(16);
    if (bodyLine) {
      page.drawText(bodyLine, { x: marginX, y: y - 12, size: 12, font, color: ink });
    }
    y -= bodyLine ? 16 : 10;
  }

  const boxW = 260;
  const boxH = 62;
  ensure(boxH + 36);
  y -= 18;
  const boxX = marginX;
  const boxY = y - boxH;
  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    borderWidth: 1,
    borderColor: rgb(0.043, 0.192, 0.373),
  });
  page.drawText("Digital signature", {
    x: boxX + 8,
    y: boxY + boxH - 16,
    size: 9,
    font: sans,
    color: muted,
  });
  page.drawText("Sign in Adobe Acrobat with your PIV card.", {
    x: boxX + 8,
    y: boxY + 12,
    size: 8,
    font: sans,
    color: muted,
  });
  addEmptySignatureField(pdf, page, [boxX, boxY, boxX + boxW, boxY + boxH], "IssuerSignature");

  const footer = `${memo.documentId}  ·  ${memo.templateName} v${memo.templateVersion}  ·  branding v${memo.brandingVersion}`;
  page.drawText(footer, { x: marginX, y: 28, size: 8, font: sans, color: muted });

  pdf.setTitle(memo.subject || memo.documentId);
  pdf.setSubject(memo.documentId);
  pdf.setCreator("Memorandum Builder");
  return pdf.save({ useObjectStreams: false });
}

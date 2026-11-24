import {
  AlignmentType,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import JSZip from "jszip";
import { mmToTwip } from "@/domain/ids";
import type { ResolvedMemorandum } from "@/domain/types";
import {
  inspectWordXml,
  replaceLiteralInWordXml,
  replaceTokensInWordXml,
  type DocxInspection,
} from "@/services/xml-util";

export interface LogoAsset {
  bytes: Uint8Array;
  widthPx: number;
  heightPx: number;
  placement: "left" | "center" | "right";
  marginTopMm: number;
  marginSideMm: number;
}

const ALIGN = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
} as const;

function paragraph(text: string, opts?: { bold?: boolean; size?: number; color?: string; after?: number }) {
  return new Paragraph({
    spacing: { after: opts?.after ?? 120 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size ?? 22,
        font: "Calibri",
        color: opts?.color,
      }),
    ],
  });
}

function bodyParagraphs(body: string): Paragraph[] {
  const blocks = body.split(/\n/);
  if (blocks.length === 0) return [paragraph("")];
  return blocks.map((line) =>
    paragraph(line.length ? line : " ", { after: line.trim() ? 160 : 80 }),
  );
}

export async function buildMemorandumDocx(memo: ResolvedMemorandum, logo: LogoAsset | null): Promise<Uint8Array> {
  const margin = mmToTwip(logo?.marginSideMm ?? 19);
  const top = mmToTwip(logo?.marginTopMm ?? 16);
  const alignment = ALIGN[logo?.placement ?? "left"];
  const headerChildren: Paragraph[] = [];
  if (memo.formatting.includeHeader && logo?.bytes?.length) {
    headerChildren.push(
      new Paragraph({
        alignment,
        spacing: { after: 120 },
        children: [
          new ImageRun({
            type: "png",
            data: logo.bytes,
            transformation: {
              width: logo.widthPx,
              height: logo.heightPx,
            },
          }),
        ],
      }),
    );
  }
  const labels = memo.formatting.labels;
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top, bottom: mmToTwip(18), left: margin, right: margin },
          },
        },
        headers: {
          default: new Header({ children: headerChildren.length ? headerChildren : [new Paragraph("")] }),
        },
        footers: {
          default: new Footer({
            children: [
              paragraph(
                `${memo.documentId}  ·  ${memo.templateName} v${memo.templateVersion}  ·  branding v${memo.brandingVersion}`,
                { size: 16, color: "62758E", after: 0 },
              ),
            ],
          }),
        },
        children: [
          paragraph(memo.formatting.title || "MEMORANDUM", { bold: true, size: 32, after: 240 }),
          paragraph(`${labels.to}: ${memo.recipients}`),
          paragraph(`${labels.from}: ${memo.issuingOfficial}`),
          paragraph(`${labels.cc}: ${memo.cc || "—"}`),
          paragraph(`${labels.date}: ${memo.memoDate}`),
          paragraph(`${labels.subject}: ${memo.subject}`, { bold: true, after: 280 }),
          ...bodyParagraphs(memo.body),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer());
}

const WORD_XML = /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/;

export async function readDocxPackage(bytes: Uint8Array): Promise<{
  inspection: DocxInspection;
  fileNames: string[];
}> {
  const zip = await JSZip.loadAsync(bytes);
  const fileNames = Object.keys(zip.files);
  const xmlNames = fileNames.filter((name) => WORD_XML.test(name));
  const xmlFiles: string[] = [];
  for (const name of xmlNames) {
    const file = zip.file(name);
    if (file) xmlFiles.push(await file.async("string"));
  }
  return { inspection: inspectWordXml(xmlFiles), fileNames };
}

export async function transformDocxPackage(
  bytes: Uint8Array,
  mutate: (name: string, xml: string) => string,
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files).filter((name) => WORD_XML.test(name));
  for (const name of names) {
    const file = zip.file(name);
    if (!file) continue;
    const xml = await file.async("string");
    zip.file(name, mutate(name, xml));
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function replaceLiteralInDocx(
  bytes: Uint8Array,
  literal: string,
  replacement: string,
): Promise<{ bytes: Uint8Array; found: boolean }> {
  let found = false;
  const next = await transformDocxPackage(bytes, (_name, xml) => {
    const result = replaceLiteralInWordXml(xml, literal, replacement);
    if (result.found) found = true;
    return result.xml;
  });
  return { bytes: next, found };
}

export async function fillDocxTokens(
  bytes: Uint8Array,
  tokens: Record<string, string>,
): Promise<{ bytes: Uint8Array; unresolved: string[] }> {
  const unresolved = new Set<string>();
  const next = await transformDocxPackage(bytes, (_name, xml) => {
    const replaced = replaceTokensInWordXml(xml, tokens);
    for (const match of replaced.matchAll(/\{\{([A-Za-z][\w.]*)\}\}/g)) {
      if (match[1]) unresolved.add(match[1]);
    }
    return replaced;
  });
  return { bytes: next, unresolved: [...unresolved] };
}

export async function auditDocxAssets(bytes: Uint8Array): Promise<{
  embedded: string[];
  external: string[];
}> {
  const zip = await JSZip.loadAsync(bytes);
  const embedded = Object.keys(zip.files).filter((name) => name.startsWith("word/media/"));
  const external: string[] = [];
  const rels = Object.keys(zip.files).filter((name) => name.endsWith(".rels"));
  for (const name of rels) {
    const file = zip.file(name);
    if (!file) continue;
    const xml = await file.async("string");
    for (const match of xml.matchAll(/<Relationship\b[^>]*>/g)) {
      const tag = match[0];
      if (!tag.includes('TargetMode="External"')) continue;
      const target = /Target="([^"]*)"/.exec(tag)?.[1] ?? tag;
      external.push(target);
    }
  }
  return { embedded, external };
}

import type { BatchDraft, BatchRecord, MemoTemplate } from "@/domain/types";
import { uid } from "@/domain/ids";
import { validateFieldValues } from "@/services/template-service";

export interface BatchFileShape {
  batchId?: string;
  templateId?: string;
  allOrNothing?: boolean;
  records?: unknown;
}

export interface ParsedBatch {
  draft: BatchDraft | null;
  fileErrors: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export function valuesFromRecord(record: Record<string, unknown>, template: MemoTemplate): Record<string, string> {
  const values: Record<string, string> = {
    recipients: stringify(record.recipients) || template.defaultRecipients,
    cc: stringify(record.cc) || template.defaultCc,
    issuingOfficial: stringify(record.issuingOfficial) || template.defaultOfficial,
    memoDate: stringify(record.memoDate),
  };
  for (const field of template.fields) {
    const direct = record[field.id];
    values[field.id] = stringify(direct) || field.defaultValue || "";
  }
  if (record.effectiveDate && !values.effectiveDate) values.effectiveDate = stringify(record.effectiveDate);
  return values;
}

export function parseBatchJson(text: string, templates: MemoTemplate[]): ParsedBatch {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { draft: null, fileErrors: ["The file is not valid JSON."] };
  }
  const root = asRecord(parsed);
  if (!root) return { draft: null, fileErrors: ["Batch file must be a JSON object."] };
  const fileErrors: string[] = [];
  if (typeof root.templateId !== "string" || !root.templateId.trim()) {
    fileErrors.push("templateId is required.");
  }
  if (!Array.isArray(root.records)) {
    fileErrors.push("records must be an array.");
  }
  const template = templates.find((item) => item.id === root.templateId);
  if (root.templateId && !template) {
    fileErrors.push(`No template is loaded with id "${String(root.templateId)}".`);
  }
  if (fileErrors.length || !template || !Array.isArray(root.records)) {
    return { draft: null, fileErrors };
  }
  const records: BatchRecord[] = root.records.map((entry, index) => {
    const source = asRecord(entry);
    if (!source) {
      return {
        key: `row-${index + 1}`,
        included: false,
        values: {},
        source: { _invalid: true, index },
      };
    }
    return {
      key: stringify(source.recordId) || `row-${index + 1}`,
      included: true,
      values: valuesFromRecord(source, template),
      source,
    };
  });
  return {
    draft: {
      batchId: typeof root.batchId === "string" && root.batchId.trim() ? root.batchId.trim() : uid("BATCH"),
      templateId: template.id,
      allOrNothing: root.allOrNothing === true,
      fileName: "",
      records,
      fileErrors: [],
    },
    fileErrors: [],
  };
}

export function recordIssues(template: MemoTemplate, record: BatchRecord): string[] {
  if (!record.source || (record.source as { _invalid?: boolean })._invalid) {
    return ["Record is not a JSON object."];
  }
  return validateFieldValues(template, record.values, "guided").map((issue) => issue.message);
}

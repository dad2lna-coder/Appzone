import { formatLongDate, isIsoDate } from "@/domain/ids";
import type {
  FormattingRules,
  MemoTemplate,
  OfficeConfig,
  ResolvedMemorandum,
  TemplateField,
  TemplateSnapshot,
} from "@/domain/types";

export const FIELD_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

export function defaultFormatting(): FormattingRules {
  return {
    title: "MEMORANDUM",
    labels: { to: "TO", from: "FROM", cc: "CC", date: "DATE", subject: "SUBJECT" },
    includeHeader: true,
  };
}

export function cloneSnapshot(template: TemplateSnapshot): TemplateSnapshot {
  return structuredClone(template);
}

export function snapshotOf(template: MemoTemplate): TemplateSnapshot {
  return {
    name: template.name,
    category: template.category,
    description: template.description,
    subjectFormat: template.subjectFormat,
    defaultRecipients: template.defaultRecipients,
    defaultCc: template.defaultCc,
    defaultOfficial: template.defaultOfficial,
    body: template.body,
    fields: structuredClone(template.fields),
    formatting: structuredClone(template.formatting),
    status: template.status,
    sourceDocxId: template.sourceDocxId,
    useOriginalPackage: template.useOriginalPackage,
    importWarnings: [...template.importWarnings],
  };
}

export interface FieldIssue {
  fieldId: string;
  message: string;
}

export function validateFieldValues(
  template: MemoTemplate,
  values: Record<string, string>,
  mode: "guided" | "full",
): FieldIssue[] {
  const issues: FieldIssue[] = [];
  for (const field of template.fields) {
    const raw = (values[field.id] ?? "").trim();
    if (field.required && !raw) {
      if (mode === "guided" && !field.guided) {
        issues.push({
          fieldId: field.id,
          message: `${field.label} is required, but guided mode does not allow editing it and it has no value.`,
        });
      } else {
        issues.push({ fieldId: field.id, message: `${field.label} is required.` });
      }
    }
    if (!raw) continue;
    if (field.type === "date" && !isIsoDate(raw)) {
      issues.push({ fieldId: field.id, message: `${field.label} must be a real calendar date.` });
    }
    if (field.type === "dateRange") {
      const [start, end] = raw.split("|");
      if (!start || !end || !isIsoDate(start) || !isIsoDate(end)) {
        issues.push({ fieldId: field.id, message: `${field.label} needs a start and end date.` });
      } else if (start > end) {
        issues.push({ fieldId: field.id, message: `${field.label} ends before it starts.` });
      }
    }
  }
  const memoDate = (values.memoDate ?? "").trim();
  if (memoDate && !isIsoDate(memoDate)) {
    issues.push({ fieldId: "memoDate", message: "Memorandum date must be a real calendar date." });
  }
  return issues;
}

export function validateTemplateConfig(template: Pick<MemoTemplate, "fields" | "name" | "subjectFormat" | "body">): string[] {
  const issues: string[] = [];
  if (!template.name.trim()) issues.push("Template name is required.");
  if (!template.subjectFormat.trim()) issues.push("Subject format is required.");
  if (!template.body.trim()) issues.push("Standard body wording is required.");
  const seen = new Set<string>();
  for (const field of template.fields) {
    if (!FIELD_ID_PATTERN.test(field.id)) {
      issues.push(`Field id "${field.id}" must start with a letter and use only letters, numbers, and underscores.`);
    }
    if (seen.has(field.id)) issues.push(`Field id "${field.id}" is duplicated.`);
    seen.add(field.id);
    if (field.required && !field.guided && !field.defaultValue.trim()) {
      issues.push(`${field.label || field.id} is required but hidden in guided mode and has no default.`);
    }
  }
  return issues;
}

function displayValue(field: TemplateField | undefined, raw: string, config: OfficeConfig): string {
  if (!raw) return "";
  if (!field) return raw;
  if (field.type === "date") return formatLongDate(raw);
  if (field.type === "dateRange") {
    const [start, end] = raw.split("|");
    if (start && end) return `${formatLongDate(start)} – ${formatLongDate(end)}`;
  }
  if (field.type === "personnel") {
    const person = config.personnel.find((entry) => entry.id === raw);
    if (person) return person.title ? `${person.name}, ${person.title}` : person.name;
  }
  return raw;
}

export function derivedTokens(values: Record<string, string>, config: OfficeConfig): Record<string, string> {
  const airport = config.airports.find((entry) => entry.code === values.airport);
  const official = config.personnel.find(
    (entry) => entry.id === values.issuingOfficial || entry.name === values.issuingOfficial,
  );
  const tokens: Record<string, string> = {
    officeName: config.officeName,
    region: config.region,
    airportName: airport?.name ?? "",
    issuingTitle: official?.title ?? "",
  };
  for (const [key, value] of Object.entries(config.terminology)) {
    tokens[`term.${key}`] = value;
  }
  if (config.routing.length) {
    tokens.routingBlock = config.routing.map((entry) => `${entry.label}: ${entry.value}`).join("\n");
  } else {
    tokens.routingBlock = "";
  }
  return tokens;
}

export function applyTokens(text: string, tokens: Record<string, string>): string {
  const entries = Object.entries(tokens).sort((a, b) => b[0].length - a[0].length);
  let next = text;
  for (const [key, value] of entries) {
    next = next.split(`{{${key}}}`).join(value);
  }
  return next;
}

export interface ResolveInput {
  template: MemoTemplate;
  config: OfficeConfig;
  values: Record<string, string>;
  mode: "guided" | "full";
  documentId: string;
  brandingVersion: number;
  overrides?: Partial<Pick<ResolvedMemorandum, "subject" | "body" | "recipients" | "cc" | "issuingOfficial" | "memoDate">>;
}

export function resolveMemorandum(input: ResolveInput): ResolvedMemorandum {
  const { template, config, values } = input;
  const fieldTokens: Record<string, string> = {};
  for (const field of template.fields) {
    fieldTokens[field.id] = displayValue(field, values[field.id] ?? "", config);
  }
  const derived = derivedTokens(values, config);
  const memoDateRaw = values.memoDate ?? "";
  const officialRaw = values.issuingOfficial ?? template.defaultOfficial;
  const official = config.personnel.find((entry) => entry.id === officialRaw);
  const officialText = official
    ? official.title
      ? `${official.name}, ${official.title}`
      : official.name
    : officialRaw;
  const baseTokens: Record<string, string> = {
    ...derived,
    ...fieldTokens,
    recipients: values.recipients ?? template.defaultRecipients,
    cc: values.cc ?? template.defaultCc,
    issuingOfficial: officialText,
    memoDate: memoDateRaw ? formatLongDate(memoDateRaw) : "",
  };
  const subject = applyTokens(template.subjectFormat, { ...baseTokens, subject: "" }).trim();
  baseTokens.subject = subject;
  const body = applyTokens(template.body, baseTokens).trim();
  const memo: ResolvedMemorandum = {
    documentId: input.documentId,
    subject,
    officeName: config.officeName,
    region: config.region,
    recipients: baseTokens.recipients ?? "",
    cc: baseTokens.cc ?? "",
    issuingOfficial: officialText,
    memoDate: baseTokens.memoDate ?? "",
    body,
    templateId: template.id,
    templateName: template.name,
    templateVersion: template.version,
    brandingVersion: input.brandingVersion,
    configVersion: config.version,
    formatting: template.formatting,
  };
  if (input.mode === "full" && input.overrides) {
    if (input.overrides.subject !== undefined) memo.subject = input.overrides.subject;
    if (input.overrides.body !== undefined) memo.body = input.overrides.body;
    if (input.overrides.recipients !== undefined) memo.recipients = input.overrides.recipients;
    if (input.overrides.cc !== undefined) memo.cc = input.overrides.cc;
    if (input.overrides.issuingOfficial !== undefined) memo.issuingOfficial = input.overrides.issuingOfficial;
    if (input.overrides.memoDate !== undefined) {
      memo.memoDate = isIsoDate(input.overrides.memoDate)
        ? formatLongDate(input.overrides.memoDate)
        : input.overrides.memoDate;
    }
  }
  return memo;
}

export function initialValues(template: MemoTemplate, config: OfficeConfig): Record<string, string> {
  const values: Record<string, string> = {
    recipients: template.defaultRecipients || config.defaultRecipients,
    cc: template.defaultCc || config.defaultCc,
    issuingOfficial: template.defaultOfficial || config.issuingOfficialIds[0] || "",
    memoDate: new Date().toISOString().slice(0, 10),
  };
  for (const field of template.fields) {
    values[field.id] = field.defaultValue ?? "";
  }
  return values;
}

export function tokenMapForPackage(memo: ResolvedMemorandum, template: MemoTemplate, values: Record<string, string>, config: OfficeConfig): Record<string, string> {
  const map: Record<string, string> = {
    subject: memo.subject,
    recipients: memo.recipients,
    cc: memo.cc,
    issuingOfficial: memo.issuingOfficial,
    memoDate: memo.memoDate,
    officeName: memo.officeName,
    region: memo.region,
    body: memo.body,
    ...derivedTokens(values, config),
  };
  for (const field of template.fields) {
    map[field.id] = displayValue(field, values[field.id] ?? "", config);
  }
  return map;
}

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "dateRange"
  | "select"
  | "airport"
  | "location"
  | "personnel";

export type PublishStatus = "draft" | "published" | "archived";

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** Editable in guided mode. Required fields that are not guided must have a default. */
  guided: boolean;
  defaultValue: string;
  help?: string;
  options?: string[];
}

export interface FormattingRules {
  title: string;
  labels: {
    to: string;
    from: string;
    cc: string;
    date: string;
    subject: string;
  };
  includeHeader: boolean;
}

export interface TemplateSnapshot {
  name: string;
  category: string;
  description: string;
  subjectFormat: string;
  defaultRecipients: string;
  defaultCc: string;
  defaultOfficial: string;
  body: string;
  fields: TemplateField[];
  formatting: FormattingRules;
  status: PublishStatus;
  /** Original DOCX package after placeholder substitution, stored in the file cabinet. */
  sourceDocxId: string | null;
  /** When true, DOCX generation updates the imported package instead of building a new one. */
  useOriginalPackage: boolean;
  importWarnings: string[];
}

export interface TemplateVersion {
  version: number;
  status: PublishStatus;
  savedAt: string;
  note: string;
  snapshot: TemplateSnapshot;
}

export interface MemoTemplate extends TemplateSnapshot {
  id: string;
  version: number;
  publishedVersion: number | null;
  createdAt: string;
  updatedAt: string;
  versions: TemplateVersion[];
}

export interface AirportEntry {
  code: string;
  name: string;
  locations: string[];
}

export interface PersonnelEntry {
  id: string;
  name: string;
  title: string;
  email: string;
}

export interface RoutingEntry {
  label: string;
  value: string;
}

export interface ConfigSnapshot {
  officeName: string;
  region: string;
  airports: AirportEntry[];
  personnel: PersonnelEntry[];
  routing: RoutingEntry[];
  defaultRecipients: string;
  defaultCc: string;
  issuingOfficialIds: string[];
  terminology: Record<string, string>;
}

export interface ConfigVersion {
  version: number;
  savedAt: string;
  note: string;
  snapshot: ConfigSnapshot;
}

export interface OfficeConfig extends ConfigSnapshot {
  version: number;
  versions: ConfigVersion[];
}

export type LogoPlacement = "left" | "center" | "right";

export interface BrandingSnapshot {
  logoDataUrl: string | null;
  logoName: string;
  widthPx: number;
  heightPx: number;
  placement: LogoPlacement;
  marginTopMm: number;
  marginSideMm: number;
}

export interface BrandingVersion {
  version: number;
  savedAt: string;
  note: string;
  snapshot: BrandingSnapshot;
}

export interface BrandingState extends BrandingSnapshot {
  version: number;
  versions: BrandingVersion[];
}

export interface OfficeRecord {
  id: string;
  config: OfficeConfig;
  templates: MemoTemplate[];
  branding: BrandingState;
}

export type DocumentStatus = "draft" | "generated" | "archived";

export interface ResolvedMemorandum {
  documentId: string;
  subject: string;
  officeName: string;
  region: string;
  recipients: string;
  cc: string;
  issuingOfficial: string;
  memoDate: string;
  body: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  brandingVersion: number;
  configVersion: number;
  formatting: FormattingRules;
}

export interface DocumentRecord {
  documentId: string;
  officeId: string;
  batchId: string | null;
  templateId: string;
  templateName: string;
  templateVersion: number;
  brandingVersion: number;
  configVersion: number;
  generatedAt: string;
  filenameDocx: string;
  filenamePdf: string;
  hasDocx: boolean;
  hasPdf: boolean;
  subject: string;
  status: DocumentStatus;
  mode: "guided" | "full";
  fieldValues: Record<string, string>;
  snapshot: ResolvedMemorandum;
  sourceRecord: unknown | null;
  warnings: string[];
  /** True when the PDF contains an AcroForm signature widget. */
  signatureField: boolean;
  /** True when the DOCX embeds the logo instead of linking a URL. */
  logoEmbedded: boolean;
}

export interface ActivityEvent {
  id: string;
  at: string;
  message: string;
  tone: "info" | "success" | "warning" | "danger";
}

export interface BatchRecord {
  key: string;
  included: boolean;
  values: Record<string, string>;
  source: Record<string, unknown>;
}

export interface BatchDraft {
  batchId: string;
  templateId: string;
  allOrNothing: boolean;
  fileName: string;
  records: BatchRecord[];
  fileErrors: string[];
}

export interface Notice {
  tone: "info" | "success" | "warning" | "danger";
  text: string;
}

export interface PersistedState {
  offices: OfficeRecord[];
  activeOfficeId: string;
  documents: DocumentRecord[];
  activity: ActivityEvent[];
  batchDraft: BatchDraft | null;
}

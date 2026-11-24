import { defaultFormatting } from "@/services/template-service";
import type {
  BrandingState,
  MemoTemplate,
  OfficeConfig,
  OfficeRecord,
  TemplateField,
} from "@/domain/types";

const now = "2026-11-24T12:00:00.000Z";

function field(partial: TemplateField): TemplateField {
  return partial;
}

function template(
  partial: Pick<MemoTemplate, "id" | "name" | "category" | "description" | "subjectFormat" | "body" | "fields"> &
    Partial<MemoTemplate>,
): MemoTemplate {
  const snapshot = {
    name: partial.name,
    category: partial.category,
    description: partial.description,
    subjectFormat: partial.subjectFormat,
    defaultRecipients: partial.defaultRecipients ?? "{{officeName}} distribution",
    defaultCc: partial.defaultCc ?? "",
    defaultOfficial: partial.defaultOfficial ?? "per-001",
    body: partial.body,
    fields: partial.fields,
    formatting: partial.formatting ?? defaultFormatting(),
    status: partial.status ?? "published",
    sourceDocxId: null,
    useOriginalPackage: false,
    importWarnings: [],
  };
  return {
    ...snapshot,
    id: partial.id,
    version: 1,
    publishedVersion: snapshot.status === "published" ? 1 : null,
    createdAt: now,
    updatedAt: now,
    versions: [
      {
        version: 1,
        status: snapshot.status,
        savedAt: now,
        note: "Starter baseline",
        snapshot,
      },
    ],
  };
}

const scheduleFields: TemplateField[] = [
  field({ id: "airport", label: "Airport", type: "airport", required: true, guided: true, defaultValue: "" }),
  field({ id: "location", label: "Location", type: "location", required: true, guided: true, defaultValue: "" }),
  field({ id: "effectiveDate", label: "Effective date", type: "date", required: true, guided: true, defaultValue: "" }),
  field({ id: "bidCycle", label: "Bid cycle", type: "text", required: true, guided: true, defaultValue: "" }),
  field({ id: "dateRange", label: "Schedule date range", type: "dateRange", required: true, guided: true, defaultValue: "" }),
  field({ id: "additionalNotes", label: "Additional notes", type: "textarea", required: false, guided: true, defaultValue: "" }),
];

const bidFields: TemplateField[] = [
  field({ id: "airport", label: "Airport", type: "airport", required: true, guided: true, defaultValue: "" }),
  field({ id: "bidCycle", label: "Bid cycle", type: "text", required: true, guided: true, defaultValue: "" }),
  field({ id: "dateRange", label: "Bid window", type: "dateRange", required: true, guided: true, defaultValue: "" }),
  field({ id: "effectiveDate", label: "Award effective date", type: "date", required: true, guided: true, defaultValue: "" }),
  field({ id: "additionalNotes", label: "Additional notes", type: "textarea", required: false, guided: true, defaultValue: "" }),
];

export function starterTemplates(): MemoTemplate[] {
  return [
    template({
      id: "schedule-change",
      name: "Schedule change notification",
      category: "Scheduling",
      description: "Notifies assigned employees that a station schedule is changing.",
      subjectFormat: "Schedule change — {{airport}} {{location}}",
      defaultRecipients: "Employees assigned to {{airport}} {{location}}",
      defaultCc: "Station supervision",
      body: `Effective {{effectiveDate}}, employees assigned to {{airport}} {{location}} will begin the new schedule.

Bid cycle: {{bidCycle}}
Date range: {{dateRange}}

This memorandum is issued by {{officeName}} ({{region}}) for operational planning. Questions should go through the normal supervisory chain.

{{additionalNotes}}`,
      fields: scheduleFields,
    }),
    template({
      id: "bid-announcement",
      name: "Bid announcement",
      category: "Bids",
      description: "Announces a bid cycle, window, and effective award date.",
      subjectFormat: "Bid announcement — {{airport}} {{bidCycle}}",
      defaultRecipients: "Eligible employees, {{airportName}}",
      defaultCc: "Bid administration",
      body: `{{officeName}} announces {{bidCycle}} for {{airport}} ({{airportName}}).

Bids will be accepted during {{dateRange}}. Awards are effective {{effectiveDate}}.

Submit bids through the process already in use at your station. Late bids will not be added after the window closes unless {{officeName}} issues a separate memorandum.

{{additionalNotes}}`,
      fields: bidFields,
    }),
    template({
      id: "leave-bid",
      name: "Leave bid announcement",
      category: "Leave",
      description: "Opens a leave bid for a station and cycle.",
      subjectFormat: "Leave bid — {{airport}} {{bidCycle}}",
      defaultRecipients: "Eligible employees, {{airportName}}",
      defaultCc: "Leave administration",
      body: `Leave bids for {{airport}} {{location}} are open for {{bidCycle}}.

Submission window: {{dateRange}}
Leave period begins: {{effectiveDate}}

Employees should bid only the leave they can take. {{officeName}} will publish awards after the window closes.

{{additionalNotes}}`,
      fields: [
        field({ id: "airport", label: "Airport", type: "airport", required: true, guided: true, defaultValue: "" }),
        field({ id: "location", label: "Location", type: "location", required: false, guided: true, defaultValue: "" }),
        field({ id: "bidCycle", label: "Leave bid cycle", type: "text", required: true, guided: true, defaultValue: "" }),
        field({ id: "dateRange", label: "Submission window", type: "dateRange", required: true, guided: true, defaultValue: "" }),
        field({ id: "effectiveDate", label: "Leave period begins", type: "date", required: true, guided: true, defaultValue: "" }),
        field({ id: "additionalNotes", label: "Additional notes", type: "textarea", required: false, guided: true, defaultValue: "" }),
      ],
    }),
    template({
      id: "spoke-bid",
      name: "Spoke airport bid announcement",
      category: "Bids",
      description: "Announces a bid at a spoke airport, with the regional office named from configuration.",
      subjectFormat: "Spoke bid — {{airport}} {{bidCycle}}",
      defaultRecipients: "Spoke airport employees, {{airport}}",
      defaultCc: "{{region}} bid desk",
      body: `{{officeName}} is conducting {{bidCycle}} for spoke airport {{airport}} ({{airportName}}), {{location}}.

Bid window: {{dateRange}}
Effective date: {{effectiveDate}}

Routing for this cycle:
{{routingBlock}}

Awards will follow the spoke-airport rules already on file for {{region}}. This memorandum does not change those rules.

{{additionalNotes}}`,
      fields: [
        field({ id: "airport", label: "Spoke airport", type: "airport", required: true, guided: true, defaultValue: "" }),
        field({ id: "location", label: "Location", type: "location", required: true, guided: true, defaultValue: "" }),
        field({ id: "bidCycle", label: "Bid cycle", type: "text", required: true, guided: true, defaultValue: "" }),
        field({ id: "dateRange", label: "Bid window", type: "dateRange", required: true, guided: true, defaultValue: "" }),
        field({ id: "effectiveDate", label: "Effective date", type: "date", required: true, guided: true, defaultValue: "" }),
        field({ id: "additionalNotes", label: "Additional notes", type: "textarea", required: false, guided: true, defaultValue: "" }),
      ],
    }),
  ];
}

export function starterConfig(): OfficeConfig {
  const snapshot = {
    officeName: "Central Region Operations",
    region: "Central Region",
    airports: [
      { code: "DFW", name: "Dallas/Fort Worth International", locations: ["Terminal A", "Terminal B", "Terminal C", "Terminal D", "Terminal E"] },
      { code: "DAL", name: "Dallas Love Field", locations: ["Main Terminal"] },
      { code: "AFW", name: "Fort Worth Alliance", locations: ["Cargo"] },
      { code: "AUS", name: "Austin-Bergstrom", locations: ["Main Terminal"] },
      { code: "SAT", name: "San Antonio International", locations: ["Terminal A"] },
    ],
    personnel: [
      { id: "per-001", name: "Alex Rivera", title: "Operations Manager", email: "alex.rivera@example.invalid" },
      { id: "per-002", name: "Jordan Hale", title: "Bid Administrator", email: "jordan.hale@example.invalid" },
      { id: "per-003", name: "Morgan Ellis", title: "Regional Director", email: "morgan.ellis@example.invalid" },
    ],
    routing: [
      { label: "Through", value: "Station supervision" },
      { label: "Info", value: "Regional bid desk" },
    ],
    defaultRecipients: "Station distribution",
    defaultCc: "Regional operations",
    issuingOfficialIds: ["per-001", "per-003"],
    terminology: {
      employee: "employee",
      station: "airport",
    },
  };
  return {
    ...snapshot,
    version: 1,
    versions: [{ version: 1, savedAt: now, note: "Starter office", snapshot }],
  };
}

export function starterBranding(): BrandingState {
  const snapshot = {
    logoDataUrl: null as string | null,
    logoName: "Memorandum Builder mark",
    widthPx: 220,
    heightPx: 66,
    placement: "left" as const,
    marginTopMm: 16,
    marginSideMm: 19,
  };
  return {
    ...snapshot,
    version: 1,
    versions: [{ version: 1, savedAt: now, note: "Starter branding", snapshot: { ...snapshot } }],
  };
}

export function starterOffice(): OfficeRecord {
  return {
    id: "office-central",
    config: starterConfig(),
    templates: starterTemplates(),
    branding: starterBranding(),
  };
}

export const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 96" role="img" aria-label="Memorandum Builder logo">
  <rect width="320" height="96" fill="#ffffff"/>
  <g transform="translate(8 8)">
    <path d="M9 13 Q9 6 16 6 H54 L78 30 V73 Q78 80 71 80 H16 Q9 80 9 73Z" fill="#0b315f"/>
    <path d="M54 6 V25 Q54 30 60 30 H78" fill="#1b548d"/>
    <path d="M21 40 H64 M21 51 H57 M21 62 H49" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
    <path d="M2 74 C23 56 42 53 67 47 L58 61 C35 66 20 74 2 86Z" fill="#0870df"/>
    <path d="M2 86 C28 73 48 69 75 65 L66 76 C43 79 22 86 2 91Z" fill="#6dc5ff"/>
  </g>
  <text x="108" y="44" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#0b315f">MEMORANDUM</text>
  <text x="108" y="72" font-family="Arial,sans-serif" font-size="18" font-weight="600" letter-spacing="1.5" fill="#2485f3">BUILDER</text>
</svg>`;

import { create } from "zustand";
import { MARK_SVG, starterBranding, starterOffice } from "@/data/seed";
import { formatLongDate, todayIso, uid, uniqueFilename } from "@/domain/ids";
import type {
  ActivityEvent,
  BatchDraft,
  BrandingSnapshot,
  ConfigSnapshot,
  DocumentRecord,
  MemoTemplate,
  Notice,
  OfficeConfig,
  OfficeRecord,
  PersistedState,
  TemplateSnapshot,
} from "@/domain/types";
import { recordIssues } from "@/services/batch-service";
import { auditDocxAssets, buildMemorandumDocx, fillDocxTokens, readDocxPackage, replaceLiteralInDocx } from "@/services/docx-service";
import { buildExportZip, readExportZip } from "@/services/export-service";
import { buildMemorandumPdf, pdfHasSignatureField } from "@/services/pdf-service";
import { copyFile, dataUrlToBytes, downloadBlob, getFile, loadState, putFile, rasterizeSvg, saveState } from "@/services/storage-service";
import { initialValues, resolveMemorandum, snapshotOf, tokenMapForPackage, validateFieldValues, validateTemplateConfig } from "@/services/template-service";

interface GenerateInput {
  templateId: string;
  values: Record<string, string>;
  mode: "guided" | "full";
  overrides?: {
    subject?: string;
    body?: string;
    recipients?: string;
    cc?: string;
    issuingOfficial?: string;
    memoDate?: string;
  };
  formats: Array<"docx" | "pdf">;
  batchId?: string | null;
  sourceRecord?: unknown;
  existingDocumentId?: string;
}

export interface MemoStore {
  ready: boolean;
  offices: OfficeRecord[];
  activeOfficeId: string;
  documents: DocumentRecord[];
  activity: ActivityEvent[];
  batchDraft: BatchDraft | null;
  notice: Notice | null;
  hydrate: () => Promise<void>;
  dismissNotice: () => void;
  setOffice: (id: string) => void;
  updateConfig: (patch: Partial<ConfigSnapshot>) => void;
  commitConfig: (note: string) => void;
  restoreConfig: (version: number) => void;
  updateBranding: (patch: Partial<BrandingSnapshot>) => void;
  setLogo: (dataUrl: string, name: string, width: number, height: number) => void;
  commitBranding: (note: string) => void;
  restoreBranding: (version: number) => void;
  saveTemplate: (template: MemoTemplate, mode: "draft" | "published", note: string) => string[];
  restoreTemplate: (templateId: string, version: number) => void;
  duplicateTemplate: (templateId: string) => Promise<string | null>;
  archiveTemplate: (templateId: string) => void;
  createBlank: () => string;
  importDocx: (file: File) => Promise<string>;
  markPlaceholder: (template: MemoTemplate, literal: string, fieldId: string) => Promise<MemoTemplate>;
  generate: (input: GenerateInput) => Promise<{ documentId: string; warnings: string[]; errors: string[] }>;
  setDocumentStatus: (documentId: string, status: DocumentRecord["status"]) => void;
  setBatchDraft: (draft: BatchDraft | null) => void;
  generateBatch: () => Promise<Array<{ key: string; documentId?: string; errors: string[]; warnings: string[] }>>;
  downloadDocument: (documentId: string, kind: "docx" | "pdf") => Promise<void>;
  exportPackage: () => Promise<void>;
  importPackage: (file: File) => Promise<void>;
  resetSamples: () => Promise<void>;
}

let hydrateOnce: Promise<void> | null = null;

function officeOf(state: Pick<MemoStore, "offices" | "activeOfficeId">): OfficeRecord {
  const office = state.offices.find((item) => item.id === state.activeOfficeId);
  if (!office) throw new Error("No office is selected.");
  return office;
}

function patchOffice(state: MemoStore, patch: (office: OfficeRecord) => OfficeRecord): OfficeRecord[] {
  return state.offices.map((office) => (office.id === state.activeOfficeId ? patch(office) : office));
}

function activity(message: string, tone: ActivityEvent["tone"]): ActivityEvent {
  return { id: uid("ACT"), at: new Date().toISOString(), message, tone };
}

async function persist(state: MemoStore) {
  const payload: PersistedState = {
    offices: state.offices,
    activeOfficeId: state.activeOfficeId,
    documents: state.documents,
    activity: state.activity.slice(0, 40),
    batchDraft: state.batchDraft,
  };
  await saveState(payload);
}

function logoAsset(office: OfficeRecord) {
  const branding = office.branding;
  if (!branding.logoDataUrl) return null;
  const bytes = dataUrlToBytes(branding.logoDataUrl);
  if (!bytes) return null;
  return {
    bytes,
    png: bytes,
    widthPx: branding.widthPx,
    heightPx: branding.heightPx || Math.round(branding.widthPx * 0.3),
    placement: branding.placement,
    marginTopMm: branding.marginTopMm,
    marginSideMm: branding.marginSideMm,
  };
}

export const useMemoStore = create<MemoStore>((set, get) => ({
  ready: false,
  offices: [starterOffice()],
  activeOfficeId: "office-central",
  documents: [],
  activity: [],
  batchDraft: null,
  notice: null,

  dismissNotice: () => set({ notice: null }),

  hydrate: () => {
    if (!hydrateOnce) {
      hydrateOnce = (async () => {
        try {
          const saved = await loadState();
          if (saved?.offices?.length) {
            set({
              offices: saved.offices,
              activeOfficeId: saved.activeOfficeId || saved.offices[0]!.id,
              documents: saved.documents ?? [],
              activity: saved.activity ?? [],
              batchDraft: saved.batchDraft ?? null,
              ready: true,
            });
          } else {
            const office = starterOffice();
            try {
              const dataUrl = await rasterizeSvg(MARK_SVG, 640, 192);
              office.branding.logoDataUrl = dataUrl;
              office.branding.versions[0]!.snapshot.logoDataUrl = dataUrl;
            } catch {
              /* generation will warn if the mark could not be rasterized */
            }
            set({
              offices: [office],
              activeOfficeId: office.id,
              documents: [],
              activity: [activity("Loaded the starter office, templates, and branding.", "info")],
              ready: true,
            });
            await persist(get());
          }
          const current = officeOf(get());
          if (!current.branding.logoDataUrl) {
            try {
              const dataUrl = await rasterizeSvg(MARK_SVG, 640, 192);
              get().setLogo(dataUrl, "Memorandum Builder mark", current.branding.widthPx, current.branding.heightPx);
            } catch {
              /* leave branding without a logo and surface it at generation */
            }
          }
        } catch (error) {
          set({
            ready: true,
            notice: {
              tone: "danger",
              text: error instanceof Error ? error.message : "Office data could not be loaded.",
            },
          });
        }
      })();
    }
    return hydrateOnce;
  },

  setOffice: (id) => {
    if (!get().offices.some((office) => office.id === id)) return;
    set({ activeOfficeId: id });
    void persist(get());
  },

  updateConfig: (patch) => {
    set({
      offices: patchOffice(get(), (office) => ({
        ...office,
        config: { ...office.config, ...patch },
      })),
    });
    void persist(get());
  },

  commitConfig: (note) => {
    const office = officeOf(get());
    const version = office.config.version + 1;
    const snapshot: ConfigSnapshot = {
      officeName: office.config.officeName,
      region: office.config.region,
      airports: structuredClone(office.config.airports),
      personnel: structuredClone(office.config.personnel),
      routing: structuredClone(office.config.routing),
      defaultRecipients: office.config.defaultRecipients,
      defaultCc: office.config.defaultCc,
      issuingOfficialIds: [...office.config.issuingOfficialIds],
      terminology: { ...office.config.terminology },
    };
    set({
      offices: patchOffice(get(), (current) => ({
        ...current,
        config: {
          ...current.config,
          ...snapshot,
          version,
          versions: [{ version, savedAt: new Date().toISOString(), note, snapshot }, ...current.config.versions],
        },
      })),
      activity: [activity(`Saved configuration version ${version}.`, "success"), ...get().activity].slice(0, 40),
      notice: { tone: "success", text: `Configuration version ${version} saved. Earlier versions are still in history.` },
    });
    void persist(get());
  },

  restoreConfig: (version) => {
    const office = officeOf(get());
    const found = office.config.versions.find((item) => item.version === version);
    if (!found) return;
    const nextVersion = office.config.version + 1;
    const snapshot = structuredClone(found.snapshot);
    set({
      offices: patchOffice(get(), (current) => ({
        ...current,
        config: {
          ...snapshot,
          version: nextVersion,
          versions: [
            { version: nextVersion, savedAt: new Date().toISOString(), note: `Restored version ${version}`, snapshot },
            ...current.config.versions,
          ],
        },
      })),
      notice: { tone: "success", text: `Restored configuration version ${version} as version ${nextVersion}.` },
    });
    void persist(get());
  },

  updateBranding: (patch) => {
    set({
      offices: patchOffice(get(), (office) => ({
        ...office,
        branding: { ...office.branding, ...patch },
      })),
    });
    void persist(get());
  },

  setLogo: (dataUrl, name, width, height) => {
    get().updateBranding({ logoDataUrl: dataUrl, logoName: name, widthPx: width, heightPx: height });
  },

  commitBranding: (note) => {
    const branding = officeOf(get()).branding;
    const version = branding.version + 1;
    const snapshot: BrandingSnapshot = {
      logoDataUrl: branding.logoDataUrl,
      logoName: branding.logoName,
      widthPx: branding.widthPx,
      heightPx: branding.heightPx,
      placement: branding.placement,
      marginTopMm: branding.marginTopMm,
      marginSideMm: branding.marginSideMm,
    };
    set({
      offices: patchOffice(get(), (office) => ({
        ...office,
        branding: {
          ...snapshot,
          version,
          versions: [{ version, savedAt: new Date().toISOString(), note, snapshot }, ...office.branding.versions],
        },
      })),
      activity: [activity(`Saved branding version ${version}.`, "success"), ...get().activity].slice(0, 40),
      notice: { tone: "success", text: `Branding version ${version} saved. Older logos stay available for history.` },
    });
    void persist(get());
  },

  restoreBranding: (version) => {
    const branding = officeOf(get()).branding;
    const found = branding.versions.find((item) => item.version === version);
    if (!found) return;
    const nextVersion = branding.version + 1;
    const snapshot = structuredClone(found.snapshot);
    set({
      offices: patchOffice(get(), (office) => ({
        ...office,
        branding: {
          ...snapshot,
          version: nextVersion,
          versions: [
            { version: nextVersion, savedAt: new Date().toISOString(), note: `Restored version ${version}`, snapshot },
            ...office.branding.versions,
          ],
        },
      })),
      notice: { tone: "success", text: `Restored branding version ${version} as version ${nextVersion}.` },
    });
    void persist(get());
  },

  saveTemplate: (template, mode, note) => {
    const issues = validateTemplateConfig(template);
    if (issues.length) {
      set({ notice: { tone: "danger", text: issues[0] ?? "Template is not valid." } });
      return issues;
    }
    const alreadySaved = template.versions.some((item) => item.version === template.version);
    const version = alreadySaved || template.version < 1 ? template.version + 1 : template.version;
    const status = mode === "published" ? "published" : "draft";
    const snapshot = snapshotOf({ ...template, status, version });
    const next: MemoTemplate = {
      ...template,
      ...snapshot,
      version,
      status,
      publishedVersion: mode === "published" ? version : template.publishedVersion,
      updatedAt: new Date().toISOString(),
      versions: [{ version, status, savedAt: new Date().toISOString(), note, snapshot }, ...template.versions.filter((item) => item.version !== version)],
    };
    set({
      offices: patchOffice(get(), (office) => ({
        ...office,
        templates: office.templates.some((item) => item.id === next.id)
          ? office.templates.map((item) => (item.id === next.id ? next : item))
          : [next, ...office.templates],
      })),
      activity: [activity(`${status === "published" ? "Published" : "Saved"} ${next.name} version ${version}.`, "success"), ...get().activity].slice(0, 40),
      notice: {
        tone: "success",
        text: status === "published"
          ? `Published ${next.name} version ${version}. Previous versions were kept.`
          : `Saved draft version ${version} of ${next.name}.`,
      },
    });
    void persist(get());
    return [];
  },

  restoreTemplate: (templateId, version) => {
    const office = officeOf(get());
    const template = office.templates.find((item) => item.id === templateId);
    const found = template?.versions.find((item) => item.version === version);
    if (!template || !found) return;
    const restored: MemoTemplate = {
      ...template,
      ...structuredClone(found.snapshot),
      id: template.id,
      version: template.version,
      publishedVersion: template.publishedVersion,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      versions: template.versions,
    };
    const issues = get().saveTemplate(restored, "draft", `Restored version ${version}`);
    if (!issues.length) {
      set({ notice: { tone: "success", text: `Restored template version ${version} as a new draft. The old version is still in history.` } });
    }
  },

  duplicateTemplate: async (templateId) => {
    const office = officeOf(get());
    const template = office.templates.find((item) => item.id === templateId);
    if (!template) return null;
    const copyId = uid("TPL").toLowerCase();
    let sourceDocxId: string | null = null;
    if (template.sourceDocxId) {
      sourceDocxId = uid("SRC");
      const copied = await copyFile(template.sourceDocxId, sourceDocxId);
      if (!copied) sourceDocxId = null;
    }
    const snapshot: TemplateSnapshot = {
      ...snapshotOf(template),
      name: `Copy of ${template.name}`,
      status: "draft",
      sourceDocxId,
    };
    const copy: MemoTemplate = {
      ...snapshot,
      id: copyId,
      version: 1,
      publishedVersion: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [{ version: 1, status: "draft", savedAt: new Date().toISOString(), note: `Duplicated from ${template.name}`, snapshot }],
    };
    set({
      offices: patchOffice(get(), (current) => ({ ...current, templates: [copy, ...current.templates] })),
      notice: { tone: "success", text: `Duplicated ${template.name}.` },
    });
    await persist(get());
    return copyId;
  },

  archiveTemplate: (templateId) => {
    set({
      offices: patchOffice(get(), (office) => ({
        ...office,
        templates: office.templates.map((template) =>
          template.id === templateId ? { ...template, status: "archived", updatedAt: new Date().toISOString() } : template,
        ),
      })),
      notice: { tone: "info", text: "Template archived. Generated documents still point at the version they used." },
    });
    void persist(get());
  },

  createBlank: () => {
    const id = uid("TPL").toLowerCase();
    const snapshot: TemplateSnapshot = {
      name: "Untitled memorandum",
      category: "General",
      description: "",
      subjectFormat: "{{subjectLine}}",
      defaultRecipients: "",
      defaultCc: "",
      defaultOfficial: "",
      body: "Effective {{effectiveDate}}, this memorandum applies to {{airport}} {{location}}.\n\n{{additionalNotes}}",
      fields: [
        { id: "subjectLine", label: "Subject line", type: "text", required: true, guided: true, defaultValue: "" },
        { id: "airport", label: "Airport", type: "airport", required: true, guided: true, defaultValue: "" },
        { id: "location", label: "Location", type: "location", required: false, guided: true, defaultValue: "" },
        { id: "effectiveDate", label: "Effective date", type: "date", required: true, guided: true, defaultValue: "" },
        { id: "additionalNotes", label: "Additional notes", type: "textarea", required: false, guided: true, defaultValue: "" },
      ],
      formatting: {
        title: "MEMORANDUM",
        labels: { to: "TO", from: "FROM", cc: "CC", date: "DATE", subject: "SUBJECT" },
        includeHeader: true,
      },
      status: "draft",
      sourceDocxId: null,
      useOriginalPackage: false,
      importWarnings: [],
    };
    const template: MemoTemplate = {
      ...snapshot,
      id,
      version: 0,
      publishedVersion: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [],
    };
    set({
      offices: patchOffice(get(), (office) => ({ ...office, templates: [template, ...office.templates] })),
    });
    void persist(get());
    return id;
  },

  importDocx: async (file) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { inspection } = await readDocxPackage(bytes);
    const sourceDocxId = uid("SRC");
    await putFile(sourceDocxId, bytes);
    const id = uid("TPL").toLowerCase();
    const body = inspection.paragraphs.join("\n\n");
    const snapshot: TemplateSnapshot = {
      name: file.name.replace(/\.docx$/i, ""),
      category: "Imported",
      description: "Imported from a Word memorandum. Select text and turn it into placeholders.",
      subjectFormat: "{{subjectLine}}",
      defaultRecipients: "",
      defaultCc: "",
      defaultOfficial: "",
      body: body || "Imported document had no readable paragraphs.",
      fields: [{ id: "subjectLine", label: "Subject", type: "text", required: true, guided: true, defaultValue: "" }],
      formatting: {
        title: "MEMORANDUM",
        labels: { to: "TO", from: "FROM", cc: "CC", date: "DATE", subject: "SUBJECT" },
        includeHeader: true,
      },
      status: "draft",
      sourceDocxId,
      useOriginalPackage: true,
      importWarnings: inspection.warnings,
    };
    const template: MemoTemplate = {
      ...snapshot,
      id,
      version: 1,
      publishedVersion: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [{ version: 1, status: "draft", savedAt: new Date().toISOString(), note: `Imported ${file.name}`, snapshot }],
    };
    set({
      offices: patchOffice(get(), (office) => ({ ...office, templates: [template, ...office.templates] })),
      activity: [activity(`Imported ${file.name} as a draft template.`, inspection.warnings.length ? "warning" : "success"), ...get().activity].slice(0, 40),
      notice: {
        tone: inspection.warnings.length ? "warning" : "success",
        text: inspection.warnings.length
          ? "Word file imported. Review the limitations, then mark the text that should change."
          : "Word file imported. Select text to turn into fields.",
      },
    });
    await persist(get());
    return id;
  },

  markPlaceholder: async (template, literal, fieldId) => {
    const token = `{{${fieldId}}}`;
    let nextBody = template.body.includes(literal) ? template.body.replace(literal, token) : template.body;
    let warnings = [...template.importWarnings];
    let sourceDocxId = template.sourceDocxId;
    if (template.sourceDocxId) {
      const original = await getFile(template.sourceDocxId);
      if (!original) {
        warnings = [...warnings, "The original Word package is no longer in local storage, so only the working text was updated."];
      } else {
        const replaced = await replaceLiteralInDocx(original, literal, token);
        if (!replaced.found) {
          warnings = [...warnings, `“${literal}” was not found as a continuous phrase in the Word package. The working text was updated, and DOCX generation will use a new document instead of the original package.`];
          nextBody = template.body.includes(literal) ? template.body.replace(literal, token) : `${template.body}`;
        } else {
          sourceDocxId = uid("SRC");
          await putFile(sourceDocxId, replaced.bytes);
        }
      }
    }
    return { ...template, body: nextBody, sourceDocxId, useOriginalPackage: Boolean(sourceDocxId) && !warnings.some((item) => item.includes("new document")), importWarnings: warnings };
  },

  generate: async (input) => {
    const office = officeOf(get());
    const template = office.templates.find((item) => item.id === input.templateId);
    if (!template) return { documentId: "", warnings: [], errors: ["Choose a template that exists in this office."] };
    const issues = validateFieldValues(template, input.values, input.mode);
    if (input.mode === "guided" && issues.length) {
      return { documentId: "", warnings: [], errors: issues.map((issue) => issue.message) };
    }
    if (input.mode === "full") {
      const blocking = issues.filter((issue) => issue.fieldId === "memoDate");
      if (blocking.length) return { documentId: "", warnings: [], errors: blocking.map((issue) => issue.message) };
    }
    const documentId = input.existingDocumentId && !get().documents.some((doc) => doc.documentId === input.existingDocumentId && doc.documentId !== input.existingDocumentId)
      ? input.existingDocumentId
      : freshId(get().documents);
    const memo = resolveMemorandum({
      template,
      config: office.config,
      values: { ...initialValues(template, office.config), ...input.values },
      mode: input.mode,
      documentId,
      brandingVersion: office.branding.version,
      overrides: input.overrides,
    });
    const warnings: string[] = [...template.importWarnings];
    const errors: string[] = [];
    const logo = logoAsset(office);
    if (!logo) warnings.push("No branding image is embedded. Add a logo before treating this as a finished memorandum.");
    let docxBytes: Uint8Array | null = null;
    let pdfBytes: Uint8Array | null = null;
    if (input.formats.includes("docx")) {
      try {
        const usePackage = template.useOriginalPackage && template.sourceDocxId && input.mode === "guided" && !input.overrides?.body;
        if (usePackage && template.sourceDocxId) {
          const source = await getFile(template.sourceDocxId);
          if (!source) {
            warnings.push("The original Word package could not be found. A new DOCX was built from the template wording.");
            docxBytes = await buildMemorandumDocx(memo, logo);
          } else {
            const tokens = tokenMapForPackage(memo, template, input.values, office.config);
            const filled = await fillDocxTokens(source, tokens);
            docxBytes = filled.bytes;
            if (filled.unresolved.length) {
              warnings.push(`Placeholders still in the Word package: ${filled.unresolved.join(", ")}.`);
            }
            const audit = await auditDocxAssets(docxBytes);
            if (audit.external.length) {
              warnings.push("The Word package pointed at an external file, so a self-contained DOCX was built instead.");
              docxBytes = await buildMemorandumDocx(memo, logo);
            }
          }
        } else {
          docxBytes = await buildMemorandumDocx(memo, logo);
        }
        const audit = await auditDocxAssets(docxBytes);
        if (audit.external.length) {
          errors.push("DOCX generation was rejected because it still links an external image.");
          docxBytes = null;
        } else if (logo && audit.embedded.length === 0 && !template.useOriginalPackage) {
          warnings.push("The DOCX was created without an embedded media file.");
        }
      } catch (error) {
        errors.push(error instanceof Error ? `Word file failed: ${error.message}` : "Word file failed.");
      }
    }
    let signatureField = false;
    if (input.formats.includes("pdf")) {
      try {
        pdfBytes = await buildMemorandumPdf(memo, logo);
        signatureField = pdfHasSignatureField(pdfBytes);
        if (!signatureField) errors.push("PDF was created but the digital signature field could not be verified.");
      } catch (error) {
        errors.push(error instanceof Error ? `PDF failed: ${error.message}` : "PDF failed.");
        pdfBytes = null;
      }
    }
    if (!docxBytes && !pdfBytes && errors.length) {
      set({ notice: { tone: "danger", text: errors[0] ?? "Generation failed." } });
      return { documentId: "", warnings, errors };
    }
    if (docxBytes) await putFile(`${documentId}:docx`, docxBytes);
    if (pdfBytes) await putFile(`${documentId}:pdf`, pdfBytes);
    const taken = new Set(get().documents.filter((doc) => doc.documentId !== documentId).flatMap((doc) => [doc.filenameDocx, doc.filenamePdf].filter(Boolean).map((name) => name.toLowerCase())));
    const airport = input.values.airport || "office";
    const stem = `${documentId}_${airport}_${template.name}`;
    const filenameDocx = docxBytes ? uniqueFilename(stem, "docx", taken) : "";
    const filenamePdf = pdfBytes ? uniqueFilename(stem, "pdf", taken) : "";
    const record: DocumentRecord = {
      documentId,
      officeId: office.id,
      batchId: input.batchId ?? null,
      templateId: template.id,
      templateName: template.name,
      templateVersion: template.version,
      brandingVersion: office.branding.version,
      configVersion: office.config.version,
      generatedAt: new Date().toISOString(),
      filenameDocx,
      filenamePdf,
      hasDocx: Boolean(docxBytes),
      hasPdf: Boolean(pdfBytes),
      subject: memo.subject,
      status: docxBytes || pdfBytes ? "generated" : "draft",
      mode: input.mode,
      fieldValues: input.values,
      snapshot: memo,
      sourceRecord: input.sourceRecord ?? null,
      warnings,
      signatureField,
      logoEmbedded: Boolean(logo),
    };
    const produced = Boolean(docxBytes || pdfBytes);
    set({
      documents: [record, ...get().documents.filter((doc) => doc.documentId !== documentId)],
      activity: [activity(`${produced ? "Generated" : "Saved draft"} ${documentId} (${template.name} v${template.version}).`, errors.length ? "warning" : "success"), ...get().activity].slice(0, 40),
      notice: {
        tone: errors.length ? "warning" : "success",
        text: errors.length
          ? `${documentId} finished with errors. ${errors[0]}`
          : produced
            ? `${documentId} is ready to download.`
            : `Draft ${documentId} saved.`,
      },
    });
    await persist(get());
    return { documentId, warnings, errors };
  },

  setDocumentStatus: (documentId, status) => {
    set({
      documents: get().documents.map((doc) => (doc.documentId === documentId ? { ...doc, status } : doc)),
      notice: { tone: "info", text: status === "archived" ? `${documentId} archived.` : `${documentId} restored to the working list.` },
    });
    void persist(get());
  },

  setBatchDraft: (draft) => {
    set({ batchDraft: draft });
    void persist(get());
  },

  generateBatch: async () => {
    const draft = get().batchDraft;
    const office = officeOf(get());
    const template = office.templates.find((item) => item.id === draft?.templateId);
    if (!draft || !template) return [{ key: "batch", errors: ["Import a batch before generating."], warnings: [] }];
    const included = draft.records.filter((record) => record.included);
    const invalid = included.filter((record) => recordIssues(template, record).length > 0);
    if (draft.allOrNothing && invalid.length) {
      const text = "All-or-nothing is on, and at least one included record is invalid. Nothing was generated.";
      set({ notice: { tone: "danger", text } });
      return invalid.map((record) => ({ key: record.key, errors: recordIssues(template, record), warnings: [] }));
    }
    const results: Array<{ key: string; documentId?: string; errors: string[]; warnings: string[] }> = [];
    for (const record of draft.records) {
      if (!record.included) {
        results.push({ key: record.key, errors: [], warnings: ["Excluded."] });
        continue;
      }
      const issues = recordIssues(template, record);
      if (issues.length) {
        results.push({ key: record.key, errors: issues, warnings: [] });
        continue;
      }
      const values = { ...initialValues(template, office.config), ...record.values };
      if (!values.memoDate) values.memoDate = todayIso();
      const result = await get().generate({
        templateId: template.id,
        values,
        mode: "guided",
        formats: ["docx", "pdf"],
        batchId: draft.batchId,
        sourceRecord: record.source,
      });
      results.push({ key: record.key, documentId: result.documentId || undefined, errors: result.errors, warnings: result.warnings });
    }
    const made = results.filter((item) => item.documentId).length;
    set({
      activity: [activity(`Batch ${draft.batchId}: ${made} memorandum${made === 1 ? "" : "s"} generated.`, "success"), ...get().activity].slice(0, 40),
      notice: { tone: made ? "success" : "warning", text: `Batch ${draft.batchId} produced ${made} memorandum${made === 1 ? "" : "s"}.` },
    });
    await persist(get());
    return results;
  },

  downloadDocument: async (documentId, kind) => {
    const doc = get().documents.find((item) => item.documentId === documentId);
    const bytes = await getFile(`${documentId}:${kind}`);
    if (!doc || !bytes) {
      set({ notice: { tone: "danger", text: "That file is not in local storage." } });
      return;
    }
    const name = kind === "docx" ? doc.filenameDocx : doc.filenamePdf;
    const type = kind === "docx"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf";
    downloadBlob(name || `${documentId}.${kind}`, new Blob([new Uint8Array(bytes)], { type }));
  },

  exportPackage: async () => {
    const state = get();
    const blob = await buildExportZip({
      offices: state.offices,
      activeOfficeId: state.activeOfficeId,
      documents: state.documents,
      activity: state.activity,
      batchDraft: state.batchDraft,
    });
    downloadBlob(`memorandum-builder-${todayIso()}.zip`, blob);
    set({ notice: { tone: "success", text: "Exported templates, configuration, branding, and generated files." } });
  },

  importPackage: async (file) => {
    const state = await readExportZip(await file.arrayBuffer());
    set({
      offices: state.offices,
      activeOfficeId: state.activeOfficeId || state.offices[0]?.id || "office-central",
      documents: state.documents ?? [],
      activity: [activity(`Imported package ${file.name}.`, "success"), ...(state.activity ?? [])].slice(0, 40),
      batchDraft: state.batchDraft ?? null,
      notice: { tone: "success", text: "Package imported. Previous browser data for this app was replaced by the package." },
    });
    await persist(get());
  },

  resetSamples: async () => {
    const office = starterOffice();
    try {
      const dataUrl = await rasterizeSvg(MARK_SVG, 640, 192);
      office.branding.logoDataUrl = dataUrl;
      office.branding.versions[0]!.snapshot.logoDataUrl = dataUrl;
    } catch {
      /* starter still loads without a raster logo */
    }
    set({
      offices: [office],
      activeOfficeId: office.id,
      documents: [],
      batchDraft: null,
      activity: [activity("Reset to the starter office. Exported packages are not affected.", "warning")],
      notice: { tone: "warning", text: "Starter data replaced what was stored in this browser." },
    });
    await persist(get());
  },
}));

function freshId(documents: DocumentRecord[]): string {
  const taken = new Set(documents.map((doc) => doc.documentId));
  let id = uid("MEMO");
  while (taken.has(id)) id = uid("MEMO");
  return id;
}

export function activeOffice(state: Pick<MemoStore, "offices" | "activeOfficeId">): OfficeRecord | undefined {
  return state.offices.find((office) => office.id === state.activeOfficeId);
}

export { formatLongDate };

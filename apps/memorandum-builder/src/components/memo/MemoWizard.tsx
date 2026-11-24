import { useEffect, useMemo, useState } from "react";
import { Check, Code2, FileText, Pencil } from "lucide-react";
import { activeOffice, useMemoStore } from "@/modules/memo-store";
import { initialValues, resolveMemorandum, validateFieldValues } from "@/services/template-service";
import { uid } from "@/domain/ids";
import { Button, TextArea } from "@/components/ui";
import { DynamicFieldForm } from "@/components/memo/DynamicFieldForm";
import { MemoPreview } from "@/components/memo/MemoPreview";
import { WizardStepper } from "@/components/memo/WizardStepper";

export function MemoWizard({ initialTemplateId = "" }: { initialTemplateId?: string }) {
  const office = useMemoStore(activeOffice);
  const generate = useMemoStore((state) => state.generate);
  const downloadDocument = useMemoStore((state) => state.downloadDocument);
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [mode, setMode] = useState<"guided" | "full">("guided");
  const [values, setValues] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState({ subject: "", body: "", linked: true });
  const [documentId, setDocumentId] = useState(() => uid("MEMO"));
  const [result, setResult] = useState<{ id: string; warnings: string[]; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const template = office?.templates.find((item) => item.id === templateId);

  useEffect(() => {
    if (!office) return;
    const next = office.templates.find((item) => item.id === initialTemplateId && item.status !== "archived");
    if (next && next.id !== templateId) {
      setTemplateId(next.id);
      setValues(initialValues(next, office.config));
    }
  }, [initialTemplateId, office, templateId]);

  useEffect(() => {
    if (!office || templateId) return;
    const next =
      office.templates.find((item) => item.status === "published") ??
      office.templates.find((item) => item.status !== "archived");
    if (!next) return;
    setTemplateId(next.id);
    setValues(initialValues(next, office.config));
  }, [office, templateId]);

  const issues = template ? validateFieldValues(template, values, mode) : [];
  const memo = useMemo(() => {
    if (!office || !template) return null;
    return resolveMemorandum({
      template,
      config: office.config,
      values,
      mode,
      documentId,
      brandingVersion: office.branding.version,
      overrides: mode === "full" && !overrides.linked ? { subject: overrides.subject, body: overrides.body } : undefined,
    });
  }, [office, template, values, mode, documentId, overrides]);

  useEffect(() => {
    if (mode === "full" && overrides.linked && memo) {
      setOverrides((current) => ({ ...current, subject: memo.subject, body: memo.body }));
    }
  }, [mode, overrides.linked, memo]);

  if (!office) return null;

  function chooseTemplate(id: string) {
    const next = office?.templates.find((item) => item.id === id);
    if (!next || !office) return;
    setTemplateId(id);
    setValues(initialValues(next, office.config));
    setResult(null);
    setDocumentId(uid("MEMO"));
  }

  async function run(formats: Array<"docx" | "pdf">) {
    if (!template) return;
    setBusy(true);
    const response = await generate({
      templateId: template.id,
      values,
      mode,
      formats,
      existingDocumentId: documentId,
      overrides: mode === "full" ? { subject: overrides.subject, body: overrides.body } : undefined,
    });
    setBusy(false);
    if (response.documentId) {
      setResult({ id: response.documentId, warnings: response.warnings, errors: response.errors });
      setStep(3);
      if (formats.includes("docx") && response.errors.length === 0) await downloadDocument(response.documentId, "docx");
      if (formats.includes("pdf") && !response.errors.some((error) => error.startsWith("PDF"))) {
        await downloadDocument(response.documentId, "pdf");
      }
    } else {
      setResult({ id: "", warnings: response.warnings, errors: response.errors });
    }
  }

  const usable = office.templates.filter((item) => item.status !== "archived");
  const nextLabel = ["Next: Populate Fields", "Next: Preview", "Next: Generate", "Generate"][step];

  return (
    <section className="overflow-hidden rounded-mb border border-mb-line bg-mb-surface shadow-mb">
      <header className="flex items-center gap-2 bg-mb-navy px-4 py-3 text-mb-on-navy">
        <FileText size={18} aria-hidden />
        <h2 className="text-base font-semibold">Create New Memorandum</h2>
      </header>
      <div className="grid gap-4 p-4">
        <WizardStepper step={step} onStep={setStep} />
        <div className={`grid gap-4 ${step === 0 ? "xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : ""}`}>
          <div className={step === 2 ? "hidden" : "grid gap-4"}>
            {step === 0 ? (
              <>
                <label className="block text-sm font-semibold text-mb-ink">
                  Memorandum Type
                  <select
                    className="mt-2 min-h-11 w-full rounded-mb border border-mb-line bg-mb-surface px-3 text-sm font-normal"
                    value={templateId}
                    onChange={(event) => chooseTemplate(event.target.value)}
                  >
                    <option value="">Select a template</option>
                    {usable.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <p className="text-sm font-semibold text-mb-ink">Mode</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setMode("guided")}
                      className={`relative min-h-28 rounded-mb border p-4 text-center ${mode === "guided" ? "border-mb-blue bg-mb-blue-soft" : "border-mb-line bg-mb-surface"}`}
                    >
                      {mode === "guided" ? <Check size={16} className="absolute right-3 top-3 text-mb-blue" /> : null}
                      <Pencil className="mx-auto text-mb-blue" size={18} aria-hidden />
                      <span className="mt-2 block font-semibold">Guided Mode</span>
                      <span className="mt-1 block text-xs text-mb-muted">Edit only designated fields</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("full")}
                      className={`relative min-h-28 rounded-mb border p-4 text-center ${mode === "full" ? "border-mb-blue bg-mb-blue-soft" : "border-mb-line bg-mb-surface"}`}
                    >
                      {mode === "full" ? <Check size={16} className="absolute right-3 top-3 text-mb-blue" /> : null}
                      <Code2 className="mx-auto text-mb-muted" size={18} aria-hidden />
                      <span className="mt-2 block font-semibold">Full Edit Mode</span>
                      <span className="mt-1 block text-xs text-mb-muted">Edit the entire document</span>
                    </button>
                  </div>
                </div>
                <Button type="button" disabled={!template} onClick={() => setStep(1)}>
                  {nextLabel} →
                </Button>
              </>
            ) : null}
            {step === 1 && template ? (
              <div className="grid gap-4">
                <DynamicFieldForm
                  template={template}
                  config={office.config}
                  values={values}
                  mode={mode}
                  onChange={(id, value) => setValues((current) => ({ ...current, [id]: value }))}
                />
                {mode === "full" ? (
                  <div className="grid gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={overrides.linked}
                        onChange={(event) => setOverrides((current) => ({ ...current, linked: event.target.checked }))}
                      />
                      Keep subject and body linked to the fields
                    </label>
                    <TextArea
                      aria-label="Subject"
                      value={overrides.subject}
                      disabled={overrides.linked}
                      onChange={(event) => setOverrides((current) => ({ ...current, subject: event.target.value, linked: false }))}
                    />
                    <TextArea
                      aria-label="Full memorandum body"
                      className="min-h-48"
                      value={overrides.body}
                      disabled={overrides.linked}
                      onChange={(event) => setOverrides((current) => ({ ...current, body: event.target.value, linked: false }))}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            {step === 3 ? (
              <div className="grid gap-3 text-sm">
                <p className="font-semibold text-mb-ink">{result?.id ? `Document ${result.id}` : "Nothing has been generated yet."}</p>
                {result?.errors.map((error) => (
                  <p key={error} className="text-mb-danger">{error}</p>
                ))}
                {result?.warnings.map((warning) => (
                  <p key={warning} className="text-mb-warning">{warning}</p>
                ))}
                {result?.id ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => void downloadDocument(result.id, "docx")}>Download DOCX</Button>
                    <Button type="button" variant="secondary" onClick={() => void downloadDocument(result.id, "pdf")}>Download PDF</Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {step !== 1 ? <MemoPreview memo={memo} logoUrl={office.branding.logoDataUrl} /> : null}
        </div>
        {issues.length && step > 0 ? (
          <ul className="grid gap-1 text-sm text-mb-danger">
            {issues.map((issue) => (
              <li key={issue.fieldId + issue.message}>{issue.message}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-2 border-t border-mb-line pt-4">
          <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>
            Back
          </Button>
          <Button type="button" variant="secondary" disabled={!template || busy} onClick={() => void run([])}>
            Save draft
          </Button>
          {step > 0 ? (
            <Button
              type="button"
              disabled={step >= 3 || !template || (step === 1 && issues.length > 0)}
              onClick={() => setStep((current) => Math.min(3, current + 1))}
            >
              {nextLabel}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" disabled={!template || busy || issues.length > 0} onClick={() => void run(["docx"])}>
            Generate DOCX
          </Button>
          <Button type="button" variant="secondary" disabled={!template || busy || issues.length > 0} onClick={() => void run(["pdf"])}>
            Generate PDF
          </Button>
        </div>
      </div>
    </section>
  );
}

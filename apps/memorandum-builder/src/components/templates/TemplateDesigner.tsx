import { useState } from "react";
import type { FieldType, MemoTemplate, TemplateField } from "@/domain/types";
import { useMemoStore } from "@/modules/memo-store";
import { FIELD_ID_PATTERN } from "@/services/template-service";
import { Badge, Button, Card, Field, Select, TextArea, TextInput, statusTone } from "@/components/ui";

const TYPES: FieldType[] = ["text", "textarea", "date", "dateRange", "airport", "location", "personnel", "select"];

export function TemplateDesigner({ template }: { template: MemoTemplate }) {
  const saveTemplate = useMemoStore((state) => state.saveTemplate);
  const restoreTemplate = useMemoStore((state) => state.restoreTemplate);
  const markPlaceholder = useMemoStore((state) => state.markPlaceholder);
  const [draft, setDraft] = useState(template);
  const [literal, setLiteral] = useState("");
  const [field, setField] = useState<TemplateField>({
    id: "",
    label: "",
    type: "text",
    required: true,
    guided: true,
    defaultValue: "",
  });
  const [message, setMessage] = useState("");

  function patch(partial: Partial<MemoTemplate>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  async function convertSelection() {
    const selected = window.getSelection()?.toString().trim() || literal.trim();
    if (!selected) {
      setMessage("Select a phrase in the wording, or type the exact phrase to replace.");
      return;
    }
    if (!FIELD_ID_PATTERN.test(field.id)) {
      setMessage("Field id must start with a letter and use only letters, numbers, and underscores.");
      return;
    }
    if (draft.fields.some((item) => item.id === field.id)) {
      setMessage("That field id already exists.");
      return;
    }
    const next = await markPlaceholder(draft, selected, field.id);
    setDraft({
      ...next,
      fields: [...next.fields, { ...field, label: field.label || field.id }],
    });
    setLiteral("");
    setField({ id: "", label: "", type: "text", required: true, guided: true, defaultValue: "" });
    setMessage(`Replaced “${selected}” with {{${field.id}}}.`);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-4">
        <Card className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(draft.status)}>{draft.status}</Badge>
            <Badge tone="neutral">Version {draft.version || "unsaved"}</Badge>
            {draft.publishedVersion ? <Badge tone="info">Published v{draft.publishedVersion}</Badge> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name"><TextInput value={draft.name} onChange={(event) => patch({ name: event.target.value })} /></Field>
            <Field label="Category"><TextInput value={draft.category} onChange={(event) => patch({ category: event.target.value })} /></Field>
          </div>
          <Field label="Description"><TextInput value={draft.description} onChange={(event) => patch({ description: event.target.value })} /></Field>
          <Field label="Subject format" hint="Use {{fieldId}} tokens. Derived tokens: officeName, region, airportName, issuingTitle, routingBlock, term.yourKey.">
            <TextInput value={draft.subjectFormat} onChange={(event) => patch({ subjectFormat: event.target.value })} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Default recipients"><TextArea value={draft.defaultRecipients} onChange={(event) => patch({ defaultRecipients: event.target.value })} /></Field>
            <Field label="Default CC"><TextArea value={draft.defaultCc} onChange={(event) => patch({ defaultCc: event.target.value })} /></Field>
          </div>
          <Field label="Standard wording">
            <TextArea className="min-h-56" value={draft.body} onChange={(event) => patch({ body: event.target.value, useOriginalPackage: false })} />
          </Field>
          <div>
            <h2 className="font-semibold text-mb-ink">Identify a phrase</h2>
            <p className="mt-1 text-sm text-mb-muted">Select text in the wording box, or type the exact phrase. It becomes a placeholder in the working text and, when possible, in the original Word package.</p>
            <div
              className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-mb border border-mb-line bg-mb-page p-3 text-sm"
              onMouseUp={() => {
                const selected = window.getSelection()?.toString().trim();
                if (selected) setLiteral(selected);
              }}
            >
              {draft.body}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Phrase"><TextInput value={literal} onChange={(event) => setLiteral(event.target.value)} /></Field>
              <Field label="Field id"><TextInput value={field.id} onChange={(event) => setField({ ...field, id: event.target.value })} /></Field>
              <Field label="Label"><TextInput value={field.label} onChange={(event) => setField({ ...field, label: event.target.value })} /></Field>
              <Field label="Type">
                <Select value={field.type} onChange={(event) => setField({ ...field, type: event.target.value as FieldType })}>
                  {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </Select>
              </Field>
              <Field label="Default"><TextInput value={field.defaultValue} onChange={(event) => setField({ ...field, defaultValue: event.target.value })} /></Field>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={field.required} onChange={(event) => setField({ ...field, required: event.target.checked })} /> Required</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={field.guided} onChange={(event) => setField({ ...field, guided: event.target.checked })} /> Guided</label>
              </div>
            </div>
            <Button type="button" className="mt-3" onClick={() => void convertSelection()}>Convert to placeholder</Button>
            {message ? <p className="mt-2 text-sm text-mb-navy">{message}</p> : null}
          </div>
        </Card>
        {draft.importWarnings.length ? (
          <Card>
            <h2 className="font-semibold text-mb-warning">Import limitations</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-mb-muted">
              {draft.importWarnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </Card>
        ) : null}
      </div>
      <div className="grid gap-4 self-start">
        <Card>
          <h2 className="font-semibold">Fields</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {draft.fields.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-2">
                <span>
                  <span className="font-semibold">{item.label}</span>
                  <span className="block text-mb-muted">{`{{${item.id}}} · ${item.type}${item.required ? " · required" : ""}`}</span>
                </span>
                <button
                  type="button"
                  className="min-h-11 text-mb-danger"
                  onClick={() => patch({ fields: draft.fields.filter((fieldItem) => fieldItem.id !== item.id) })}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="grid gap-2">
          <Button type="button" variant="secondary" onClick={() => saveTemplate(draft, "draft", "Draft save")}>Save draft</Button>
          <Button type="button" onClick={() => saveTemplate(draft, "published", "Published baseline")}>Publish new baseline</Button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.useOriginalPackage} onChange={(event) => patch({ useOriginalPackage: event.target.checked })} />
            Generate DOCX from the original package
          </label>
        </Card>
        <Card>
          <h2 className="font-semibold">Version history</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {draft.versions.map((version) => (
              <li key={version.version} className="flex items-center justify-between gap-2">
                <span>v{version.version} · {version.status}<span className="block text-xs text-mb-muted">{version.note}</span></span>
                <button type="button" className="min-h-11 font-semibold text-mb-blue" onClick={() => restoreTemplate(draft.id, version.version)}>Restore</button>
              </li>
            ))}
            {draft.versions.length === 0 ? <li className="text-mb-muted">No saved versions yet.</li> : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}

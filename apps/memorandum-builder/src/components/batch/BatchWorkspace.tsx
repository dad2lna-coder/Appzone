import { useMemo, useState } from "react";
import { activeOffice, useMemoStore } from "@/modules/memo-store";
import { asset } from "@/nav";
import { parseBatchJson, recordIssues } from "@/services/batch-service";
import { initialValues, resolveMemorandum } from "@/services/template-service";
import { uid } from "@/domain/ids";
import { Badge, Button, Card } from "@/components/ui";
import { DynamicFieldForm } from "@/components/memo/DynamicFieldForm";
import { MemoPreview } from "@/components/memo/MemoPreview";

export function BatchWorkspace() {
  const office = useMemoStore(activeOffice);
  const draft = useMemoStore((state) => state.batchDraft);
  const setBatchDraft = useMemoStore((state) => state.setBatchDraft);
  const generateBatch = useMemoStore((state) => state.generateBatch);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ key: string; documentId?: string; errors: string[]; warnings: string[] }>>([]);
  const [busy, setBusy] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const template = office?.templates.find((item) => item.id === draft?.templateId);
  const current = draft?.records.find((record) => record.key === selected) ?? draft?.records[0];

  const preview = useMemo(() => {
    if (!office || !template || !current) return null;
    return resolveMemorandum({
      template,
      config: office.config,
      values: { ...initialValues(template, office.config), ...current.values, memoDate: current.values.memoDate || new Date().toISOString().slice(0, 10) },
      mode: "guided",
      documentId: "PREVIEW",
      brandingVersion: office.branding.version,
    });
  }, [office, template, current]);

  if (!office) return null;

  async function loadText(text: string, fileName: string) {
    const parsed = parseBatchJson(text, office?.templates ?? []);
    setFileErrors(parsed.fileErrors);
    setResults([]);
    if (parsed.draft) {
      setBatchDraft({ ...parsed.draft, fileName });
      setSelected(parsed.draft.records[0]?.key ?? null);
    }
  }

  return (
    <div className="grid gap-4">
      <Card className="flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-mb bg-mb-blue px-4 text-sm font-semibold text-mb-on-blue">
          Import JSON
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              await loadText(await file.text(), file.name);
              event.target.value = "";
            }}
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            const response = await fetch(asset("/samples/batch-schedule.json"));
            await loadText(await response.text(), "batch-schedule.json");
          }}
        >
          Load sample batch
        </Button>
        <a className="text-sm font-semibold text-mb-blue" href={asset("/samples/batch.schema.json")}>Batch schema</a>
        {draft ? <Badge tone="info">{draft.batchId}</Badge> : null}
      </Card>
      {fileErrors.map((error) => <p key={error} className="text-sm text-mb-danger">{error}</p>)}
      {draft && template ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
          <Card className="overflow-auto">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-mb-muted">{template.name} · {draft.records.length} records</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.allOrNothing}
                  onChange={(event) => setBatchDraft({ ...draft, allOrNothing: event.target.checked })}
                />
                All or nothing
              </label>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-mb-muted">
                <tr>
                  <th className="py-2">Include</th>
                  <th>Record</th>
                  <th>Airport</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {draft.records.map((record) => {
                  const issues = recordIssues(template, record);
                  return (
                    <tr key={record.key} className={current?.key === record.key ? "bg-mb-blue-soft" : ""}>
                      <td className="py-2">
                        <input
                          type="checkbox"
                          aria-label={`Include ${record.key}`}
                          checked={record.included}
                          onChange={(event) => {
                            setBatchDraft({
                              ...draft,
                              records: draft.records.map((item) => item.key === record.key ? { ...item, included: event.target.checked } : item),
                            });
                          }}
                        />
                      </td>
                      <td>
                        <button type="button" className="min-h-11 font-semibold text-mb-navy" onClick={() => setSelected(record.key)}>
                          {record.key}
                        </button>
                      </td>
                      <td>{record.values.airport || "—"}</td>
                      <td>{issues.length ? <Badge tone="danger">{issues.length} issue{issues.length === 1 ? "" : "s"}</Badge> : <Badge tone="success">Valid</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {current ? (
              <div className="mt-4 border-t border-mb-line pt-4">
                <h2 className="mb-3 font-semibold">Edit {current.key}</h2>
                {recordIssues(template, current).map((issue) => <p key={issue} className="mb-2 text-sm text-mb-danger">{issue}</p>)}
                <DynamicFieldForm
                  template={template}
                  config={office.config}
                  values={{ ...initialValues(template, office.config), ...current.values }}
                  mode="full"
                  onChange={(id, value) => {
                    setBatchDraft({
                      ...draft,
                      records: draft.records.map((item) => item.key === current.key ? { ...item, values: { ...item.values, [id]: value } } : item),
                    });
                  }}
                />
              </div>
            ) : null}
            <Button
              type="button"
              className="mt-4"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setResults(await generateBatch());
                setBusy(false);
              }}
            >
              {busy ? "Generating…" : "Generate included memorandums"}
            </Button>
          </Card>
          <div className="grid gap-4">
            <MemoPreview memo={preview} logoUrl={office.branding.logoDataUrl} />
            {results.length ? (
              <Card>
                <h2 className="font-semibold">Generation results</h2>
                <ul className="mt-3 grid gap-2 text-sm">
                  {results.map((item) => (
                    <li key={item.key}>
                      <span className="font-semibold">{item.key}</span>
                      {item.documentId ? <span className="text-mb-success"> · {item.documentId}</span> : null}
                      {item.errors.map((error) => <span key={error} className="block text-mb-danger">{error}</span>)}
                      {item.warnings.map((warning) => <span key={warning} className="block text-mb-warning">{warning}</span>)}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        </div>
      ) : (
        <Card>
          <p className="text-sm text-mb-muted">Import a batch JSON file. Each record is validated on its own. One bad record does not stop the others unless you turn on all-or-nothing.</p>
        </Card>
      )}
    </div>
  );
}

export function emptyBatchId() {
  return uid("BATCH");
}

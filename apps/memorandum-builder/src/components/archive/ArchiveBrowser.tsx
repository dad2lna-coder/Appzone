import { useState } from "react";
import { Link } from "@/nav";
import { activeOffice, useMemoStore } from "@/modules/memo-store";
import { downloadBlob, getFile } from "@/services/storage-service";
import { Badge, Button, Card, statusTone } from "@/components/ui";

const AREAS = ["memorandums", "templates", "branding", "configuration", "imports"] as const;

export function ArchiveBrowser() {
  const office = useMemoStore(activeOffice);
  const documents = useMemoStore((state) => state.documents);
  const setStatus = useMemoStore((state) => state.setDocumentStatus);
  const downloadDocument = useMemoStore((state) => state.downloadDocument);
  const [area, setArea] = useState<(typeof AREAS)[number]>("memorandums");
  const [query, setQuery] = useState("");

  if (!office) return null;
  const docs = documents.filter((doc) => doc.officeId === office.id && `${doc.documentId} ${doc.subject}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {AREAS.map((item) => (
          <Button key={item} type="button" variant={area === item ? "primary" : "secondary"} onClick={() => setArea(item)}>
            {item}
          </Button>
        ))}
      </div>
      {area === "memorandums" ? (
        <Card className="grid gap-3">
          <input className="min-h-11 rounded-mb border border-mb-line px-3 text-sm" placeholder="Search documents" value={query} onChange={(event) => setQuery(event.target.value)} />
          {docs.map((doc) => (
            <article key={doc.documentId} className="border-b border-mb-line pb-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-mb-ink">{doc.documentId}</h2>
                <Badge tone={statusTone(doc.status)}>{doc.status}</Badge>
                {doc.batchId ? <Badge tone="info">{doc.batchId}</Badge> : null}
                {doc.signatureField ? <Badge tone="success">Signature field</Badge> : null}
              </div>
              <p className="mt-1 text-mb-ink">{doc.subject}</p>
              <p className="text-mb-muted">
                {doc.templateName} v{doc.templateVersion} · branding v{doc.brandingVersion} · config v{doc.configVersion} · {new Date(doc.generatedAt).toLocaleString()}
              </p>
              <p className="text-mb-muted">{doc.filenameDocx || "No DOCX"} · {doc.filenamePdf || "No PDF"}</p>
              {doc.warnings.map((warning) => <p key={warning} className="text-mb-warning">{warning}</p>)}
              <div className="mt-2 flex flex-wrap gap-2">
                {doc.hasDocx ? <Button type="button" variant="secondary" onClick={() => void downloadDocument(doc.documentId, "docx")}>DOCX</Button> : null}
                {doc.hasPdf ? <Button type="button" variant="secondary" onClick={() => void downloadDocument(doc.documentId, "pdf")}>PDF</Button> : null}
                <Button type="button" variant="ghost" onClick={() => setStatus(doc.documentId, doc.status === "archived" ? "generated" : "archived")}>
                  {doc.status === "archived" ? "Restore" : "Archive"}
                </Button>
              </div>
            </article>
          ))}
          {docs.length === 0 ? <p className="text-sm text-mb-muted">No memorandums in this office yet.</p> : null}
        </Card>
      ) : null}
      {area === "templates" ? (
        <Card className="grid gap-3 text-sm">
          {office.templates.map((template) => (
            <div key={template.id}>
              <Link to="/templates/$templateId" params={{ templateId: template.id }} className="font-semibold text-mb-navy">{template.name}</Link>
              <ul className="mt-1 text-mb-muted">
                {template.versions.map((version) => (
                  <li key={version.version}>v{version.version} · {version.status} · {version.note}</li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
      ) : null}
      {area === "branding" ? (
        <Card className="grid gap-3 text-sm">
          {office.branding.versions.map((version) => (
            <div key={version.version} className="flex items-center gap-3">
              {version.snapshot.logoDataUrl ? <img src={version.snapshot.logoDataUrl} alt="" className="h-8 w-auto" /> : null}
              <span>v{version.version} · {version.note} · {version.snapshot.logoName}</span>
            </div>
          ))}
        </Card>
      ) : null}
      {area === "configuration" ? (
        <Card className="grid gap-2 text-sm">
          {office.config.versions.map((version) => (
            <p key={version.version}>v{version.version} · {version.snapshot.officeName} · {version.note}</p>
          ))}
        </Card>
      ) : null}
      {area === "imports" ? (
        <Card className="grid gap-3 text-sm">
          {office.templates.filter((template) => template.sourceDocxId).map((template) => (
            <div key={template.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>{template.name}</span>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (!template.sourceDocxId) return;
                  const bytes = await getFile(template.sourceDocxId);
                  if (!bytes) return;
                  downloadBlob(`${template.name}-source.docx`, new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
                }}
              >
                Download source
              </Button>
            </div>
          ))}
          {office.templates.every((template) => !template.sourceDocxId) ? <p className="text-mb-muted">No imported Word files yet.</p> : null}
        </Card>
      ) : null}
    </div>
  );
}

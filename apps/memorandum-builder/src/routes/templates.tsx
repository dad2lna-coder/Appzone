import { useRef } from "react";
import { go } from "@/nav";
import { Badge, Button, Card, statusTone } from "@/components/ui";
import { activeOffice, useMemoStore } from "@/modules/memo-store";

export function TemplateManager() {
  const office = useMemoStore(activeOffice);
  const createBlank = useMemoStore((state) => state.createBlank);
  const duplicateTemplate = useMemoStore((state) => state.duplicateTemplate);
  const archiveTemplate = useMemoStore((state) => state.archiveTemplate);
  const importDocx = useMemoStore((state) => state.importDocx);
  const saveTemplate = useMemoStore((state) => state.saveTemplate);
  const inputRef = useRef<HTMLInputElement>(null);
  if (!office) return null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => go(`/templates/${createBlank()}`)}>New template</Button>
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>Import Word template</Button>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const id = await importDocx(file);
            event.target.value = "";
            go(`/templates/${id}`);
          }}
        />
      </div>
      <div className="grid gap-3">
        {office.templates.map((template) => (
          <Card key={template.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <button type="button" className="text-left font-semibold text-mb-navy" onClick={() => go(`/templates/${template.id}`)}>
                {template.name}
              </button>
              <p className="text-sm text-mb-muted">{template.category} · v{template.version} · {template.fields.length} fields</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(template.status)}>{template.status}</Badge>
              <Button type="button" variant="secondary" onClick={() => go(`/templates/${template.id}`)}>Edit</Button>
              <Button type="button" variant="secondary" onClick={async () => {
                const id = await duplicateTemplate(template.id);
                if (id) go(`/templates/${id}`);
              }}>Duplicate</Button>
              <Button type="button" variant="ghost" onClick={() => {
                const name = window.prompt("Rename template", template.name);
                if (name && name.trim()) saveTemplate({ ...template, name: name.trim() }, template.status === "published" ? "published" : "draft", "Renamed");
              }}>Rename</Button>
              {template.status !== "archived" ? <Button type="button" variant="ghost" onClick={() => archiveTemplate(template.id)}>Archive</Button> : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

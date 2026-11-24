import type { MemoTemplate } from "@/domain/types";
import { Badge, statusTone } from "@/components/ui";

export function TemplateSelect({
  templates,
  value,
  onChange,
}: {
  templates: MemoTemplate[];
  value: string;
  onChange: (id: string) => void;
}) {
  const usable = templates.filter((template) => template.status !== "archived");
  return (
    <div className="grid gap-3">
      {usable.map((template) => {
        const selected = template.id === value;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onChange(template.id)}
            className={`rounded-mb border p-4 text-left ${selected ? "border-mb-blue bg-mb-blue-soft" : "border-mb-line bg-mb-surface"}`}
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-mb-ink">{template.name}</span>
              <Badge tone={statusTone(template.status)}>{template.status}</Badge>
              <Badge tone="neutral">{template.category}</Badge>
            </span>
            <span className="mt-1 block text-sm text-mb-muted">{template.description || "No description"}</span>
          </button>
        );
      })}
      {usable.length === 0 ? <p className="text-sm text-mb-muted">No templates are available for this office.</p> : null}
    </div>
  );
}

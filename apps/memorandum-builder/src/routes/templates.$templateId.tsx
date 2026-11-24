import { TemplateDesigner } from "@/components/templates/TemplateDesigner";
import { activeOffice, useMemoStore } from "@/modules/memo-store";

export function TemplateDesignerPage({ templateId }: { templateId: string }) {
  const office = useMemoStore(activeOffice);
  const template = office?.templates.find((item) => item.id === templateId);
  if (!office) return null;
  if (!template) return <p className="text-sm text-mb-muted">That template is not in the selected office.</p>;
  return <TemplateDesigner key={template.updatedAt + template.version} template={template} />;
}

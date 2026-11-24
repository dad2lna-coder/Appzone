import { AppShell } from "@/components/shell/AppShell";
import { ArchiveBrowser } from "@/components/archive/ArchiveBrowser";
import { BatchWorkspace } from "@/components/batch/BatchWorkspace";
import { BrandingConfig } from "@/components/branding/BrandingConfig";
import { MemoWizard } from "@/components/memo/MemoWizard";
import { Dashboard } from "@/routes/index";
import { Settings } from "@/routes/settings";
import { TemplateManager } from "@/routes/templates";
import { TemplateDesignerPage } from "@/routes/templates.$templateId";
import { usePath } from "@/nav";

export function App() {
  const path = usePath().split("?")[0] ?? "/";
  let page = <Dashboard />;
  if (path === "/new") page = <MemoWizard />;
  else if (path === "/templates") page = <TemplateManager />;
  else if (path.startsWith("/templates/")) page = <TemplateDesignerPage templateId={decodeURIComponent(path.slice("/templates/".length))} />;
  else if (path === "/batch") page = <BatchWorkspace />;
  else if (path === "/branding") page = <BrandingConfig />;
  else if (path === "/archive") page = <ArchiveBrowser />;
  else if (path === "/settings") page = <Settings />;
  return <AppShell>{page}</AppShell>;
}

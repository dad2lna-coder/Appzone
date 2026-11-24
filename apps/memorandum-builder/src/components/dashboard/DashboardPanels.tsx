import { Link } from "@/nav";
import { Archive, ArrowRight, ChevronRight, Clock3, FilePlus2, Files, FolderOpen, Layers, Palette, Zap } from "lucide-react";
import type { ActivityEvent, DocumentRecord, MemoTemplate } from "@/domain/types";
import { Badge, statusTone } from "@/components/ui";

const SHORTCUTS = [
  { to: "/new", title: "New Memorandum", text: "Create a new memorandum using a template", icon: FilePlus2, well: "bg-mb-blue-soft text-mb-blue" },
  { to: "/templates", title: "Manage Templates", text: "Create, edit and publish templates", icon: Files, well: "bg-mb-blue-soft text-mb-violet" },
  { to: "/batch", title: "Batch Generation", text: "Import JSON and generate multiple documents", icon: Layers, well: "bg-mb-success-soft text-mb-success" },
  { to: "/branding", title: "Branding & Config", text: "Manage logos, airports and routing", icon: Palette, well: "bg-mb-warning-soft text-mb-amber" },
  { to: "/archive", title: "Archive", text: "View and restore historical documents", icon: Archive, well: "bg-mb-blue-soft text-mb-teal" },
] as const;

export function ShortcutCard() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {SHORTCUTS.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.to} to={item.to} className="flex gap-3 rounded-mb border border-mb-line bg-mb-surface p-4 shadow-mb hover:border-mb-blue">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-mb ${item.well}`}>
              <Icon size={18} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="flex items-center justify-between gap-2 font-semibold text-mb-ink">
                {item.title}
                <ArrowRight size={14} className="text-mb-muted" aria-hidden />
              </span>
              <span className="mt-1 block text-sm text-mb-muted">{item.text}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

const DOT = {
  info: "bg-mb-blue",
  success: "bg-mb-success",
  warning: "bg-mb-warning",
  danger: "bg-mb-danger",
};

export function RecentActivity({ events }: { events: ActivityEvent[] }) {
  return (
    <section className="overflow-hidden rounded-mb border border-mb-line bg-mb-surface shadow-mb">
      <header className="flex items-center justify-between bg-mb-navy px-4 py-3 text-mb-on-navy">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Clock3 size={16} aria-hidden /> Recent Activity</h2>
        <Link to="/archive" className="text-xs font-semibold text-mb-blue-soft">View All</Link>
      </header>
      <ul className="grid gap-3 p-4 text-sm">
        {events.slice(0, 5).map((event) => (
          <li key={event.id} className="flex gap-2">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[event.tone]}`} />
            <span>
              <span className="block text-mb-ink">{event.message}</span>
              <span className="text-xs text-mb-muted">{ago(event.at)}</span>
            </span>
          </li>
        ))}
        {events.length === 0 ? <li className="text-mb-muted">No activity yet.</li> : null}
      </ul>
    </section>
  );
}

const LINKS = [
  { to: "/templates", label: "Import Word Document", icon: Files },
  { to: "/batch", label: "Import Batch JSON", icon: Layers },
  { to: "/settings", label: "Export Configuration", icon: FolderOpen },
  { to: "/archive", label: "View Archive", icon: Archive },
] as const;

export function QuickLinks() {
  return (
    <section className="rounded-mb border border-mb-line bg-mb-surface p-4 shadow-mb">
      <h2 className="flex items-center gap-2 font-semibold text-mb-ink"><Zap size={16} className="text-mb-blue" aria-hidden /> Quick Links</h2>
      <ul className="mt-2">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.label}>
              <Link to={link.to} className="flex min-h-11 items-center justify-between gap-2 text-sm font-semibold text-mb-ink">
                <span className="flex items-center gap-2"><Icon size={16} className="text-mb-blue" aria-hidden /> {link.label}</span>
                <ChevronRight size={16} className="text-mb-muted" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TemplateList({ templates }: { templates: MemoTemplate[] }) {
  return (
    <section className="rounded-mb border border-mb-line bg-mb-surface p-4 shadow-mb">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-mb-ink">Templates</h2>
        <Link to="/templates" className="text-xs font-semibold text-mb-blue">View All</Link>
      </header>
      <ul className="grid gap-3">
        {templates.slice(0, 4).map((template) => (
          <li key={template.id} className="flex items-center justify-between gap-2 text-sm">
            <Link to="/templates/$templateId" params={{ templateId: template.id }} className="font-semibold text-mb-navy">
              {template.name}
            </Link>
            <span className="flex items-center gap-2">
              <span className="text-xs text-mb-muted">v{template.version || 1}</span>
              <Badge tone={statusTone(template.status)}>{template.status}</Badge>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DocumentList({ documents }: { documents: DocumentRecord[] }) {
  return (
    <section className="rounded-mb border border-mb-line bg-mb-surface p-4 shadow-mb">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-mb-ink">Documents</h2>
        <Link to="/archive" className="text-xs font-semibold text-mb-blue">View All</Link>
      </header>
      <ul className="grid gap-3 text-sm">
        {documents.slice(0, 4).map((doc) => (
          <li key={doc.documentId} className="flex items-center justify-between gap-2">
            <span>
              <Link to="/archive" className="font-semibold text-mb-navy">{doc.filenamePdf || doc.filenameDocx || doc.documentId}</Link>
              <span className="mt-0.5 block text-xs text-mb-muted">
                {new Date(doc.generatedAt).toLocaleDateString()} · {doc.fieldValues.airport || doc.templateName}
              </span>
            </span>
            <Badge tone="info">{doc.hasPdf ? "PDF" : doc.hasDocx ? "DOCX" : doc.status}</Badge>
          </li>
        ))}
        {documents.length === 0 ? <li className="text-sm text-mb-muted">No documents yet.</li> : null}
      </ul>
    </section>
  );
}

export function SystemStatus({
  published,
  documents,
  hasLogo,
}: {
  published: number;
  drafts: number;
  documents: number;
  brandingVersion: number;
  hasLogo: boolean;
}) {
  const operational = hasLogo && published > 0;
  return (
    <section className="rounded-mb border border-mb-line bg-mb-surface p-4 shadow-mb">
      <h2 className="font-semibold text-mb-ink">System Status</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-mb bg-mb-page px-2 py-3">
          <p className="font-semibold text-mb-ink">Storage</p>
          <p className="text-mb-muted">Local</p>
        </div>
        <div className="rounded-mb bg-mb-page px-2 py-3">
          <p className="font-semibold text-mb-ink">Files</p>
          <p className="text-mb-muted">{documents} saved</p>
        </div>
        <div className="rounded-mb bg-mb-page px-2 py-3">
          <p className="font-semibold text-mb-ink">Application</p>
          <p className="text-mb-muted">{operational ? "Ready" : "Check"}</p>
        </div>
      </div>
      <p className={`mt-3 rounded-mb px-3 py-2 text-sm ${operational ? "bg-mb-success-soft text-mb-success" : "bg-mb-warning-soft text-mb-warning"}`}>
        {operational ? "All systems operational" : "Add a logo before generating finished copies."}
      </p>
    </section>
  );
}

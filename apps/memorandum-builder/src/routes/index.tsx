import { DocumentList, QuickLinks, RecentActivity, ShortcutCard, SystemStatus, TemplateList } from "@/components/dashboard/DashboardPanels";
import { MemoWizard } from "@/components/memo/MemoWizard";
import { activeOffice, useMemoStore } from "@/modules/memo-store";

export function Dashboard() {
  const office = useMemoStore(activeOffice);
  const documents = useMemoStore((state) => state.documents);
  const activity = useMemoStore((state) => state.activity);
  if (!office) return null;
  const officeDocs = documents.filter((doc) => doc.officeId === office.id);
  const person =
    office.config.personnel.find((entry) => entry.id === office.config.issuingOfficialIds[0]) ??
    office.config.personnel[0];
  const initials = person?.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-mb-navy">Memorandum Builder</h2>
          <p className="mt-1 text-sm text-mb-muted">Official Memorandum Generation and Management</p>
        </div>
        {person ? (
          <div className="flex items-center gap-2 rounded-full border border-mb-line bg-mb-surface py-1 pl-1 pr-3 text-sm">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-mb-navy text-xs font-semibold text-mb-on-navy">{initials}</span>
            <span>
              <span className="block font-semibold leading-4 text-mb-ink">{person.name}</span>
              <span className="text-xs text-mb-muted">{person.title}</span>
            </span>
          </div>
        ) : null}
      </div>
      <ShortcutCard />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <MemoWizard />
        <div className="grid gap-4 self-start">
          <RecentActivity events={activity} />
          <QuickLinks />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <TemplateList templates={office.templates} />
        <DocumentList documents={officeDocs} />
        <SystemStatus
          published={office.templates.filter((template) => template.status === "published").length}
          drafts={office.templates.filter((template) => template.status === "draft").length}
          documents={officeDocs.length}
          brandingVersion={office.branding.version}
          hasLogo={Boolean(office.branding.logoDataUrl)}
        />
      </div>
    </div>
  );
}

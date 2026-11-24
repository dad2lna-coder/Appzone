import { Link, asset, usePath } from "@/nav";
import { Archive, FilePlus2, Files, Home, Layers, Palette, Settings } from "lucide-react";
import { activeOffice, useMemoStore } from "@/modules/memo-store";

const LINKS = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/new", label: "New Memorandum", icon: FilePlus2 },
  { to: "/templates", label: "Template Manager", icon: Files },
  { to: "/batch", label: "Batch Generation", icon: Layers },
  { to: "/branding", label: "Branding & Config", icon: Palette },
  { to: "/archive", label: "Archive", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const pathname = usePath();
  const offices = useMemoStore((state) => state.offices);
  const activeId = useMemoStore((state) => state.activeOfficeId);
  const setOffice = useMemoStore((state) => state.setOffice);
  const ready = useMemoStore((state) => state.ready);
  const office = useMemoStore(activeOffice);

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-mb-navy-deep/40 md:hidden ${open ? "block" : "hidden"}`}
        onClick={onNavigate}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-mb-navy text-mb-on-navy md:sticky md:top-0 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex items-center gap-3 px-4 pb-2 pt-5">
          <WingMark />
          <div>
            <p className="text-base font-semibold leading-5 tracking-tight">Memorandum Builder</p>
            <p className="mt-1 text-xs text-mb-blue-soft">Create · Manage · Archive</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-3">
          {LINKS.map((link) => {
            const active = link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onNavigate}
                className={`flex min-h-11 items-center gap-3 rounded-mb px-3 text-sm font-semibold ${active ? "bg-mb-blue text-mb-on-blue" : "text-mb-on-navy hover:bg-mb-navy-mid"}`}
              >
                <Icon size={18} aria-hidden />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="relative min-h-40 flex-1">
          <img
            src={asset("/memo/sidebar-airport.jpg")}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-mb-navy to-transparent" />
          <div className="absolute inset-x-3 bottom-3 rounded-mb border border-mb-on-navy/15 bg-mb-navy-deep/85 p-3 backdrop-blur">
            <label className="block text-xs font-semibold text-mb-blue-soft">
              Office
              <select
                className="mt-1 min-h-11 w-full rounded-mb border border-mb-navy-mid bg-mb-navy px-2 text-sm text-mb-on-navy"
                value={activeId}
                onChange={(event) => setOffice(event.target.value)}
              >
                {offices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.config.officeName}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 flex items-center gap-2 text-xs text-mb-on-navy">
              <span className={`h-2 w-2 rounded-full ${ready ? "bg-mb-success" : "bg-mb-warning"}`} />
              {ready ? "Ready" : "Loading"}
              <span className="text-mb-blue-soft">· {office?.config.region ?? "No region"}</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

function WingMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10 shrink-0" aria-hidden>
      <path d="M6 30c10-2 16-8 22-16 2 6 2 10-1 16-8 1-14 1-21 0z" fill="#7ec8ff" />
      <path d="M8 34c12-1 20-6 28-14 1 5 0 9-4 13-10 2-16 2-24 1z" fill="#d7ecff" />
    </svg>
  );
}

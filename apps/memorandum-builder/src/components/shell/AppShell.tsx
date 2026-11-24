import { useEffect, useState, type ReactNode } from "react";
import { usePath } from "@/nav";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { useMemoStore } from "@/modules/memo-store";

const TITLES: Array<[string, string]> = [
  ["/new", "New memorandum"],
  ["/templates", "Template manager"],
  ["/batch", "Batch generation"],
  ["/branding", "Branding and configuration"],
  ["/archive", "Archive"],
  ["/settings", "Settings"],
  ["/", "Dashboard"],
];

export function AppShell({ children }: { children: ReactNode }) {
  const hydrate = useMemoStore((state) => state.hydrate);
  const ready = useMemoStore((state) => state.ready);
  const [open, setOpen] = useState(false);
  const pathname = usePath();
  const title = pathname === "/" ? "" : TITLES.find(([path]) => pathname.startsWith(path))?.[1] ?? "Memorandum Builder";

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="min-h-screen bg-mb-page text-mb-ink md:flex md:items-start">
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} onMenu={() => setOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {ready ? children : <p className="text-sm text-mb-muted">Loading office records…</p>}
        </main>
      </div>
    </div>
  );
}

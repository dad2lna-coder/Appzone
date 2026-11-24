import { Menu } from "lucide-react";
import { useMemoStore } from "@/modules/memo-store";

export function TopBar({ title, onMenu }: { title: string; onMenu: () => void }) {
  const notice = useMemoStore((state) => state.notice);
  const dismiss = useMemoStore((state) => state.dismissNotice);
  const tones = {
    info: "bg-mb-blue-soft text-mb-navy",
    success: "bg-mb-success-soft text-mb-success",
    warning: "bg-mb-warning-soft text-mb-warning",
    danger: "bg-mb-danger-soft text-mb-danger",
  };
  if (!title && !notice) {
    return (
      <div className="sticky top-0 z-20 flex min-h-14 items-center px-4 md:hidden">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-mb bg-mb-surface text-mb-navy shadow-mb"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
      </div>
    );
  }
  return (
    <header className="sticky top-0 z-20 border-b border-mb-line bg-mb-surface/95 backdrop-blur">
      <div className="flex min-h-14 items-center gap-3 px-4 md:px-8">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-mb text-mb-navy md:hidden"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        {title ? <h1 className="text-base font-semibold text-mb-ink">{title}</h1> : null}
      </div>
      {notice ? (
        <div className={`flex items-start justify-between gap-3 px-4 py-2 text-sm md:px-8 ${tones[notice.tone]}`}>
          <p>{notice.text}</p>
          <button type="button" className="min-h-11 font-semibold" onClick={dismiss}>
            Dismiss
          </button>
        </div>
      ) : null}
    </header>
  );
}

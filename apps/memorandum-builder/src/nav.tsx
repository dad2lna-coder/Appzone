import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

export function currentPath() {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw || raw === "/") return "/";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function go(path: string) {
  const next = path.startsWith("/") ? path : `/${path}`;
  if (`#${next}` !== window.location.hash) window.location.hash = next;
}

export function usePath() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onHash = () => setPath(currentPath());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return path;
}

export function Link({
  to,
  params,
  className,
  children,
  onClick,
}: {
  to: string;
  params?: { templateId?: string };
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const href = to.includes("$templateId") ? to.replace("$templateId", params?.templateId ?? "") : to;
  return (
    <a
      href={`#${href}`}
      className={className}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        onClick?.();
      }}
    >
      {children}
    </a>
  );
}

export function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

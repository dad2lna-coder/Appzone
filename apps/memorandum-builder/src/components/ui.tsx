import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonClass: Record<ButtonVariant, string> = {
  primary: "bg-mb-blue text-mb-on-blue hover:bg-mb-navy-mid",
  secondary: "border border-mb-line bg-mb-surface text-mb-ink hover:bg-mb-blue-soft",
  ghost: "text-mb-navy hover:bg-mb-blue-soft",
  danger: "bg-mb-danger text-mb-on-blue hover:opacity-90",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-mb px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-mb border border-mb-line bg-mb-surface p-4 shadow-mb ${className}`}>
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-mb-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-mb-muted">{hint}</span> : null}
    </label>
  );
}

const control = "w-full min-h-11 rounded-mb border border-mb-line bg-mb-surface px-3 text-sm text-mb-ink";

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} ${className}`} {...props} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${control} min-h-28 py-2 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${control} ${className}`} {...props} />;
}

export function Badge({
  tone,
  children,
}: {
  tone: "neutral" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-mb-page text-mb-muted",
    success: "bg-mb-success-soft text-mb-success",
    warning: "bg-mb-warning-soft text-mb-warning",
    danger: "bg-mb-danger-soft text-mb-danger",
    info: "bg-mb-blue-soft text-mb-blue",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function statusTone(status: string): "success" | "warning" | "neutral" | "danger" | "info" {
  if (status === "published" || status === "generated") return "success";
  if (status === "draft") return "warning";
  if (status === "archived") return "neutral";
  return "info";
}

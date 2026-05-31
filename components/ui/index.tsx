import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  maxWidthClassName?: string;
};

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

type PanelProps = {
  children: ReactNode;
  className?: string;
};

type PanelHeaderProps = {
  title: string;
  description?: string;
  aside?: ReactNode;
  className?: string;
};

type AlertProps = {
  children: ReactNode;
  tone: "success" | "danger" | "info";
};

const alertToneClassName: Record<AlertProps["tone"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

export function PageShell({
  children,
  className,
  maxWidthClassName = "max-w-7xl",
}: PageShellProps) {
  return (
    <main className={cn("pos-page", className)}>
      <section className={cn("pos-container", maxWidthClassName)}>
        {children}
      </section>
    </main>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: PageHeroProps) {
  return (
    <div className={cn("pos-hero", className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="pos-eyebrow">{eyebrow}</p>
          <h1 className="pos-title">{title}</h1>
          <p className="pos-description">{description}</p>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {meta ? <div className="mt-5">{meta}</div> : null}
    </div>
  );
}

export function Panel({ children, className }: PanelProps) {
  return <div className={cn("pos-panel", className)}>{children}</div>;
}

export function PanelHeader({
  title,
  description,
  aside,
  className,
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "pos-panel-header flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="pos-section-title">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-[#6d645a]">
            {description}
          </p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

export function CountPill({ children }: { children: ReactNode }) {
  return (
    <span className="pos-badge bg-[#f8f3ea] text-[#6d645a]">{children}</span>
  );
}

export function Alert({ children, tone }: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-bold shadow-sm",
        alertToneClassName[tone],
      )}
    >
      {children}
    </div>
  );
}

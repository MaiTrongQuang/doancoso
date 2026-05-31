import Link from "next/link";
import { PageHero, PageShell } from "@/components/ui";

type PlaceholderPageProps = {
  badge: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  items?: string[];
};

export function PlaceholderPage({
  badge,
  title,
  description,
  primaryHref = "/",
  primaryLabel = "Về trang chính",
  items = [],
}: PlaceholderPageProps) {
  return (
    <PageShell maxWidthClassName="max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full border border-[#d8cdbc] bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-[#6d645a]">
            {badge}
          </span>
          <Link
            href={primaryHref}
            className="pos-button-secondary"
          >
            {primaryLabel}
          </Link>
        </div>

        <PageHero eyebrow={badge} title={title} description={description} />

        {items.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[#eadfce] bg-white p-4 text-sm font-bold text-[#3b352d] shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        ) : null}
    </PageShell>
  );
}

import Link from "next/link";

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
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-[#24231f] sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-md border border-[#d6d1c7] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#6b6254]">
            {badge}
          </span>
          <Link
            href={primaryHref}
            className="rounded-md border border-[#2f5d50] px-3 py-2 text-sm font-semibold text-[#2f5d50] transition hover:bg-[#2f5d50] hover:text-white"
          >
            {primaryLabel}
          </Link>
        </div>

        <div className="rounded-lg border border-[#ded8cc] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#1f2933] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625b50] sm:text-base">
            {description}
          </p>
        </div>

        {items.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-[#ded8cc] bg-white p-4 text-sm font-medium text-[#3b352d] shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

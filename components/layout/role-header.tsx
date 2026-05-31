import { LogoutButton } from "./logout-button";

type RoleHeaderProps = {
  badge: string;
  title: string;
  description: string;
  userName?: string;
};

export function RoleHeader({
  badge,
  title,
  description,
  userName,
}: RoleHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#d8cdbc] bg-[#fffdf9]/92 shadow-[0_10px_30px_rgba(31,36,40,0.05)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#172027] text-sm font-black text-[#ffb24a] shadow-sm">
            {badge.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#2f5d50]">
              {badge}
            </p>
            <h1 className="truncate text-lg font-black text-[#172027]">
              {title}
            </h1>
            <p className="hidden max-w-2xl text-sm leading-6 text-[#6d645a] sm:block">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:items-center">
          {userName ? (
            <span className="inline-flex min-h-10 items-center rounded-full border border-[#eadfce] bg-white px-3 text-sm font-bold text-[#3b352d]">
              {userName}
            </span>
          ) : null}
          <LogoutButton className="pos-button-secondary min-h-10 rounded-full disabled:cursor-not-allowed disabled:opacity-60" />
        </div>
      </div>
    </header>
  );
}

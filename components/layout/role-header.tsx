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
    <header className="border-b border-[#ded8cc] bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2f5d50]">
            {badge}
          </p>
          <h1 className="mt-1 text-xl font-bold text-[#1f2933]">{title}</h1>
          <p className="mt-1 text-sm leading-6 text-[#625b50]">
            {description}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {userName ? (
            <span className="rounded-md bg-[#f7f7f2] px-3 py-2 text-sm font-semibold text-[#3b352d]">
              {userName}
            </span>
          ) : null}
          <LogoutButton className="rounded-md border border-[#d6d1c7] px-4 py-2 text-sm font-semibold text-[#3b352d] transition hover:bg-[#f7f7f2] disabled:cursor-not-allowed disabled:opacity-60" />
        </div>
      </div>
    </header>
  );
}

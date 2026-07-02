import type { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-[22px]">
      <div>
        <h1 className="m-0 text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <div className="text-[13px] text-text-secondary">{subtitle}</div>
        )}
      </div>
      {action}
    </header>
  );
}

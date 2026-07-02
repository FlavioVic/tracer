interface StatTileProps {
  label: string;
  value: string;
  delta?: string;
}

export function StatTile({ label, value, delta }: StatTileProps) {
  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-xl border border-border bg-surface px-[18px] py-4">
      <span className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
        {label}
      </span>
      <span className="text-[26px] font-bold tracking-tight">{value}</span>
      {delta && (
        <span className="text-xs font-semibold text-success">{delta}</span>
      )}
    </div>
  );
}

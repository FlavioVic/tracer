interface BreakdownCardProps {
  title: string;
  items: { valor: string; total: number }[];
}

export function BreakdownCard({ title, items }: BreakdownCardProps) {
  const max = Math.max(...items.map((i) => i.total), 1);
  const top = items.slice(0, 6);

  return (
    <div className="flex-1 rounded-xl border border-border bg-surface px-5 py-4">
      <div className="mb-3 text-[13.5px] font-semibold">{title}</div>
      {top.length === 0 ? (
        <div className="text-xs text-text-secondary">Sem dados ainda.</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {top.map((item) => (
            <div key={item.valor} className="flex items-center gap-3">
              <span className="w-20 shrink-0 truncate text-xs text-text-secondary">
                {item.valor}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(item.total / max) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums">
                {item.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useMemo, useRef, useState } from "react";

interface ClicksChartProps {
  data: { data: string; total: number }[];
}

const W = 600;
const H = 240;
const PAD_L = 34;
const PAD_R = 6;
const PAD_T = 10;
const PAD_B = 24;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function formatDay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function niceMax(max: number) {
  if (max <= 0) return 4;
  const step = Math.ceil(max / 4);
  return step * 4;
}

export function ClicksChart({ data }: ClicksChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const values = data.map((d) => d.total);
  const total = values.reduce((a, b) => a + b, 0);
  const yMax = niceMax(Math.max(...values, 0));
  const yTicks = [0, yMax / 2, yMax];
  const n = data.length;

  const xPos = (i: number) => (n <= 1 ? PAD_L + PLOT_W / 2 : PAD_L + (PLOT_W / (n - 1)) * i);
  const yPos = (v: number) => PAD_T + PLOT_H - (v / yMax) * PLOT_H;

  const { areaD, lineD } = useMemo(() => {
    if (n === 0) return { areaD: "", lineD: "" };
    let area = `M ${xPos(0)} ${yPos(0)} `;
    let line = "";
    values.forEach((v, i) => {
      area += `L ${xPos(i)} ${yPos(v)} `;
      line += (i === 0 ? "M" : "L") + ` ${xPos(i)} ${yPos(v)} `;
    });
    area += `L ${xPos(n - 1)} ${yPos(0)} Z`;
    return { areaD: area, lineD: line };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, yMax]);

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const bbox = svg.getBoundingClientRect();
    const scale = W / bbox.width;
    const localX = (e.clientX - bbox.left) * scale;
    const step = n <= 1 ? PLOT_W : PLOT_W / (n - 1);
    const i = Math.round((localX - PAD_L) / step);
    setHoverIndex(Math.max(0, Math.min(n - 1, i)));
  }

  const lastI = n - 1;

  return (
    <div className="rounded-xl border border-border bg-surface px-[22px] pt-5 pb-4">
      <div className="mb-1 flex items-start justify-between">
        <div>
          <div className="text-[15px] font-semibold">Cliques por dia</div>
          <div className="text-[12.5px] text-text-secondary">
            {n > 0 ? `${formatDay(data[0]!.data)} — ${formatDay(data[n - 1]!.data)}` : "Sem dados ainda"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-[22px] font-bold tracking-tight">
            {total.toLocaleString("pt-BR")}
          </span>
          {n > 0 && (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-text-secondary hover:bg-zinc-100 hover:text-text"
            >
              {showTable ? "Ver gráfico" : "Ver tabela"}
            </button>
          )}
        </div>
      </div>

      {n === 0 ? (
        <div className="flex h-[180px] items-center justify-center text-sm text-text-secondary">
          Ainda não há cliques registrados para este link.
        </div>
      ) : showTable ? (
        <table className="mt-3 w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="border-b border-border px-2 py-1.5 text-left text-[11px] font-semibold text-text-secondary uppercase">
                Dia
              </th>
              <th className="border-b border-border px-2 py-1.5 text-right text-[11px] font-semibold text-text-secondary uppercase">
                Cliques
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.data}>
                <td className="border-b border-border px-2 py-1.5">{formatDay(d.data)}</td>
                <td className="border-b border-border px-2 py-1.5 text-right tabular-nums">
                  {d.total.toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative mt-3">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full overflow-visible"
            role="img"
            aria-label="Cliques por dia"
          >
            {yTicks.map((v) => (
              <g key={v}>
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={yPos(v)}
                  y2={yPos(v)}
                  stroke={v === 0 ? "#D4D4D8" : "#E4E4E7"}
                  strokeWidth={1}
                />
                <text x={PAD_L - 8} y={yPos(v) + 3} textAnchor="end" fontSize={11} fill="#A1A1AA">
                  {Math.round(v)}
                </text>
              </g>
            ))}

            {data.map((d, i) => {
              if (n > 1 && i % Math.ceil(n / 7) !== 0 && i !== lastI) return null;
              return (
                <text
                  key={d.data}
                  x={xPos(i)}
                  y={H - 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#A1A1AA"
                >
                  {formatDay(d.data)}
                </text>
              );
            })}

            <path d={areaD} fill="rgba(42,120,214,0.10)" />
            <path
              d={lineD}
              fill="none"
              stroke="#2A78D6"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={xPos(lastI)} cy={yPos(values[lastI]!)} r={4} fill="#2A78D6" stroke="#fff" strokeWidth={2} />

            {hoverIndex !== null && (
              <>
                <line
                  x1={xPos(hoverIndex)}
                  x2={xPos(hoverIndex)}
                  y1={PAD_T}
                  y2={H - PAD_B}
                  stroke="#A1A1AA"
                  strokeWidth={1}
                />
                <circle
                  cx={xPos(hoverIndex)}
                  cy={yPos(values[hoverIndex]!)}
                  r={4}
                  fill="#2A78D6"
                  stroke="#fff"
                  strokeWidth={2}
                />
              </>
            )}

            <rect
              x={PAD_L}
              y={PAD_T}
              width={PLOT_W}
              height={PLOT_H}
              fill="transparent"
              style={{ cursor: "crosshair" }}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoverIndex(null)}
            />
          </svg>

          {hoverIndex !== null && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-text px-2.5 py-1.5 text-xs whitespace-nowrap text-white"
              style={{
                left: `${(xPos(hoverIndex) / W) * 100}%`,
                top: `${(yPos(values[hoverIndex]!) / H) * 100}%`,
                marginTop: "-10px",
              }}
            >
              <div className="text-[13px] font-bold">
                {values[hoverIndex]!.toLocaleString("pt-BR")} cliques
              </div>
              <div className="text-[11px] text-zinc-300">{formatDay(data[hoverIndex]!.data)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

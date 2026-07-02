import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { LinkAnalytics } from "../types/api";
import { StatTile } from "../components/StatTile";
import { ClicksChart } from "../components/ClicksChart";
import { BreakdownCard } from "../components/BreakdownCard";
import { ArrowLeftIcon } from "../components/icons";

export function LinkAnalyticsPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["links", id, "analytics"],
    queryFn: async () => (await api.get<LinkAnalytics>(`/api/links/${id}/analytics`)).data,
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-text-secondary">Carregando...</div>;
  }

  if (isError || !data) {
    return (
      <div className="p-8">
        <Link to="/" className="text-sm font-semibold text-accent">
          ← Voltar para meus links
        </Link>
        <div className="mt-4 text-sm text-text-secondary">
          Não foi possível carregar o analytics deste link.
        </div>
      </div>
    );
  }

  const dispositivoAtivo = data.porDispositivo.filter((d) => d.total > 0);
  const referrerAtivo = data.porReferrer.filter((d) => d.total > 0);
  const paisAtivo = data.porPais.filter((d) => d.total > 0);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border bg-surface px-8 py-[22px]">
        <Link
          to="/"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-zinc-100 hover:text-text"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="m-0 font-mono text-xl font-bold tracking-tight">/{data.slug}</h1>
          <div className="text-[13px] text-text-secondary">Analytics do link</div>
        </div>
      </header>

      <div className="flex flex-col gap-5 p-8">
        <div className="flex gap-4">
          <StatTile label="Total de cliques" value={data.totalCliques.toLocaleString("pt-BR")} />
        </div>

        <ClicksChart data={data.porDia} />

        <div className="flex gap-4">
          <BreakdownCard title="Dispositivo" items={dispositivoAtivo} />
          <BreakdownCard title="Referrer" items={referrerAtivo} />
          <BreakdownCard title="País" items={paisAtivo} />
        </div>
      </div>
    </>
  );
}

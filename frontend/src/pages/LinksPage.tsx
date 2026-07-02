import { useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "../lib/api";
import type { Link } from "../types/api";
import { Header } from "../components/Header";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { StatTile } from "../components/StatTile";
import { PlusIcon } from "../components/icons";

const apiUrl = import.meta.env.VITE_API_URL as string;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function LinksPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: links, isLoading } = useQuery({
    queryKey: ["links"],
    queryFn: async () => (await api.get<Link[]>("/api/links")).data,
  });

  const createLink = useMutation({
    mutationFn: (urlOriginal: string) =>
      api.post<Link>("/api/links", { urlOriginal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["links"] });
      setUrl("");
      setShowForm(false);
      setFormError(null);
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 400) {
        setFormError("URL inválida");
      } else {
        setFormError("Não foi possível criar o link. Tente novamente.");
      }
    },
  });

  const deactivateLink = useMutation({
    mutationFn: (id: string) => api.patch(`/api/links/${id}/desativar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["links"] });
    },
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!url) return;
    createLink.mutate(url);
  }

  const totalCliques = links?.reduce((sum, l) => sum + l.totalCliques, 0) ?? 0;
  const linksAtivos = links?.filter((l) => l.ativo).length ?? 0;

  return (
    <>
      <Header
        title="Meus links"
        subtitle={links ? `${links.length} links · ${totalCliques.toLocaleString("pt-BR")} cliques no total` : undefined}
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            <PlusIcon className="h-3.5 w-3.5" />
            Criar link
          </Button>
        }
      />

      <div className="flex flex-col gap-5 p-8">
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="flex items-end gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex-1">
              <Input
                id="url"
                label="URL de destino"
                placeholder="https://exemplo.com/pagina"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                error={formError ?? undefined}
                required
              />
            </div>
            <Button type="submit" disabled={createLink.isPending}>
              {createLink.isPending ? "Criando..." : "Salvar"}
            </Button>
          </form>
        )}

        <div className="flex gap-4">
          <StatTile label="Total de cliques" value={totalCliques.toLocaleString("pt-BR")} />
          <StatTile label="Links ativos" value={String(linksAtivos)} />
          <StatTile label="Total de links" value={String(links?.length ?? 0)} />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-text-secondary">
              Carregando...
            </div>
          ) : !links || links.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-secondary">
              Você ainda não criou nenhum link.
            </div>
          ) : (
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className="border-b border-border px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                    Link
                  </th>
                  <th className="border-b border-border px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                    Status
                  </th>
                  <th className="border-b border-border px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                    Cliques
                  </th>
                  <th className="border-b border-border px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                    Criado em
                  </th>
                  <th className="border-b border-border px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="last:[&>td]:border-b-0">
                    <td className="border-b border-border px-4 py-3">
                      <a
                        href={`${apiUrl}/${link.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block font-mono font-semibold text-accent"
                      >
                        /{link.slug}
                      </a>
                      <span className="block max-w-[280px] truncate text-xs text-text-secondary">
                        {link.urlOriginal}
                      </span>
                    </td>
                    <td className="border-b border-border px-4 py-3">
                      {link.ativo ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="border-b border-border px-4 py-3 text-right font-semibold tabular-nums">
                      {link.totalCliques.toLocaleString("pt-BR")}
                    </td>
                    <td className="border-b border-border px-4 py-3 text-text-secondary tabular-nums">
                      {formatDate(link.createdAt)}
                    </td>
                    <td className="border-b border-border px-4 py-3 text-right whitespace-nowrap">
                      <RouterLink
                        to={`/links/${link.id}`}
                        className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-zinc-100 hover:text-text"
                      >
                        Analytics
                      </RouterLink>
                      {link.ativo && (
                        <button
                          type="button"
                          onClick={() => deactivateLink.mutate(link.id)}
                          disabled={deactivateLink.isPending}
                          className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-zinc-100 hover:text-text"
                        >
                          Desativar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

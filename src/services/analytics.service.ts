import { NotFoundError } from "../errors/app-error";
import { clickRepository } from "../repositories/click.repository";
import { linkRepository } from "../repositories/link.repository";

function aggregate(values: (string | null)[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const chave = value ?? "desconhecido";
    counts.set(chave, (counts.get(chave) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([valor, total]) => ({ valor, total }))
    .sort((a, b) => b.total - a.total);
}

function aggregateByDay(timestamps: Date[]) {
  const counts = new Map<string, number>();
  for (const timestamp of timestamps) {
    const dia = timestamp.toISOString().slice(0, 10);
    counts.set(dia, (counts.get(dia) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([data, total]) => ({ data, total }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

export const analyticsService = {
  async getLinkAnalytics(userId: string, linkId: string) {
    const link = await linkRepository.findByIdForUser(linkId, userId);
    if (!link) {
      throw new NotFoundError("Link não encontrado");
    }

    const clicks = await clickRepository.findAllByLinkId(linkId);

    return {
      linkId: link.id,
      slug: link.slug,
      totalCliques: clicks.length,
      porDia: aggregateByDay(clicks.map((click) => click.timestamp)),
      porDispositivo: aggregate(clicks.map((click) => click.dispositivo)),
      porReferrer: aggregate(clicks.map((click) => click.referrer)),
      porPais: aggregate(clicks.map((click) => click.pais)),
    };
  },
};

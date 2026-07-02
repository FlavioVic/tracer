import { AppError, NotFoundError } from "../errors/app-error";
import { linkRepository } from "../repositories/link.repository";
import type { CreateLinkDto } from "../schemas/link.schema";
import { generateSlug } from "../utils/slug";

const MAX_SLUG_ATTEMPTS = 5;

function toPublicLink(link: {
  id: string;
  slug: string;
  urlOriginal: string;
  ativo: boolean;
  expiraEm: Date | null;
  createdAt: Date;
}) {
  return {
    id: link.id,
    slug: link.slug,
    urlOriginal: link.urlOriginal,
    ativo: link.ativo,
    expiraEm: link.expiraEm,
    createdAt: link.createdAt,
  };
}

async function generateUniqueSlug(): Promise<string> {
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = generateSlug();
    const existing = await linkRepository.findBySlug(slug);
    if (!existing) {
      return slug;
    }
  }
  throw new AppError("Não foi possível gerar um slug único, tente novamente", 500);
}

export const linkService = {
  async create(userId: string, dto: CreateLinkDto) {
    const slug = await generateUniqueSlug();
    const link = await linkRepository.create({
      userId,
      slug,
      urlOriginal: dto.urlOriginal,
      expiraEm: dto.expiraEm,
    });
    return toPublicLink(link);
  },

  async listByUser(userId: string) {
    const links = await linkRepository.findManyByUserId(userId);
    return links.map((link) => ({
      ...toPublicLink(link),
      totalCliques: link._count.clicks,
    }));
  },

  async deactivate(userId: string, linkId: string) {
    const link = await linkRepository.findByIdForUser(linkId, userId);
    if (!link) {
      throw new NotFoundError("Link não encontrado");
    }
    const updated = await linkRepository.deactivate(link.id);
    return toPublicLink(updated);
  },

  async findRedirectTarget(slug: string) {
    const link = await linkRepository.findBySlug(slug);
    const expirado = link?.expiraEm ? link.expiraEm.getTime() < Date.now() : false;

    if (!link || !link.ativo || expirado) {
      throw new NotFoundError("Link não encontrado ou indisponível");
    }

    return link;
  },
};

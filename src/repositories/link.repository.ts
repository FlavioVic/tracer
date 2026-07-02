import type { Link } from "../generated/prisma/client";
import { prisma } from "../utils/prisma";

export const linkRepository = {
  create(data: {
    userId: string;
    slug: string;
    urlOriginal: string;
    expiraEm?: Date;
  }): Promise<Link> {
    return prisma.link.create({ data });
  },

  findBySlug(slug: string): Promise<Link | null> {
    return prisma.link.findUnique({ where: { slug } });
  },

  findManyByUserId(
    userId: string,
  ): Promise<(Link & { _count: { clicks: number } })[]> {
    return prisma.link.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { clicks: true } } },
    });
  },

  findByIdForUser(id: string, userId: string): Promise<Link | null> {
    return prisma.link.findFirst({ where: { id, userId } });
  },

  deactivate(id: string): Promise<Link> {
    return prisma.link.update({ where: { id }, data: { ativo: false } });
  },
};

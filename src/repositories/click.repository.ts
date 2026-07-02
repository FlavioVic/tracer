import type { Click } from "../generated/prisma/client";
import { prisma } from "../utils/prisma";

export const clickRepository = {
  create(data: {
    linkId: string;
    ipHash?: string;
    pais?: string;
    referrer?: string;
    userAgent?: string;
    dispositivo?: string;
  }): Promise<Click> {
    return prisma.click.create({ data });
  },

  findAllByLinkId(
    linkId: string,
  ): Promise<Pick<Click, "timestamp" | "dispositivo" | "referrer" | "pais">[]> {
    return prisma.click.findMany({
      where: { linkId },
      select: {
        timestamp: true,
        dispositivo: true,
        referrer: true,
        pais: true,
      },
    });
  },
};

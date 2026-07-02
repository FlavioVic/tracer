import type { User } from "../generated/prisma/client";
import { prisma } from "../utils/prisma";

export const userRepository = {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  create(data: {
    nome: string;
    email: string;
    senhaHash: string;
  }): Promise<User> {
    return prisma.user.create({ data });
  },
};

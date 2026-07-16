import type { User } from "../generated/prisma/client";
import { prisma } from "../utils/prisma";

export const userRepository = {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data: {
    nome: string;
    email: string;
    senhaHash: string;
  }): Promise<User> {
    return prisma.user.create({ data });
  },

  updateNome(id: string, nome: string): Promise<User> {
    return prisma.user.update({ where: { id }, data: { nome } });
  },

  updateSenhaHash(id: string, senhaHash: string): Promise<User> {
    return prisma.user.update({ where: { id }, data: { senhaHash } });
  },
};

import type { Express } from "express";
import request from "supertest";
import { prisma } from "../../src/utils/prisma";

export async function resetDatabase() {
  await prisma.click.deleteMany();
  await prisma.link.deleteMany();
  await prisma.user.deleteMany();
}

export async function createAuthenticatedUser(
  app: Express,
  email = "user@example.com",
) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ nome: "Usuário Teste", email, senha: "senha1234" });

  return {
    token: res.body.accessToken as string,
    userId: res.body.user.id as string,
  };
}

import type { Express } from "express";
import request from "supertest";
import { prisma } from "../../src/utils/prisma";

export async function resetDatabase() {
  await prisma.click.deleteMany();
  await prisma.link.deleteMany();
  await prisma.refreshToken.deleteMany();
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

// Usa request.agent(app), que mantém o cookie jar entre chamadas — necessário
// pros testes de refresh/logout, que dependem do cookie httpOnly setado no
// registro/login (createAuthenticatedUser não captura Set-Cookie).
export async function createAuthenticatedAgent(
  app: Express,
  email = "agent@example.com",
) {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/auth/register")
    .send({ nome: "Usuário Teste", email, senha: "senha1234" });

  return {
    agent,
    token: res.body.accessToken as string,
    userId: res.body.user.id as string,
  };
}

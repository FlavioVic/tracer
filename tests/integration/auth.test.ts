import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app";
import { createAuthenticatedAgent, resetDatabase } from "./helpers";

describe("Auth", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("registra um novo usuário e retorna accessToken", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ nome: "Flavio", email: "flavio@example.com", senha: "senha1234" });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      nome: "Flavio",
      email: "flavio@example.com",
    });
    expect(res.body.user.senhaHash).toBeUndefined();
    expect(typeof res.body.accessToken).toBe("string");
    expect(res.body.refreshToken).toBeUndefined();

    const setCookie = res.headers["set-cookie"] as unknown as string[];
    const refreshCookie = setCookie.find((c) => c.startsWith("refreshToken="));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/HttpOnly/);
  });

  it("rejeita registro com e-mail duplicado", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ nome: "Flavio", email: "dup@example.com", senha: "senha1234" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ nome: "Outro", email: "dup@example.com", senha: "outrasenha" });

    expect(res.status).toBe(409);
  });

  it("rejeita registro com dados inválidos", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ nome: "a", email: "invalido", senha: "123" });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toBeDefined();
  });

  it("faz login com credenciais corretas", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ nome: "Flavio", email: "login@example.com", senha: "senha1234" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", senha: "senha1234" });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe("string");
  });

  it("rejeita login com senha errada", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ nome: "Flavio", email: "wrongpass@example.com", senha: "senha1234" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "wrongpass@example.com", senha: "errada123" });

    expect(res.status).toBe(401);
  });

  it("rejeita login de e-mail que não existe", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "naoexiste@example.com", senha: "senha1234" });

    expect(res.status).toBe(401);
  });

  describe("refresh", () => {
    it("rejeita quando não há cookie de refresh token", async () => {
      const res = await request(app).post("/api/auth/refresh");

      expect(res.status).toBe(401);
    });

    it("emite um novo accessToken e rotaciona o cookie quando o refresh token é válido", async () => {
      const { agent } = await createAuthenticatedAgent(app, "refresh@example.com");

      const res = await agent.post("/api/auth/refresh");

      expect(res.status).toBe(200);
      expect(typeof res.body.accessToken).toBe("string");

      const setCookie = res.headers["set-cookie"] as unknown as string[];
      const refreshCookie = setCookie.find((c) => c.startsWith("refreshToken="));
      expect(refreshCookie).toBeDefined();
    });

    it("rejeita um refresh token já usado (rotacionado)", async () => {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send({ nome: "Reuso", email: "reuse@example.com", senha: "senha1234" });
      const originalCookie = (registerRes.headers["set-cookie"] as unknown as string[]).find(
        (c) => c.startsWith("refreshToken="),
      ) as string;

      // Primeiro uso: sucesso, o token original é revogado e trocado por um novo.
      await request(app).post("/api/auth/refresh").set("Cookie", originalCookie);

      // Reapresentar o mesmo token original (já revogado) deve ser rejeitado.
      const reusedRes = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", originalCookie);

      expect(reusedRes.status).toBe(401);
    });
  });

  describe("logout", () => {
    it("limpa o cookie e revoga o refresh token", async () => {
      const { agent } = await createAuthenticatedAgent(app, "logout@example.com");

      const logoutRes = await agent.post("/api/auth/logout");
      expect(logoutRes.status).toBe(204);

      const refreshRes = await agent.post("/api/auth/refresh");
      expect(refreshRes.status).toBe(401);
    });

    it("não quebra quando não há cookie nenhum", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(204);
    });
  });
});

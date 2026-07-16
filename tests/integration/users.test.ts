import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app";
import { createAuthenticatedUser, resetDatabase } from "./helpers";

describe("Users", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  describe("GET /api/users/me", () => {
    it("bloqueia sem token", async () => {
      const res = await request(app).get("/api/users/me");

      expect(res.status).toBe(401);
    });

    it("retorna o perfil do usuário autenticado", async () => {
      const { token, userId } = await createAuthenticatedUser(app);

      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: userId,
        nome: "Usuário Teste",
        email: "user@example.com",
      });
      expect(res.body.senhaHash).toBeUndefined();
    });
  });

  describe("PATCH /api/users/me", () => {
    it("atualiza o nome", async () => {
      const { token } = await createAuthenticatedUser(app);

      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ nome: "Novo Nome" });

      expect(res.status).toBe(200);
      expect(res.body.nome).toBe("Novo Nome");
    });

    it("rejeita nome muito curto", async () => {
      const { token } = await createAuthenticatedUser(app);

      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ nome: "A" });

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/users/me/senha", () => {
    it("troca a senha com sucesso e permite login com a nova senha", async () => {
      const { token } = await createAuthenticatedUser(app);

      const res = await request(app)
        .patch("/api/users/me/senha")
        .set("Authorization", `Bearer ${token}`)
        .send({ senhaAtual: "senha1234", novaSenha: "senhaNova123" });

      expect(res.status).toBe(204);

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "user@example.com", senha: "senhaNova123" });

      expect(loginRes.status).toBe(200);
    });

    it("rejeita senha atual incorreta", async () => {
      const { token } = await createAuthenticatedUser(app);

      const res = await request(app)
        .patch("/api/users/me/senha")
        .set("Authorization", `Bearer ${token}`)
        .send({ senhaAtual: "senhaErrada", novaSenha: "senhaNova123" });

      expect(res.status).toBe(401);
    });

    it("rejeita nova senha muito curta", async () => {
      const { token } = await createAuthenticatedUser(app);

      const res = await request(app)
        .patch("/api/users/me/senha")
        .set("Authorization", `Bearer ${token}`)
        .send({ senhaAtual: "senha1234", novaSenha: "curta" });

      expect(res.status).toBe(400);
    });
  });
});

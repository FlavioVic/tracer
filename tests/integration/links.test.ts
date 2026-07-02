import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app";
import { createAuthenticatedUser, resetDatabase } from "./helpers";

describe("Links", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("bloqueia criação de link sem token", async () => {
    const res = await request(app)
      .post("/api/links")
      .send({ urlOriginal: "https://example.com" });

    expect(res.status).toBe(401);
  });

  it("cria um link com slug único", async () => {
    const { token } = await createAuthenticatedUser(app);

    const res = await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ urlOriginal: "https://example.com/pagina" });

    expect(res.status).toBe(201);
    expect(res.body.slug).toMatch(/^[A-Za-z0-9_-]{7}$/);
    expect(res.body.ativo).toBe(true);
    expect(res.body.urlOriginal).toBe("https://example.com/pagina");
  });

  it("rejeita URL inválida", async () => {
    const { token } = await createAuthenticatedUser(app);

    const res = await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ urlOriginal: "nao-e-url" });

    expect(res.status).toBe(400);
  });

  it("lista só os links do usuário autenticado, com totalCliques", async () => {
    const userA = await createAuthenticatedUser(app, "a@example.com");
    const userB = await createAuthenticatedUser(app, "b@example.com");

    await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ urlOriginal: "https://a.com" });
    await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ urlOriginal: "https://b.com" });

    const res = await request(app)
      .get("/api/links")
      .set("Authorization", `Bearer ${userA.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      urlOriginal: "https://a.com",
      totalCliques: 0,
    });
  });

  it("desativa um link do próprio usuário", async () => {
    const { token } = await createAuthenticatedUser(app);
    const createRes = await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ urlOriginal: "https://example.com" });

    const res = await request(app)
      .patch(`/api/links/${createRes.body.id}/desativar`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ativo).toBe(false);
  });

  it("retorna 404 ao tentar desativar link inexistente", async () => {
    const { token } = await createAuthenticatedUser(app);

    const res = await request(app)
      .patch("/api/links/nao-existe/desativar")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("retorna 404 ao tentar desativar link de outro usuário", async () => {
    const userA = await createAuthenticatedUser(app, "a2@example.com");
    const userB = await createAuthenticatedUser(app, "b2@example.com");

    const createRes = await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ urlOriginal: "https://example.com" });

    const res = await request(app)
      .patch(`/api/links/${createRes.body.id}/desativar`)
      .set("Authorization", `Bearer ${userB.token}`);

    expect(res.status).toBe(404);
  });
});

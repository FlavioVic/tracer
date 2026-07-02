import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app";
import { prisma } from "../../src/utils/prisma";
import { createAuthenticatedUser, resetDatabase } from "./helpers";

// O registro do clique é assíncrono e não bloqueia o redirect (ver decisão
// #17 do DECISIONS.md) — os testes que verificam o Click esperam um pouco
// antes de consultar o banco.
function waitForClickRegistration() {
  return new Promise((resolve) => setTimeout(resolve, 150));
}

describe("Redirecionamento público", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("redireciona para a URL original e registra um clique", async () => {
    const { token } = await createAuthenticatedUser(app);
    const createRes = await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ urlOriginal: "https://example.com/destino" });

    const res = await request(app)
      .get(`/${createRes.body.slug}`)
      .set("User-Agent", "Mozilla/5.0 (Linux; Android 10)")
      .set("Referer", "https://google.com");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://example.com/destino");

    await waitForClickRegistration();

    const clicks = await prisma.click.findMany({
      where: { linkId: createRes.body.id },
    });

    expect(clicks).toHaveLength(1);
    expect(clicks[0].dispositivo).toBe("mobile");
    expect(clicks[0].referrer).toBe("https://google.com");
    expect(clicks[0].ipHash).toBeTruthy();
  });

  it("retorna 404 para slug inexistente", async () => {
    const res = await request(app).get("/slug-que-nao-existe");
    expect(res.status).toBe(404);
  });

  it("retorna 404 para link desativado", async () => {
    const { token } = await createAuthenticatedUser(app);
    const createRes = await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ urlOriginal: "https://example.com" });

    await request(app)
      .patch(`/api/links/${createRes.body.id}/desativar`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app).get(`/${createRes.body.slug}`);
    expect(res.status).toBe(404);
  });

  it("retorna 404 para link expirado", async () => {
    const { token } = await createAuthenticatedUser(app);
    const createRes = await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${token}`)
      .send({
        urlOriginal: "https://example.com",
        expiraEm: new Date(Date.now() - 60_000).toISOString(),
      });

    const res = await request(app).get(`/${createRes.body.slug}`);
    expect(res.status).toBe(404);
  });

  it("não intercepta /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

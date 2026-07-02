import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app";
import { createAuthenticatedUser, resetDatabase } from "./helpers";

function waitForClickRegistration() {
  return new Promise((resolve) => setTimeout(resolve, 200));
}

describe("Analytics de link", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("agrega cliques por dispositivo e referrer", async () => {
    const { token } = await createAuthenticatedUser(app);
    const createRes = await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ urlOriginal: "https://example.com" });
    const slug = createRes.body.slug;

    await request(app)
      .get(`/${slug}`)
      .set("User-Agent", "Mozilla/5.0 (Linux; Android 10)")
      .set("Referer", "https://google.com");
    await request(app)
      .get(`/${slug}`)
      .set("User-Agent", "Mozilla/5.0 (Linux; Android 10)")
      .set("Referer", "https://google.com");
    await request(app)
      .get(`/${slug}`)
      .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

    await waitForClickRegistration();

    const res = await request(app)
      .get(`/api/links/${createRes.body.id}/analytics`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalCliques).toBe(3);
    expect(res.body.porDispositivo).toEqual(
      expect.arrayContaining([
        { valor: "mobile", total: 2 },
        { valor: "desktop", total: 1 },
      ]),
    );
    expect(res.body.porReferrer).toEqual(
      expect.arrayContaining([
        { valor: "https://google.com", total: 2 },
        { valor: "desconhecido", total: 1 },
      ]),
    );
  });

  it("retorna totalCliques zero e listas vazias para link sem cliques", async () => {
    const { token } = await createAuthenticatedUser(app);
    const createRes = await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ urlOriginal: "https://example.com" });

    const res = await request(app)
      .get(`/api/links/${createRes.body.id}/analytics`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalCliques).toBe(0);
    expect(res.body.porDia).toEqual([]);
  });

  it("retorna 404 para link de outro usuário", async () => {
    const userA = await createAuthenticatedUser(app, "a3@example.com");
    const userB = await createAuthenticatedUser(app, "b3@example.com");
    const createRes = await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ urlOriginal: "https://example.com" });

    const res = await request(app)
      .get(`/api/links/${createRes.body.id}/analytics`)
      .set("Authorization", `Bearer ${userB.token}`);

    expect(res.status).toBe(404);
  });
});

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app";
import { resetDatabase } from "./helpers";

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
});

import { describe, expect, it } from "vitest";
import { generateSlug } from "./slug";

describe("generateSlug", () => {
  it("gera um slug de 7 caracteres por padrão", () => {
    expect(generateSlug()).toHaveLength(7);
  });

  it("respeita o tamanho customizado", () => {
    expect(generateSlug(10)).toHaveLength(10);
  });

  it("usa apenas caracteres URL-safe (base64url)", () => {
    expect(generateSlug()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("gera valores diferentes entre chamadas", () => {
    const slugs = new Set(Array.from({ length: 50 }, () => generateSlug()));
    expect(slugs.size).toBe(50);
  });
});

import { describe, expect, it } from "vitest";
import { detectDevice } from "./device";

describe("detectDevice", () => {
  it("identifica mobile a partir de Android", () => {
    expect(detectDevice("Mozilla/5.0 (Linux; Android 10)")).toBe("mobile");
  });

  it("identifica mobile a partir de iPhone", () => {
    expect(detectDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)")).toBe(
      "mobile",
    );
  });

  it("identifica tablet a partir de iPad", () => {
    expect(detectDevice("Mozilla/5.0 (iPad; CPU OS 14_0)")).toBe("tablet");
  });

  it("identifica desktop por padrão", () => {
    expect(detectDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(
      "desktop",
    );
  });
});

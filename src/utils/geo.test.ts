import { describe, expect, it } from "vitest";
import { detectCountry } from "./geo";

describe("detectCountry", () => {
  it("identifica o país a partir de um IP público conhecido", () => {
    expect(detectCountry("8.8.8.8")).toBe("US");
  });

  it("resolve IPv4 mapeado em IPv6 (::ffff:x.x.x.x)", () => {
    expect(detectCountry("::ffff:8.8.8.8")).toBe("US");
  });

  it("retorna undefined para IP de loopback", () => {
    expect(detectCountry("127.0.0.1")).toBeUndefined();
  });

  it("retorna undefined para IP de rede privada", () => {
    expect(detectCountry("192.168.0.5")).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { hashIp } from "./hash";

describe("hashIp", () => {
  it("gera um hash hexadecimal de 64 caracteres (sha256)", () => {
    expect(hashIp("192.168.0.1")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("é determinístico para o mesmo IP", () => {
    expect(hashIp("192.168.0.1")).toBe(hashIp("192.168.0.1"));
  });

  it("gera hashes diferentes para IPs diferentes", () => {
    expect(hashIp("192.168.0.1")).not.toBe(hashIp("192.168.0.2"));
  });
});

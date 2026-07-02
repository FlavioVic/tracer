import bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, UnauthorizedError } from "../errors/app-error";
import { userRepository } from "../repositories/user.repository";
import { authService } from "./auth.service";

vi.mock("../repositories/user.repository", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    create: vi.fn(),
  },
}));

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("lança ConflictError se o e-mail já existe", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        id: "1",
        email: "a@example.com",
        nome: "A",
        senhaHash: "hash",
        createdAt: new Date(),
      });

      await expect(
        authService.register({
          nome: "A",
          email: "a@example.com",
          senha: "senha1234",
        }),
      ).rejects.toBeInstanceOf(ConflictError);

      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it("cria o usuário com a senha hasheada e retorna accessToken", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.create).mockImplementation(async (data) => ({
        id: "1",
        nome: data.nome,
        email: data.email,
        senhaHash: data.senhaHash,
        createdAt: new Date(),
      }));

      const result = await authService.register({
        nome: "A",
        email: "a@example.com",
        senha: "senha1234",
      });

      expect(result.user).toEqual({
        id: "1",
        nome: "A",
        email: "a@example.com",
      });
      expect(typeof result.accessToken).toBe("string");

      const createdArgs = vi.mocked(userRepository.create).mock.calls[0][0];
      expect(createdArgs.senhaHash).not.toBe("senha1234");
      expect(await bcrypt.compare("senha1234", createdArgs.senhaHash)).toBe(
        true,
      );
    });
  });

  describe("login", () => {
    it("lança UnauthorizedError se o usuário não existe", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      await expect(
        authService.login({ email: "a@example.com", senha: "senha1234" }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("lança UnauthorizedError se a senha estiver errada", async () => {
      const senhaHash = await bcrypt.hash("senhacerta", 10);
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        id: "1",
        email: "a@example.com",
        nome: "A",
        senhaHash,
        createdAt: new Date(),
      });

      await expect(
        authService.login({ email: "a@example.com", senha: "senhaerrada" }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("retorna accessToken com a senha correta", async () => {
      const senhaHash = await bcrypt.hash("senhacerta", 10);
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        id: "1",
        email: "a@example.com",
        nome: "A",
        senhaHash,
        createdAt: new Date(),
      });

      const result = await authService.login({
        email: "a@example.com",
        senha: "senhacerta",
      });

      expect(result.user.email).toBe("a@example.com");
      expect(typeof result.accessToken).toBe("string");
    });
  });
});

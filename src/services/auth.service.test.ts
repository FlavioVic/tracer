import bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, UnauthorizedError } from "../errors/app-error";
import { refreshTokenRepository } from "../repositories/refresh-token.repository";
import { userRepository } from "../repositories/user.repository";
import { hashToken } from "../utils/hash";
import { authService } from "./auth.service";

vi.mock("../repositories/user.repository", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../repositories/refresh-token.repository", () => ({
  refreshTokenRepository: {
    create: vi.fn(),
    findByHash: vi.fn(),
    revoke: vi.fn(),
    revokeAllForUser: vi.fn(),
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

  describe("refresh", () => {
    it("lança UnauthorizedError se nenhum token for informado", async () => {
      await expect(authService.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("lança UnauthorizedError se o token não existir", async () => {
      vi.mocked(refreshTokenRepository.findByHash).mockResolvedValue(null);

      await expect(authService.refresh("token-qualquer")).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("lança UnauthorizedError e revoga todas as sessões se o token já foi usado (reuso)", async () => {
      vi.mocked(refreshTokenRepository.findByHash).mockResolvedValue({
        id: "rt1",
        tokenHash: hashToken("token-usado"),
        userId: "user1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: new Date(),
        createdAt: new Date(),
      });

      await expect(authService.refresh("token-usado")).rejects.toBeInstanceOf(UnauthorizedError);
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith("user1");
    });

    it("lança UnauthorizedError se o token estiver expirado", async () => {
      vi.mocked(refreshTokenRepository.findByHash).mockResolvedValue({
        id: "rt1",
        tokenHash: hashToken("token-expirado"),
        userId: "user1",
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
        createdAt: new Date(),
      });

      await expect(authService.refresh("token-expirado")).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("rotaciona o token e retorna um novo par válido", async () => {
      vi.mocked(refreshTokenRepository.findByHash).mockResolvedValue({
        id: "rt1",
        tokenHash: hashToken("token-valido"),
        userId: "user1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: null,
        createdAt: new Date(),
      });
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: "user1",
        email: "a@example.com",
        nome: "A",
        senhaHash: "hash",
        createdAt: new Date(),
      });

      const result = await authService.refresh("token-valido");

      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith("rt1");
      expect(typeof result.accessToken).toBe("string");
      expect(typeof result.refreshToken).toBe("string");
      expect(result.refreshToken).not.toBe("token-valido");
    });
  });

  describe("logout", () => {
    it("não faz nada se nenhum token for informado", async () => {
      await authService.logout(undefined);
      expect(refreshTokenRepository.findByHash).not.toHaveBeenCalled();
    });

    it("revoga o token se ele existir e ainda não tiver sido revogado", async () => {
      vi.mocked(refreshTokenRepository.findByHash).mockResolvedValue({
        id: "rt1",
        tokenHash: hashToken("token-ativo"),
        userId: "user1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: null,
        createdAt: new Date(),
      });

      await authService.logout("token-ativo");

      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith("rt1");
    });

    it("é idempotente se o token já estiver revogado", async () => {
      vi.mocked(refreshTokenRepository.findByHash).mockResolvedValue({
        id: "rt1",
        tokenHash: hashToken("token-revogado"),
        userId: "user1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: new Date(),
        createdAt: new Date(),
      });

      await authService.logout("token-revogado");

      expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
    });
  });
});

import bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, UnauthorizedError } from "../errors/app-error";
import { userRepository } from "../repositories/user.repository";
import { userService } from "./user.service";

vi.mock("../repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
    updateNome: vi.fn(),
    updateSenhaHash: vi.fn(),
  },
}));

const baseUser = {
  id: "1",
  nome: "A",
  email: "a@example.com",
  senhaHash: "hash",
  createdAt: new Date(),
};

describe("userService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProfile", () => {
    it("lança NotFoundError se o usuário não existe", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(userService.getProfile("1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("retorna o usuário público", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(baseUser);

      const result = await userService.getProfile("1");

      expect(result).toEqual({ id: "1", nome: "A", email: "a@example.com" });
    });
  });

  describe("updateProfile", () => {
    it("lança NotFoundError se o usuário não existe", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(
        userService.updateProfile("1", { nome: "Novo nome" }),
      ).rejects.toBeInstanceOf(NotFoundError);

      expect(userRepository.updateNome).not.toHaveBeenCalled();
    });

    it("atualiza o nome e retorna o usuário público", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(baseUser);
      vi.mocked(userRepository.updateNome).mockResolvedValue({
        ...baseUser,
        nome: "Novo nome",
      });

      const result = await userService.updateProfile("1", { nome: "Novo nome" });

      expect(userRepository.updateNome).toHaveBeenCalledWith("1", "Novo nome");
      expect(result).toEqual({ id: "1", nome: "Novo nome", email: "a@example.com" });
    });
  });

  describe("changePassword", () => {
    it("lança NotFoundError se o usuário não existe", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(
        userService.changePassword("1", { senhaAtual: "x", novaSenha: "y".repeat(8) }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("lança UnauthorizedError se a senha atual está incorreta", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(baseUser);
      vi.spyOn(bcrypt, "compare").mockResolvedValue(false as never);

      await expect(
        userService.changePassword("1", {
          senhaAtual: "errada",
          novaSenha: "novaSenha1",
        }),
      ).rejects.toBeInstanceOf(UnauthorizedError);

      expect(userRepository.updateSenhaHash).not.toHaveBeenCalled();
    });

    it("hasheia e salva a nova senha quando a atual está correta", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(baseUser);
      vi.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
      vi.spyOn(bcrypt, "hash").mockResolvedValue("novo-hash" as never);

      await userService.changePassword("1", {
        senhaAtual: "senhaAtual1",
        novaSenha: "novaSenha1",
      });

      expect(userRepository.updateSenhaHash).toHaveBeenCalledWith("1", "novo-hash");
    });
  });
});

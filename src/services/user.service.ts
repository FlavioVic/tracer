import bcrypt from "bcrypt";
import { NotFoundError, UnauthorizedError } from "../errors/app-error";
import { userRepository } from "../repositories/user.repository";
import type { ChangePasswordDto, UpdateProfileDto } from "../schemas/user.schema";
import { toPublicUser } from "../utils/public-user";

const SALT_ROUNDS = 10;

export const userService = {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("Usuário não encontrado");
    }
    return toPublicUser(user);
  },

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("Usuário não encontrado");
    }
    const updated = await userRepository.updateNome(userId, dto.nome);
    return toPublicUser(updated);
  },

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("Usuário não encontrado");
    }

    const senhaValida = await bcrypt.compare(dto.senhaAtual, user.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedError("Senha atual incorreta");
    }

    const senhaHash = await bcrypt.hash(dto.novaSenha, SALT_ROUNDS);
    await userRepository.updateSenhaHash(userId, senhaHash);
  },
};

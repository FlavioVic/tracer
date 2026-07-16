import bcrypt from "bcrypt";
import { ConflictError, UnauthorizedError } from "../errors/app-error";
import { userRepository } from "../repositories/user.repository";
import type { LoginDto, RegisterDto } from "../schemas/auth.schema";
import { signAccessToken } from "../utils/jwt";
import { toPublicUser } from "../utils/public-user";

const SALT_ROUNDS = 10;

export const authService = {
  async register(dto: RegisterDto) {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError("E-mail já cadastrado");
    }

    const senhaHash = await bcrypt.hash(dto.senha, SALT_ROUNDS);
    const user = await userRepository.create({
      nome: dto.nome,
      email: dto.email,
      senhaHash,
    });

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    return { user: toPublicUser(user), accessToken };
  },

  async login(dto: LoginDto) {
    const user = await userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError();
    }

    const senhaValida = await bcrypt.compare(dto.senha, user.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedError();
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    return { user: toPublicUser(user), accessToken };
  },
};

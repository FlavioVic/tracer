import bcrypt from "bcrypt";
import { ConflictError, UnauthorizedError } from "../errors/app-error";
import { refreshTokenRepository } from "../repositories/refresh-token.repository";
import { userRepository } from "../repositories/user.repository";
import type { LoginDto, RegisterDto } from "../schemas/auth.schema";
import { hashToken } from "../utils/hash";
import { signAccessToken } from "../utils/jwt";
import { toPublicUser } from "../utils/public-user";
import { generateRefreshToken, REFRESH_TOKEN_TTL_MS } from "../utils/refresh-token";

const SALT_ROUNDS = 10;

async function issueRefreshToken(userId: string): Promise<string> {
  const rawToken = generateRefreshToken();
  await refreshTokenRepository.create({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return rawToken;
}

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
    const refreshToken = await issueRefreshToken(user.id);
    return { user: toPublicUser(user), accessToken, refreshToken };
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
    const refreshToken = await issueRefreshToken(user.id);
    return { user: toPublicUser(user), accessToken, refreshToken };
  },

  async refresh(rawToken: string | undefined) {
    if (!rawToken) {
      throw new UnauthorizedError("Refresh token não informado");
    }

    const record = await refreshTokenRepository.findByHash(hashToken(rawToken));
    if (!record) {
      throw new UnauthorizedError("Refresh token inválido");
    }

    if (record.revokedAt) {
      // Token já usado sendo reapresentado — sinal de possível roubo,
      // derruba todas as sessões desse usuário, não só recusa esta chamada.
      await refreshTokenRepository.revokeAllForUser(record.userId);
      throw new UnauthorizedError("Refresh token inválido");
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedError("Refresh token expirado");
    }

    const user = await userRepository.findById(record.userId);
    if (!user) {
      throw new UnauthorizedError();
    }

    await refreshTokenRepository.revoke(record.id);
    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = await issueRefreshToken(user.id);
    return { accessToken, refreshToken };
  },

  async logout(rawToken: string | undefined) {
    if (!rawToken) {
      return;
    }

    const record = await refreshTokenRepository.findByHash(hashToken(rawToken));
    if (record && !record.revokedAt) {
      await refreshTokenRepository.revoke(record.id);
    }
  },
};

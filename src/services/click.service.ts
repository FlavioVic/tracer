import { clickRepository } from "../repositories/click.repository";
import { detectDevice } from "../utils/device";
import { hashIp } from "../utils/hash";

interface RegisterClickInput {
  linkId: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
}

export const clickService = {
  // Sem geolocalização por IP ainda (campo `pais` fica vazio) — exigiria
  // integrar um serviço/base de GeoIP, fora do escopo desta feature.
  register(input: RegisterClickInput) {
    return clickRepository.create({
      linkId: input.linkId,
      ipHash: input.ip ? hashIp(input.ip) : undefined,
      userAgent: input.userAgent,
      referrer: input.referrer,
      dispositivo: input.userAgent ? detectDevice(input.userAgent) : undefined,
    });
  },
};

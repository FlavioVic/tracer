import { clickRepository } from "../repositories/click.repository";
import { detectDevice } from "../utils/device";
import { detectCountry } from "../utils/geo";
import { hashIp } from "../utils/hash";

interface RegisterClickInput {
  linkId: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
}

export const clickService = {
  register(input: RegisterClickInput) {
    return clickRepository.create({
      linkId: input.linkId,
      ipHash: input.ip ? hashIp(input.ip) : undefined,
      pais: input.ip ? detectCountry(input.ip) : undefined,
      userAgent: input.userAgent,
      referrer: input.referrer,
      dispositivo: input.userAgent ? detectDevice(input.userAgent) : undefined,
    });
  },
};

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clickRepository } from "../repositories/click.repository";
import { clickService } from "./click.service";

vi.mock("../repositories/click.repository", () => ({
  clickRepository: {
    create: vi.fn(),
  },
}));

describe("clickService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preenche pais quando o IP resolve pra um país conhecido", async () => {
    await clickService.register({ linkId: "link1", ip: "8.8.8.8" });

    expect(clickRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ linkId: "link1", pais: "US" }),
    );
  });

  it("deixa pais undefined quando o IP é local/privado ou ausente", async () => {
    await clickService.register({ linkId: "link1", ip: "127.0.0.1" });
    expect(clickRepository.create).toHaveBeenCalledWith(expect.objectContaining({ pais: undefined }));

    await clickService.register({ linkId: "link1" });
    expect(clickRepository.create).toHaveBeenCalledWith(expect.objectContaining({ pais: undefined }));
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../errors/app-error";
import { clickRepository } from "../repositories/click.repository";
import { linkRepository } from "../repositories/link.repository";
import { analyticsService } from "./analytics.service";

vi.mock("../repositories/link.repository", () => ({
  linkRepository: { findByIdForUser: vi.fn() },
}));
vi.mock("../repositories/click.repository", () => ({
  clickRepository: { findAllByLinkId: vi.fn() },
}));

describe("analyticsService.getLinkAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lança NotFoundError se o link não pertence ao usuário", async () => {
    vi.mocked(linkRepository.findByIdForUser).mockResolvedValue(null);

    await expect(
      analyticsService.getLinkAnalytics("user-1", "link-1"),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(clickRepository.findAllByLinkId).not.toHaveBeenCalled();
  });

  it("agrega cliques por dia, dispositivo, referrer e país", async () => {
    vi.mocked(linkRepository.findByIdForUser).mockResolvedValue({
      id: "link-1",
      slug: "abc1234",
      urlOriginal: "https://example.com",
      userId: "user-1",
      ativo: true,
      expiraEm: null,
      createdAt: new Date(),
    });

    vi.mocked(clickRepository.findAllByLinkId).mockResolvedValue([
      {
        timestamp: new Date("2026-07-01T10:00:00Z"),
        dispositivo: "mobile",
        referrer: "https://google.com",
        pais: null,
      },
      {
        timestamp: new Date("2026-07-01T12:00:00Z"),
        dispositivo: "mobile",
        referrer: "https://google.com",
        pais: null,
      },
      {
        timestamp: new Date("2026-07-02T08:00:00Z"),
        dispositivo: "desktop",
        referrer: null,
        pais: null,
      },
    ]);

    const result = await analyticsService.getLinkAnalytics(
      "user-1",
      "link-1",
    );

    expect(result.totalCliques).toBe(3);
    expect(result.porDia).toEqual([
      { data: "2026-07-01", total: 2 },
      { data: "2026-07-02", total: 1 },
    ]);
    expect(result.porDispositivo).toEqual([
      { valor: "mobile", total: 2 },
      { valor: "desktop", total: 1 },
    ]);
    expect(result.porReferrer).toEqual([
      { valor: "https://google.com", total: 2 },
      { valor: "desconhecido", total: 1 },
    ]);
    expect(result.porPais).toEqual([{ valor: "desconhecido", total: 3 }]);
  });
});

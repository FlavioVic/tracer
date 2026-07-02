import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, NotFoundError } from "../errors/app-error";
import { linkRepository } from "../repositories/link.repository";
import { linkService } from "./link.service";

vi.mock("../repositories/link.repository", () => ({
  linkRepository: {
    create: vi.fn(),
    findBySlug: vi.fn(),
    findManyByUserId: vi.fn(),
    findByIdForUser: vi.fn(),
    deactivate: vi.fn(),
  },
}));

function fakeLink(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "link-1",
    slug: "abc1234",
    urlOriginal: "https://example.com",
    userId: "user-1",
    ativo: true,
    expiraEm: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("linkService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("tenta um novo slug se o primeiro candidato colidir", async () => {
      vi.mocked(linkRepository.findBySlug)
        .mockResolvedValueOnce(fakeLink())
        .mockResolvedValueOnce(null);
      vi.mocked(linkRepository.create).mockResolvedValue(fakeLink());

      await linkService.create("user-1", {
        urlOriginal: "https://example.com",
      });

      expect(linkRepository.findBySlug).toHaveBeenCalledTimes(2);
      expect(linkRepository.create).toHaveBeenCalledTimes(1);
    });

    it("desiste após 5 colisões seguidas", async () => {
      vi.mocked(linkRepository.findBySlug).mockResolvedValue(fakeLink());

      await expect(
        linkService.create("user-1", { urlOriginal: "https://example.com" }),
      ).rejects.toBeInstanceOf(AppError);

      expect(linkRepository.findBySlug).toHaveBeenCalledTimes(5);
      expect(linkRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("listByUser", () => {
    it("inclui totalCliques a partir do _count", async () => {
      vi.mocked(linkRepository.findManyByUserId).mockResolvedValue([
        { ...fakeLink(), _count: { clicks: 3 } },
      ]);

      const result = await linkService.listByUser("user-1");

      expect(result[0]).toMatchObject({ id: "link-1", totalCliques: 3 });
    });
  });

  describe("deactivate", () => {
    it("lança NotFoundError se o link não existe ou não pertence ao usuário", async () => {
      vi.mocked(linkRepository.findByIdForUser).mockResolvedValue(null);

      await expect(
        linkService.deactivate("user-1", "link-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(linkRepository.deactivate).not.toHaveBeenCalled();
    });

    it("desativa o link quando pertence ao usuário", async () => {
      vi.mocked(linkRepository.findByIdForUser).mockResolvedValue(fakeLink());
      vi.mocked(linkRepository.deactivate).mockResolvedValue(
        fakeLink({ ativo: false }),
      );

      const result = await linkService.deactivate("user-1", "link-1");

      expect(result.ativo).toBe(false);
    });
  });

  describe("findRedirectTarget", () => {
    it("lança NotFoundError se o link não existe", async () => {
      vi.mocked(linkRepository.findBySlug).mockResolvedValue(null);
      await expect(
        linkService.findRedirectTarget("abc"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("lança NotFoundError se o link estiver inativo", async () => {
      vi.mocked(linkRepository.findBySlug).mockResolvedValue(
        fakeLink({ ativo: false }),
      );
      await expect(
        linkService.findRedirectTarget("abc"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("lança NotFoundError se o link estiver expirado", async () => {
      vi.mocked(linkRepository.findBySlug).mockResolvedValue(
        fakeLink({ expiraEm: new Date(Date.now() - 1000) }),
      );
      await expect(
        linkService.findRedirectTarget("abc"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("retorna o link quando ativo e não expirado", async () => {
      vi.mocked(linkRepository.findBySlug).mockResolvedValue(fakeLink());
      const result = await linkService.findRedirectTarget("abc");
      expect(result.id).toBe("link-1");
    });
  });
});

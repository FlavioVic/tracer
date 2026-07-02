import type { Request, Response } from "express";
import { linkService } from "../services/link.service";

export const linkController = {
  async create(req: Request, res: Response) {
    // authGuard roda antes de qualquer rota deste controller e garante userId
    const result = await linkService.create(req.userId as string, req.body);
    res.status(201).json(result);
  },

  async list(req: Request, res: Response) {
    const result = await linkService.listByUser(req.userId as string);
    res.status(200).json(result);
  },

  async deactivate(req: Request, res: Response) {
    const result = await linkService.deactivate(
      req.userId as string,
      req.params.id as string,
    );
    res.status(200).json(result);
  },
};

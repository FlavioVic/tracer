import type { Request, Response } from "express";
import { analyticsService } from "../services/analytics.service";

export const analyticsController = {
  async getLinkAnalytics(req: Request, res: Response) {
    const result = await analyticsService.getLinkAnalytics(
      req.userId as string,
      req.params.id as string,
    );
    res.status(200).json(result);
  },
};

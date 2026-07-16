import type { Request, Response } from "express";
import { userService } from "../services/user.service";

export const userController = {
  async me(req: Request, res: Response) {
    const result = await userService.getProfile(req.userId as string);
    res.status(200).json(result);
  },

  async updateProfile(req: Request, res: Response) {
    const result = await userService.updateProfile(req.userId as string, req.body);
    res.status(200).json(result);
  },

  async changePassword(req: Request, res: Response) {
    await userService.changePassword(req.userId as string, req.body);
    res.status(204).send();
  },
};

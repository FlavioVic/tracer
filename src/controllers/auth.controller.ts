import type { Request, Response } from "express";
import { authService } from "../services/auth.service";

// Express 5 encaminha rejeições de handlers async para o errorHandler
// automaticamente — não precisa de try/catch nem de wrapper aqui.
export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  },
};

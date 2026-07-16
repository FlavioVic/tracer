import type { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { clearRefreshCookie, REFRESH_COOKIE_NAME, setRefreshCookie } from "../utils/refresh-cookie";

// Express 5 encaminha rejeições de handlers async para o errorHandler
// automaticamente — não precisa de try/catch nem de wrapper aqui.
export const authController = {
  async register(req: Request, res: Response) {
    const { refreshToken, ...result } = await authService.register(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(201).json(result);
  },

  async login(req: Request, res: Response) {
    const { refreshToken, ...result } = await authService.login(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(200).json(result);
  },

  async refresh(req: Request, res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const { refreshToken, ...result } = await authService.refresh(rawToken);
    setRefreshCookie(res, refreshToken);
    res.status(200).json(result);
  },

  async logout(req: Request, res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    await authService.logout(rawToken);
    clearRefreshCookie(res);
    res.status(204).send();
  },
};

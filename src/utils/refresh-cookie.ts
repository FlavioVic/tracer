import type { Response } from "express";
import { REFRESH_TOKEN_TTL_MS } from "./refresh-token";

export const REFRESH_COOKIE_NAME = "refreshToken";

const isProduction = process.env.NODE_ENV === "production";

const REFRESH_COOKIE_PATH = "/api/auth";

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: REFRESH_COOKIE_PATH,
  });
}

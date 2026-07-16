import { createHash } from "node:crypto";

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

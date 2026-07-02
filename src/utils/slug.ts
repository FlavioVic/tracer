import { randomBytes } from "node:crypto";

export function generateSlug(length = 7): string {
  return randomBytes(8).toString("base64url").slice(0, length);
}

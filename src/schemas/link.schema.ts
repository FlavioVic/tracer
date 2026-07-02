import { z } from "zod";

export const createLinkSchema = z.object({
  urlOriginal: z.string().url("URL inválida"),
  expiraEm: z.coerce.date().optional(),
});

export type CreateLinkDto = z.infer<typeof createLinkSchema>;

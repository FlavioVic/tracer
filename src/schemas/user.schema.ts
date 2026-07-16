import { z } from "zod";

export const updateProfileSchema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  senhaAtual: z.string().min(1, "Senha atual é obrigatória"),
  novaSenha: z.string().min(8, "Nova senha deve ter ao menos 8 caracteres"),
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export function toPublicUser(user: { id: string; nome: string; email: string }) {
  return { id: user.id, nome: user.nome, email: user.email };
}

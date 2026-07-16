import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "../lib/api";
import type { User } from "../types/api";
import { useProfile } from "../hooks/useProfile";
import { Header } from "../components/Header";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

export function SettingsPage() {
  const { data: user, isLoading } = useProfile();

  return (
    <>
      <Header title="Configurações" subtitle="Dados da conta" />
      <div className="flex flex-col gap-5 p-8">
        {isLoading || !user ? (
          <div className="text-sm text-text-secondary">Carregando...</div>
        ) : (
          <>
            <ProfileForm user={user} />
            <PasswordForm />
          </>
        )}
      </div>
    </>
  );
}

function ProfileForm({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(user.nome);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setNome(user.nome);
  }, [user.nome]);

  const updateProfile = useMutation({
    mutationFn: (nome: string) => api.patch<User>("/api/users/me", { nome }),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(["me"], data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateProfile.mutate(nome);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-[420px] flex-col gap-4 rounded-xl border border-border bg-surface p-5"
    >
      <div className="text-[14.5px] font-semibold">Perfil</div>

      <Input
        id="nome"
        label="Nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        minLength={2}
        required
      />
      <Input id="email" label="E-mail" value={user.email} disabled />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={updateProfile.isPending || nome === user.nome}>
          {updateProfile.isPending ? "Salvando..." : "Salvar"}
        </Button>
        {success && <span className="text-xs font-semibold text-success">Salvo!</span>}
      </div>
    </form>
  );
}

function PasswordForm() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePassword = useMutation({
    mutationFn: (dto: { senhaAtual: string; novaSenha: string }) =>
      api.patch("/api/users/me/senha", dto),
    onSuccess: () => {
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmar("");
      setError(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 401) {
        setError("Senha atual incorreta");
      } else {
        setError("Não foi possível trocar a senha. Tente novamente.");
      }
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (novaSenha !== confirmar) {
      setError("A confirmação não bate com a nova senha");
      return;
    }
    changePassword.mutate({ senhaAtual, novaSenha });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-[420px] flex-col gap-4 rounded-xl border border-border bg-surface p-5"
    >
      <div className="text-[14.5px] font-semibold">Trocar senha</div>

      <Input
        id="senhaAtual"
        label="Senha atual"
        type="password"
        value={senhaAtual}
        onChange={(e) => setSenhaAtual(e.target.value)}
        required
      />
      <Input
        id="novaSenha"
        label="Nova senha"
        type="password"
        hint="Mínimo de 8 caracteres"
        value={novaSenha}
        onChange={(e) => setNovaSenha(e.target.value)}
        required
        minLength={8}
      />
      <Input
        id="confirmarSenha"
        label="Confirmar nova senha"
        type="password"
        value={confirmar}
        onChange={(e) => setConfirmar(e.target.value)}
        required
        minLength={8}
      />

      {error && <div className="text-xs text-danger">{error}</div>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? "Salvando..." : "Trocar senha"}
        </Button>
        {success && <span className="text-xs font-semibold text-success">Senha atualizada!</span>}
      </div>
    </form>
  );
}

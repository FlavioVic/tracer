import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "../lib/api";
import { setToken } from "../lib/auth";
import type { AuthResponse } from "../types/api";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { LinkIcon } from "../components/icons";

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>("/api/auth/register", {
        nome,
        email,
        senha,
      });
      setToken(data.accessToken);
      queryClient.setQueryData(["me"], data.user);
      navigate("/");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError("E-mail já cadastrado");
      } else if (isAxiosError(err) && err.response?.status === 400) {
        setError("Verifique os dados informados");
      } else {
        setError("Não foi possível criar a conta. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[360px] rounded-xl border border-border bg-surface p-7">
        <div className="mb-6 flex items-center gap-2 text-[15px] font-bold">
          <LinkIcon className="h-[18px] w-[18px] text-accent" />
          Tracer
        </div>

        <h1 className="m-0 mb-1 text-lg font-bold">Criar conta</h1>
        <p className="m-0 mb-5 text-[13px] text-text-secondary">
          Comece a encurtar e acompanhar seus links
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="nome"
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            minLength={2}
          />
          <Input
            id="email"
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="senha"
            label="Senha"
            type="password"
            hint="Mínimo de 8 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={8}
          />
          {error && <div className="text-xs text-danger">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-text-secondary">
          Já tem conta?{" "}
          <Link to="/login" className="font-semibold text-accent">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

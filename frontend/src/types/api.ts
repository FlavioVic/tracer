export interface User {
  id: string;
  nome: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Link {
  id: string;
  slug: string;
  urlOriginal: string;
  ativo: boolean;
  expiraEm: string | null;
  createdAt: string;
  totalCliques: number;
}

export interface LinkAnalytics {
  linkId: string;
  slug: string;
  totalCliques: number;
  porDia: { data: string; total: number }[];
  porDispositivo: { valor: string; total: number }[];
  porReferrer: { valor: string; total: number }[];
  porPais: { valor: string; total: number }[];
}

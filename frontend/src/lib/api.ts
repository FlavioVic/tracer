import axios, { isAxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearSession, getToken, setToken } from "./auth";

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ accessToken: string }>(
        `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then((res) => {
        setToken(res.data.accessToken);
        return res.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Rotas de auth (login/registro/refresh/logout) tratam seus próprios 401 —
// não devem disparar uma tentativa de refresh (login com senha errada não é
// sessão expirada).
function isAuthEndpoint(url: string | undefined) {
  return Boolean(url?.includes("/api/auth/"));
}

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const config = error.config as RetryableConfig;

    if (error.response?.status !== 401 || isAuthEndpoint(config.url) || config._retry) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      config.headers.set("Authorization", `Bearer ${accessToken}`);
      return api(config);
    } catch (refreshError) {
      clearSession();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    }
  },
);

import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { User } from "../types/api";

export function useProfile() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<User>("/api/users/me")).data,
  });
}

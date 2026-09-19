import type { LoginResponse } from "@/lib/api/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

/**
 * Separate from `apiFetch`: login has no token yet, and a 401 here means
 * "credenciais inválidas" — it must not trigger apiFetch's clear-session +
 * redirect-to-/login behavior (which is for an *expired* session).
 */
export async function login(email: string, senha: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("E-mail ou senha inválidos.");
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
    throw new Error(message ?? "Não foi possível entrar. Tente novamente.");
  }

  return res.json() as Promise<LoginResponse>;
}

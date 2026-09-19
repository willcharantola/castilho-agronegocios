import type { Usuario } from "@/lib/api/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const TOKEN_KEY = "access_token";
const USUARIO_KEY = "usuario";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
}

export function getUsuario(): Usuario | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USUARIO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}

export function setSession(accessToken: string, usuario: Usuario) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}

/** Authenticated client for the Castilho Agronegócios API — see INTEGRACAO-FRONTEND.md. */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Token ausente/expirado — a sessão local não é mais válida.
    clearSession();
    // Hard redirect (not router.push): forces a full reload so no stale
    // client state from the expired session lingers after navigating away.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(401, "Não autenticado.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
    throw new ApiError(res.status, message ?? `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

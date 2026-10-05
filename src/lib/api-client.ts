import type { Usuario } from "@/lib/api/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const TOKEN_KEY = "access_token";
const USUARIO_KEY = "usuario";

export class ApiError extends Error {
  status: number;
  /** Código de erro da API, quando houver (ex.: PRIMEIRO_ACESSO_PENDENTE). */
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** A API bloqueia tudo (403) até o usuário trocar a senha no primeiro acesso. */
export const PRIMEIRO_ACESSO_PENDENTE = "PRIMEIRO_ACESSO_PENDENTE";

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

/** Atualiza o usuário guardado (ex.: após editar o próprio cadastro ou trocar a senha). */
export function updateUsuarioLocal(patch: Partial<Usuario>) {
  const atual = getUsuario();
  if (!atual) return;
  localStorage.setItem(USUARIO_KEY, JSON.stringify({ ...atual, ...patch }));
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
      // Fuso do aparelho (ex.: "America/Cuiaba") — a API usa para gravar os horários de
      // pesagem na hora local de onde o usuário está.
      "X-Fuso-Horario": Intl.DateTimeFormat().resolvedOptions().timeZone,
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
    if (res.status === 403 && body?.code === PRIMEIRO_ACESSO_PENDENTE) {
      // Sessão válida, mas a senha do primeiro acesso ainda não foi definida.
      updateUsuarioLocal({ primeiro_acesso: true });
      if (typeof window !== "undefined" && window.location.pathname !== "/primeiro-acesso") {
        // Hard redirect, como no 401 acima: descarta o estado da tela bloqueada.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/primeiro-acesso";
      }
    }
    throw new ApiError(res.status, message ?? `Erro ${res.status}`, body?.code);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

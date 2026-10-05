import { apiFetch } from "@/lib/api-client";
import type { CreateUsuarioInput, UpdateUsuarioInput, Usuario } from "@/lib/api/types";

/** Gestão de usuários: só Admin, e só da própria empresa (validado na API). */
export function fetchUsuarios() {
  return apiFetch<Usuario[]>("/usuarios");
}

export function fetchUsuario(id: number | string) {
  return apiFetch<Usuario>(`/usuarios/${id}`);
}

export function createUsuario(input: CreateUsuarioInput) {
  return apiFetch<Usuario>("/usuarios", { method: "POST", body: JSON.stringify(input) });
}

export function updateUsuario(id: number | string, input: UpdateUsuarioInput) {
  return apiFetch<Usuario>(`/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteUsuario(id: number | string) {
  return apiFetch<Usuario>(`/usuarios/${id}`, { method: "DELETE" });
}

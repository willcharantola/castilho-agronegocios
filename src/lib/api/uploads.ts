import { apiFetch } from "@/lib/api-client";

export type UploadMarcaTipo = "image/jpeg" | "image/png" | "image/webp";

/**
 * Pede à API uma URL pré-assinada (5 min) para enviar a marca da fazenda direto ao S3.
 * `finalUrl` é a URL pública da imagem, a ser salva como `marca_url` da fazenda.
 */
export function getUploadUrlMarca(contentType: UploadMarcaTipo) {
  return apiFetch<{ uploadUrl: string; finalUrl: string }>("/uploads/marca-fazenda", {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
}

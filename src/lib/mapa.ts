// Localização da fazenda (fazenda.localizacao_google): link do Google Maps de um host
// permitido ou coordenadas "latitude,longitude". A API valida a mesma lista
// (common/localizacao.util.ts) — nunca se monta link a partir de texto livre.

/** "lat,lng" com ponto decimal; aceita espaço depois da vírgula. */
const COORDENADAS_REGEX = /^(-?\d{1,2}(?:\.\d+)?),\s?(-?\d{1,3}(?:\.\d+)?)$/;

export function coordenadas(valor: string): { latitude: number; longitude: number } | null {
  const match = COORDENADAS_REGEX.exec(valor.trim());
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

/**
 * Link https do Google Maps: www.google.com/maps, google.com/maps, maps.google.com,
 * maps.app.goo.gl (link curto do app) e goo.gl/maps. Bloqueia javascript:, data:, http e
 * outros hosts.
 */
export function ehLinkMapaPermitido(valor: string): boolean {
  let url: URL;
  try {
    url = new URL(valor.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const caminhoMaps = url.pathname === "/maps" || url.pathname.startsWith("/maps/");
  switch (url.hostname) {
    case "www.google.com":
    case "google.com":
    case "goo.gl":
      return caminhoMaps;
    case "maps.google.com":
    case "maps.app.goo.gl":
      return true;
    default:
      return false;
  }
}

export function localizacaoValida(valor: string): boolean {
  return coordenadas(valor) !== null || ehLinkMapaPermitido(valor);
}

const BUSCA_MAPS = "https://www.google.com/maps/search/?api=1&query=";

/**
 * URL do botão "Ver no mapa":
 * 1. link permitido → o próprio link;
 * 2. coordenadas válidas → busca pelas coordenadas;
 * 3. endereço → busca pelo endereço;
 * 4. nada disso → null (sem botão).
 */
export function resolverLinkMapa(
  localizacao: string | null | undefined,
  endereco: string | null | undefined
): string | null {
  const local = localizacao?.trim();
  if (local) {
    if (ehLinkMapaPermitido(local)) return local;
    const c = coordenadas(local);
    if (c) return `${BUSCA_MAPS}${c.latitude},${c.longitude}`;
  }
  const end = endereco?.trim();
  if (end) return `${BUSCA_MAPS}${encodeURIComponent(end)}`;
  return null;
}

/** Pré-visualização embutida (sem chave de API) — só com coordenadas. */
export function urlMapaEmbutido(localizacao: string | null | undefined): string | null {
  const c = localizacao ? coordenadas(localizacao) : null;
  return c ? `https://www.google.com/maps?q=${c.latitude},${c.longitude}&output=embed` : null;
}

/** Coordenadas do GPS no formato aceito pelo campo (até 6 casas decimais). */
export function formatarCoordenadas(latitude: number, longitude: number): string {
  const seis = (n: number) => String(Number(n.toFixed(6)));
  return `${seis(latitude)},${seis(longitude)}`;
}

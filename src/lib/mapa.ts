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

/** Link curto (maps.app.goo.gl, goo.gl/maps): não traz o lugar; a API o expande (expandirLinkMapa). */
export function ehLinkCurto(valor: string | null | undefined): boolean {
  if (!valor || !ehLinkMapaPermitido(valor)) return false;
  const host = new URL(valor.trim()).hostname;
  return host === "maps.app.goo.gl" || host === "goo.gl";
}

/** Primeiro parâmetro de busca presente (q, query, ll…), sem espaços nas pontas. */
function parametro(url: URL, nomes: string[]) {
  for (const nome of nomes) {
    const valor = url.searchParams.get(nome)?.trim();
    if (valor) return valor;
  }
  return null;
}

/**
 * O que mostrar no mapa a partir de um link completo do Google Maps, na ordem de precisão:
 * 1. o marcador do lugar (!3d<lat>!4d<lng>, nos links de /maps/place/);
 * 2. o nome do lugar (/maps/place/<nome>/ ou /maps/search/<texto>/);
 * 3. a busca (q=, query=, ll=, center=, destination=), com coordenadas ou texto;
 * 4. o centro da tela do mapa (@<lat>,<lng>,<zoom>z).
 */
function consultaDoLink(link: string): string | null {
  const url = new URL(link.trim());
  const marcador = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(url.href);
  if (marcador) return `${marcador[1]},${marcador[2]}`;

  const lugar = /^\/maps\/(?:place|search)\/([^/@]+)/.exec(url.pathname);
  if (lugar) {
    let nome = lugar[1].replace(/\+/g, " ");
    try {
      nome = decodeURIComponent(nome);
    } catch {
      // "%" solto no link: usa o nome como veio.
    }
    if (nome.trim()) return nome.trim();
  }

  const busca = parametro(url, ["q", "query", "ll", "center", "destination"]);
  if (busca) return busca;

  const centro = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(url.pathname);
  return centro ? `${centro[1]},${centro[2]}` : null;
}

/**
 * Pré-visualização embutida (sem chave de API): coordenadas ou link completo do Google
 * Maps. O link curto precisa ser expandido antes (ehLinkCurto → expandirLinkMapa da API).
 */
export function urlMapaEmbutido(localizacao: string | null | undefined): string | null {
  const local = localizacao?.trim();
  if (!local) return null;
  const c = coordenadas(local);
  let consulta: string | null = c ? `${c.latitude},${c.longitude}` : null;
  if (!consulta && ehLinkMapaPermitido(local) && !ehLinkCurto(local)) consulta = consultaDoLink(local);
  return consulta ? `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&output=embed` : null;
}

/** Coordenadas do GPS no formato aceito pelo campo (até 6 casas decimais). */
export function formatarCoordenadas(latitude: number, longitude: number): string {
  const seis = (n: number) => String(Number(n.toFixed(6)));
  return `${seis(latitude)},${seis(longitude)}`;
}

import { createSerwistRoute } from "@serwist/turbopack";

// Muda a cada build (o projeto não está em um repositório git para usar o commit),
// forçando os aparelhos a baixarem de novo as páginas pré-cacheadas após um deploy.
const revision = crypto.randomUUID();

/**
 * Páginas (todas client-side, pré-renderizadas no build) guardadas no aparelho já na
 * instalação do service worker, para abrir o app e cadastrar sem internet mesmo sem
 * ter visitado cada tela antes. Rotas com [id] não entram: são cacheadas ao visitar.
 */
const PAGINAS_OFFLINE = [
  "/",
  "/~offline",
  "/login",
  "/negocios",
  "/negocios/novo",
  "/negocios/novo/pecuarista",
  "/negocios/novo/comprador",
  "/negocios/novo/modalidade",
  "/negocios/novo/informacoes",
  "/negocios/novo/gado",
  "/negocios/novo/quantidade-cabecas",
  "/fazendas",
  "/fazendas/novo",
  "/pecuaristas",
  "/pecuaristas/novo",
  "/pecuaristas/novo/dados",
  "/compradores",
  "/compradores/novo",
  "/dashboard",
  "/configuracoes",
  "/configuracoes/impostos-e-taxas",
];

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: PAGINAS_OFFLINE.map((url) => ({ url, revision })),
  swSrc: "src/app/sw.ts",
  // Modelos .docx dos relatórios antigos (3,3 MB) ficam de fora da instalação: gerar
  // relatório depende de dados do servidor. São baixados normalmente quando usados online.
  // Os do romaneio (~250 KB) entram, para o romaneio sair também sem conexão.
  globIgnores: [
    "**/node_modules/**/*",
    "public/templates/modelo-relatorio.docx",
    "public/templates/modelo-relatorio-negocio.docx",
  ],
  useNativeEsbuild: true,
});

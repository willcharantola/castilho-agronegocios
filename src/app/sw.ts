import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Chamadas à API (outra origem) nunca passam pelo cache do service worker: o
    // modo offline dos dados é feito no IndexedDB (lib/offline), que sabe quando a
    // resposta é velha e mantém a fila de cadastros. Um cache aqui mascararia a
    // falta de rede e devolveria listas antigas como se fossem atuais.
    { matcher: ({ sameOrigin }) => !sameOrigin, handler: new NetworkOnly() },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

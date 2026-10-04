import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  /* config options here */
};

// Service worker (PWA / funcionamento offline) — ver src/app/sw.ts e src/app/serwist.
export default withSerwist(nextConfig);

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Castilho Agronegócios",
    short_name: "Castilho",
    description: "Sistema de gestão de negócios e gado da Castilho Agronegócios.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fefce5",
    theme_color: "#fefce5",
    icons: [
      { src: "/icon.png", sizes: "2048x2048", type: "image/png" },
      { src: "/apple-icon.png", sizes: "720x720", type: "image/png" },
    ],
  };
}

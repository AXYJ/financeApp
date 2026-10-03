import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finances",
    short_name: "Finances",
    description: "Suivi de budget personnel",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0e54",
    theme_color: "#0e0e54",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

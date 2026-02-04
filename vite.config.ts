import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/taskmedic-a2.0/",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      manifest: {
        name: "TaskMedic",
        short_name: "TaskMedic",
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#0b0f14",
        theme_color: "#0A84FF",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", //Automatically updates the service worker in the bg
      includeAssets: [
        "favicon-32x32.png",
        "favicon-16x16.png",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "connectX",
        short_name: "connectX",
        description: "connectX | chat with anyone",
        theme_color: "#2579ff",
        background_color: "#2579ff",
        display: "standalone",
        icons: [
          {
            src: "icons/connectX_icon-48x48.png",
            sizes: "48x48",
            type: "image/png",
          },
          {
            src: "icons/connectX_icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
          },
          {
            src: "icons/connectX_icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "icons/connectX_icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "icons/connectX_icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "icons/connectX_icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
          },
          {
            src: "icons/connectX_icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/connectX_icon-256x256.png",
            sizes: "256x256",
            type: "image/png",
          },
          {
            src: "icons/connectX_icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "icons/connectX_icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // Caches JS, CSS, HTML, and images for offline support
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,webmanifest,mp3,jpg,jpeg}",
        ],
      },
    }),
  ],
});

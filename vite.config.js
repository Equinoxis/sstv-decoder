import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  base: "/",
  plugins: [tailwindcss(), cloudflare()],
  publicDir: "public",
});
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import fs from "fs-extra";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-manifest",
      writeBundle() {
        fs.copySync(resolve(__dirname, "public"), resolve(__dirname, "dist"));
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "src/scripts/background.js"),
        contentScript: resolve(__dirname, "src/scripts/contentScript.js"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (
            chunkInfo.name === "contentScript" ||
            chunkInfo.name === "background"
          ) {
            return `assets/[name].js`;
          }
          return `assets/[name].js`;
        },
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
});

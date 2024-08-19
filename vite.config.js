import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import fs from "fs-extra";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default defineConfig({
  plugins: [
    react(),
    nodeResolve(),
    commonjs(),
    {
      name: "copy-manifest",
      writeBundle() {
        fs.copySync(resolve(__dirname, "public"), resolve(__dirname, "dist"));
      },
    },
  ],
  define: {
    "process.env.API_KEY": JSON.stringify(process.env.API_KEY),
  },
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
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
        format: "es",
      },
    },
  },
  optimizeDeps: {
    include: [
      "@tensorflow/tfjs",
      "@tensorflow-models/universal-sentence-encoder",
    ],
  },
});

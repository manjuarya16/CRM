import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_DEV_API_TARGET || env.VITE_SERVER_URL || "https://crmsrv.imorse.digital";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ["legacy-js-api", "import"],
        },
      },
    },
    define: { "process.env": {} },
  };
});

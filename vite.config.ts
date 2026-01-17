import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const menuServiceUrl = env.MENU_SERVICE_URL || 'http://localhost:3000';
  const dataServiceUrl = env.DATA_SERVICE_URL || 'http://localhost:8000';

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api/menu": {
          target: menuServiceUrl,
          changeOrigin: true,
          secure: false,
        },
        "/api/v1/visitors-queries": {
          target: dataServiceUrl,
          changeOrigin: true,
          secure: false,
        },

      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

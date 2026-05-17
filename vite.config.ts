import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { groupsApiMiddleware } from "./src/server/viteGroupsMiddleware";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const dataServiceUrl = env.VITE_DATA_SERVICE_URL;

  // Manually map non-VITE prefixed variables that our local backend plugins need
  if (env.MONGODB_URI) {
    process.env.MONGODB_URI = env.MONGODB_URI;
  }

  if (!dataServiceUrl) {
    console.log("VITE_DATA_SERVICE_URL could not load well");
  }

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api/v1/concept/menu": {
          target: dataServiceUrl,
          changeOrigin: true,
          secure: false,
        },
        "/api/v1/visitors-queries": {
          target: dataServiceUrl,
          changeOrigin: true,
          secure: false,
        },
      },
      cors: true,
    },
    plugins: [
      react(), 
      groupsApiMiddleware()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

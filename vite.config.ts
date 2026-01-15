import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  console.log("Loaded VITE_API_TARGET:", env.VITE_API_TARGET);
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api/v1": {
          target: env.VITE_API_TARGET ,
          changeOrigin: true,
          secure: false,
        },
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      "/getAllOnePatientRaw": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/getAllMultiPatientRaw": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/getAllMultiPatientAbstract": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  server: {
    // Proxy API calls to local express server
    proxy: {
      "/api": "http://localhost:3000",
    },
    allowedHosts: true,
  },
  plugins: [react()],
});

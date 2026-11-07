import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the UI runs on Vite (5173) and calls the console server (3001) through this proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    proxy: { "/api": `http://127.0.0.1:${process.env.CONSOLE_PORT || 3001}` },
  },
});

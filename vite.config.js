import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static site: the UI calls the simulator's REST API directly (URL + token are set in Settings).
export default defineConfig({
  plugins: [react()],
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/ey-resource-governance-dashboard/",
  plugins: [react()],
});

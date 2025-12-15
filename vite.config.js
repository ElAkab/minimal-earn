import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [tailwindcss()],
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:3000",
				changeOrigin: true, // Nécessaire pour le CORS : changeOrigin = On active le changement d'origine
			},
			// Proxy pour les routes statiques si nécessaire
			"/notes": {
				target: "http://localhost:3000",
				changeOrigin: true,
			},
		},
	},
});

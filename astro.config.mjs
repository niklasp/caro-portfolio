import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

// EmDash auf Cloudflare: Inhalte in D1, Fotos in R2, Admin unter /_emdash/admin.
export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
			// Höchstens 20 MB pro Datei: mehr nimmt Cloudflares Bilddienst zum Verkleinern nicht an.
			maxUploadSize: 20 * 1024 * 1024,
			// Der Admin zeigt nur, was diese Seite benutzt. Die Seiten bleiben über ihre Adresse erreichbar.
			admin: {
				hiddenNavItems: [
					"calendar",
					"comments",
					"menus",
					"redirects",
					"widgets",
					"sections",
					"bylines",
					"import",
				],
			},
		}),
	],
	devToolbar: { enabled: false },
});

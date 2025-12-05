import type { Hono } from "hono";
import { createReleaseRouter } from "../modules/releases/routes.js";

export function registerRoutes(app: Hono) {
	app.get("/", (c) => {
		return c.json({
			name: "What's New API",
			version: "0.1.0",
			docs: "https://github.com/yourusername/whatsnew",
		});
	});

	app.route("/v1", createReleaseRouter());
}

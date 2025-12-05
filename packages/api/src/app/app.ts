import { Hono } from "hono";
import { applyMiddlewares } from "./middlewares.js";
import { registerRoutes } from "./routes.js";

export function createApp() {
	const app = new Hono();
	applyMiddlewares(app);
	registerRoutes(app);
	return app;
}

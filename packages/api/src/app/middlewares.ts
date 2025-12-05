import type { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

export function applyMiddlewares(app: Hono) {
	app.use("*", logger());
	app.use("*", cors());
	app.use("*", prettyJSON());
}

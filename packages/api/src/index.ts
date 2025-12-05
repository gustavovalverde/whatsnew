import { createApp } from "./app/app.js";
import { env } from "./config/env.js";

const app = createApp();

console.log(`🚀 What's New API running on http://localhost:${env.PORT}`);

export default {
	port: env.PORT,
	fetch: app.fetch,
};

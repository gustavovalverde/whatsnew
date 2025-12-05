import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"../src": resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: "node",
		include: ["tests/**/*.spec.ts"],
		coverage: {
			reporter: ["text", "json-summary", "lcov"],
			include: ["src/**/*.ts"],
			thresholds: {
				lines: 70,
				functions: 70,
				branches: 60,
				statements: 70,
			},
		},
	},
});

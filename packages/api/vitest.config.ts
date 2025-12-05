import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@app": new URL("./src", import.meta.url).pathname,
		},
	},
	test: {
		environment: "node",
		include: ["tests/**/*.spec.ts"],
		coverage: {
			reporter: ["text", "json-summary", "lcov"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.d.ts", "src/**/*/__mocks__/**"],
			thresholds: {
				lines: 70,
				functions: 70,
				branches: 60,
				statements: 70,
			},
		},
	},
});

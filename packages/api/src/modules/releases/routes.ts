import { ReleaseService } from "@whatsnew/core";
import { filterCategories } from "@whatsnew/parsers";
import type { CategoryFilter } from "@whatsnew/types";
import { Hono } from "hono";
import { env } from "../../config/env.js";

export function createReleaseRouter() {
	const router = new Hono();
	const releaseService = new ReleaseService({
		token: env.GITHUB_TOKEN,
		enableFallback: true,
		ai: {
			enabled: env.AI_ENABLED,
			provider: env.AI_PROVIDER,
			model: env.AI_MODEL,
			confidenceThreshold: env.AI_CONFIDENCE_THRESHOLD,
		},
	});

	router.get(
		"/repos/github/:owner/:repo/releases/latest/whats-new",
		async (c) => {
			const { owner, repo } = c.req.param();
			const packageName = c.req.query("package");
			const filterParam = c.req.query("filter") as CategoryFilter | undefined;

			// Validate filter param
			if (
				filterParam &&
				!["important", "maintenance", "all"].includes(filterParam)
			) {
				return c.json(
					{
						error: "Invalid filter",
						message: `Invalid filter value: ${filterParam}`,
						hint: "Valid values: important, maintenance, all",
					},
					400,
				);
			}

			try {
				// Check if this is a monorepo
				const monorepoInfo = await releaseService.detectMonorepo(owner, repo);

				// If it's a monorepo and no package specified, return helpful error
				if (monorepoInfo.isMonorepo && !packageName) {
					return c.json(
						{
							error: "Monorepo detected",
							message:
								"This repository contains multiple packages. Please specify which package you want to query.",
							hint: `Add ?package=<name> to your request`,
							availablePackages: monorepoInfo.packages.slice(0, 10),
							example: `?package=${monorepoInfo.packages[0]}`,
						},
						400,
					);
				}

				// Get release (with optional package filter)
				let wnf = await releaseService.getLatestReleaseWNF(
					owner,
					repo,
					packageName,
				);

				// Apply category filter if specified
				if (filterParam && filterParam !== "all") {
					wnf = {
						...wnf,
						categories: filterCategories(wnf.categories, filterParam),
					};
				}

				return c.json(wnf);
			} catch (error) {
				if (error instanceof Error) {
					const message = error.message.toLowerCase();

					// Rate limit errors from GitHub API
					if (message.includes("rate limit") || message.includes("403")) {
						return c.json(
							{ error: "Rate limited", message: error.message },
							429,
						);
					}

					// Repository or release not found
					if (message.includes("not found") || message.includes("404")) {
						return c.json({ error: "Not found", message: error.message }, 404);
					}
				}

				console.error("Error fetching release:", error);
				return c.json({ error: "Failed to fetch release information" }, 500);
			}
		},
	);

	return router;
}

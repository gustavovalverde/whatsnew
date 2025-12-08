import { AlertTriangle } from "lucide-react";

interface UnreleasedBannerProps {
	repo: string;
	reason: "no_releases" | "no_releases_in_range";
	commitCount: number;
}

export function UnreleasedBanner({
	repo,
	reason,
	commitCount,
}: UnreleasedBannerProps) {
	const message =
		reason === "no_releases"
			? `${repo} has no published releases`
			: `No releases found in the specified range for ${repo}`;

	return (
		<div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
			<AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
			<div className="text-sm">
				<span className="font-medium text-amber-600 dark:text-amber-400">
					Showing unreleased changes
				</span>
				<p className="text-muted-foreground mt-1">
					{message}. Displaying {commitCount} commit
					{commitCount !== 1 ? "s" : ""} from the default branch.
				</p>
			</div>
		</div>
	);
}

import { GitBranch } from "lucide-react";

interface UnreleasedInfoProps {
	commitCount: number;
	baselineTag?: string;
}

export function UnreleasedInfo({
	commitCount,
	baselineTag,
}: UnreleasedInfoProps) {
	return (
		<div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
			<GitBranch className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
			<div className="text-sm">
				<span className="font-medium text-blue-600 dark:text-blue-400">
					Unreleased changes
				</span>
				<p className="text-muted-foreground mt-1">
					{commitCount} commit{commitCount !== 1 ? "s" : ""} since{" "}
					{baselineTag || "last release"} on the default branch.
				</p>
			</div>
		</div>
	);
}

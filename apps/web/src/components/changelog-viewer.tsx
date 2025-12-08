import type {
	Category,
	ChangeItem,
	WNFAggregatedDocument,
	WNFDocument,
} from "@whatsnew/types";
import { AnimatePresence, motion } from "framer-motion";
import {
	AlertCircle,
	Box,
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	ExternalLink,
	FileText,
	GitCommit,
	Info,
	Layers,
	Package as PackageIcon,
	Shield,
	Zap,
} from "lucide-react";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	HIGH_PRIORITY_CATEGORIES,
	PRIORITY_ORDER,
} from "@/lib/constants/categories";
import { formatMarkdown } from "@/lib/format-markdown";
import { cn } from "@/lib/utils";

interface ChangelogViewerProps {
	data: WNFDocument | WNFAggregatedDocument;
}

function isAggregated(
	data: WNFDocument | WNFAggregatedDocument,
): data is WNFAggregatedDocument {
	return "packages" in data;
}

const CATEGORY_CONFIG: Record<
	string,
	{
		icon: React.ReactNode;
		color: string;
		bg: string;
		border: string;
		label: string;
	}
> = {
	breaking: {
		icon: <AlertCircle className="h-4 w-4" />,
		color: "text-amber-700 dark:text-amber-400",
		bg: "bg-amber-50 dark:bg-amber-950/30",
		border: "border-amber-200 dark:border-amber-800",
		label: "Breaking Changes",
	},
	security: {
		icon: <Shield className="h-4 w-4" />,
		color: "text-rose-700 dark:text-rose-400",
		bg: "bg-rose-50 dark:bg-rose-950/30",
		border: "border-rose-200 dark:border-rose-800",
		label: "Security Fixes",
	},
	features: {
		icon: <Zap className="h-4 w-4" />,
		color: "text-blue-700 dark:text-blue-400",
		bg: "bg-blue-50 dark:bg-blue-950/30",
		border: "border-blue-200 dark:border-blue-800",
		label: "New Features",
	},
	fixes: {
		icon: <CheckCircle2 className="h-4 w-4" />,
		color: "text-emerald-700 dark:text-emerald-400",
		bg: "bg-emerald-50 dark:bg-emerald-950/30",
		border: "border-emerald-200 dark:border-emerald-800",
		label: "Bug Fixes",
	},
	perf: {
		icon: <Zap className="h-4 w-4" />,
		color: "text-purple-700 dark:text-purple-400",
		bg: "bg-purple-50 dark:bg-purple-950/30",
		border: "border-purple-200 dark:border-purple-800",
		label: "Performance",
	},
	deps: {
		icon: <Box className="h-4 w-4" />,
		color: "text-indigo-700 dark:text-indigo-400",
		bg: "bg-indigo-50 dark:bg-indigo-950/30",
		border: "border-indigo-200 dark:border-indigo-800",
		label: "Dependencies",
	},
	docs: {
		icon: <FileText className="h-4 w-4" />,
		color: "text-teal-700 dark:text-teal-400",
		bg: "bg-teal-50 dark:bg-teal-950/30",
		border: "border-teal-200 dark:border-teal-800",
		label: "Documentation",
	},
	refactor: {
		icon: <Layers className="h-4 w-4" />,
		color: "text-orange-700 dark:text-orange-400",
		bg: "bg-orange-50 dark:bg-orange-950/30",
		border: "border-orange-200 dark:border-orange-800",
		label: "Refactoring",
	},
	chore: {
		icon: <GitCommit className="h-4 w-4" />,
		color: "text-zinc-600 dark:text-zinc-400",
		bg: "bg-zinc-100 dark:bg-zinc-900/50",
		border: "border-zinc-300 dark:border-zinc-700",
		label: "Chores",
	},
	other: {
		icon: <Info className="h-4 w-4" />,
		color: "text-slate-600 dark:text-slate-400",
		bg: "bg-slate-50 dark:bg-slate-900/40",
		border: "border-slate-200 dark:border-slate-800",
		label: "Other Changes",
	},
};

function formatMessage(text: string): ReactNode[] {
	// Split on code blocks first (triple backticks), then handle inline code
	// This regex captures: ```lang\ncode``` or ```code``` patterns
	const blockCodeRegex = /(```(?:[a-zA-Z]*\n)?[\s\S]*?```)/g;
	const parts = text.split(blockCodeRegex);

	return parts.map((part) => {
		// Handle triple backtick code blocks
		if (part.startsWith("```") && part.endsWith("```")) {
			const content = part.slice(3, -3);
			// Strip optional language identifier (e.g., "typescript\n", "ts\n", "javascript\n")
			const langMatch = content.match(/^([a-zA-Z]+)\n/);
			const language = langMatch ? langMatch[1] : null;
			const codeContent = langMatch
				? content.slice(langMatch[0].length)
				: content;

			return (
				<pre
					key={`block-${part.slice(0, 50)}`}
					className="my-3 overflow-x-auto rounded-lg border border-border/60 bg-muted/80 dark:bg-zinc-900/80 max-w-full"
				>
					{language && (
						<div className="border-b border-border/40 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
							{language}
						</div>
					)}
					<code className="block px-4 py-3 font-mono text-[0.8em] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
						{codeContent.trim()}
					</code>
				</pre>
			);
		}

		// Handle inline code within non-block parts
		const inlineCodeRegex = /(`[^`]+`)/g;
		const inlineParts = part.split(inlineCodeRegex);

		return inlineParts.map((inlinePart) => {
			if (inlinePart.startsWith("`") && inlinePart.endsWith("`")) {
				return (
					<code
						key={`code-${inlinePart}`}
						className="mx-0.5 px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-700/80 font-mono text-[0.85em] text-foreground font-medium border border-zinc-300/50 dark:border-zinc-600/50"
					>
						{inlinePart.slice(1, -1)}
					</code>
				);
			}
			return (
				<Fragment key={`text-${inlinePart.slice(0, 30)}`}>
					{inlinePart}
				</Fragment>
			);
		});
	});
}

function RefLink({
	refValue,
	repoUrl,
}: {
	refValue: string;
	repoUrl?: string;
}) {
	// Check if this looks like a PR/issue number (numeric or starts with #)
	const numericRef = refValue.replace(/^#/, "");
	const isNumeric = /^\d+$/.test(numericRef);
	const displayRef = isNumeric ? `#${numericRef}` : refValue;

	if (isNumeric && repoUrl) {
		return (
			<a
				href={`https://github.com/${repoUrl}/pull/${numericRef}`}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
			>
				{displayRef}
				<ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
			</a>
		);
	}

	return (
		<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
			{displayRef}
		</span>
	);
}

function ChangeItemView({
	item,
	repoUrl,
}: {
	item: ChangeItem;
	repoUrl?: string;
}) {
	return (
		<div className="group flex items-start gap-3 py-1.5 px-3 -mx-3 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5">
			<div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40 group-hover:opacity-100 transition-all" />
			<div className="flex-1 min-w-0">
				<div className="text-sm leading-relaxed text-foreground/90 group-hover:text-foreground transition-colors break-words [overflow-wrap:anywhere]">
					{item.scope && (
						<span className="text-cyan-600 dark:text-cyan-400 font-mono text-xs mr-1.5">
							[{item.scope}]
						</span>
					)}
					{formatMessage(item.text)}
				</div>
				{item.refs && item.refs.length > 0 && (
					<div className="flex flex-wrap gap-2 mt-1">
						{item.refs.map((ref) => (
							<RefLink key={ref} refValue={ref} repoUrl={repoUrl} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// Hook for localStorage persistence of category collapse state
function useCategoryCollapseState(
	categoryId: string,
	defaultExpanded: boolean,
): [boolean, (expanded: boolean) => void] {
	const storageKey = `wnf-category-${categoryId}`;
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);

	useEffect(() => {
		// Only access localStorage on client side
		if (typeof window !== "undefined") {
			try {
				const stored = localStorage.getItem(storageKey);
				if (stored !== null) {
					setIsExpanded(stored === "true");
				}
			} catch {
				// localStorage unavailable (private mode, quota exceeded, disabled)
			}
		}
	}, [storageKey]);

	const setExpanded = (expanded: boolean) => {
		setIsExpanded(expanded);
		if (typeof window !== "undefined") {
			try {
				localStorage.setItem(storageKey, String(expanded));
			} catch {
				// localStorage unavailable
			}
		}
	};

	return [isExpanded, setExpanded];
}

function CollapsibleCategoryBlock({
	category,
	repoUrl,
	defaultExpanded = true,
}: {
	category: Category;
	repoUrl?: string;
	defaultExpanded?: boolean;
}) {
	const config = CATEGORY_CONFIG[category.id] || CATEGORY_CONFIG.other;
	const [isOpen, setIsOpen] = useCategoryCollapseState(
		category.id,
		defaultExpanded,
	);

	if (category.items.length === 0) return null;

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<div
				className={cn(
					"rounded-xl border overflow-hidden transition-all",
					config.bg,
					config.border,
				)}
			>
				<CollapsibleTrigger asChild>
					<button
						type="button"
						className={cn(
							"w-full px-4 py-3 flex items-center justify-between cursor-pointer transition-colors",
							"bg-white/50 dark:bg-black/20 hover:bg-white/70 dark:hover:bg-black/30",
							config.border,
							"border-b",
						)}
						aria-expanded={isOpen}
						aria-controls={`category-content-${category.id}`}
					>
						<div className="flex items-center gap-2.5">
							<ChevronDown
								className={cn(
									"h-4 w-4 shrink-0 transition-transform duration-200",
									config.color,
									!isOpen && "-rotate-90",
								)}
							/>
							<span className={cn(config.color)}>{config.icon}</span>
							<h4
								className={cn(
									"text-sm font-semibold tracking-wide",
									config.color,
								)}
							>
								{config.label}
							</h4>
						</div>
						<span
							className={cn(
								"text-xs font-medium px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20",
								config.color,
							)}
						>
							{category.items.length}
						</span>
					</button>
				</CollapsibleTrigger>

				<CollapsibleContent>
					<section
						id={`category-content-${category.id}`}
						aria-label={`${config.label} items`}
						className={cn("p-3 space-y-0.5", config.color)}
					>
						{category.items.map((item) => (
							<ChangeItemView
								key={`${item.text.slice(0, 50)}-${item.scope ?? ""}-${item.refs?.join(",") ?? ""}`}
								item={item}
								repoUrl={repoUrl}
							/>
						))}
					</section>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}

function sortCategories(categories: Category[]) {
	return [...categories].sort((a, b) => {
		const idxA = PRIORITY_ORDER.indexOf(a.id);
		const idxB = PRIORITY_ORDER.indexOf(b.id);
		return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
	});
}

function getTotalItemCount(categories: Category[]): number {
	return categories.reduce((sum, cat) => sum + cat.items.length, 0);
}

function getCategorySummary(
	categories: Category[],
): { id: string; count: number }[] {
	return sortCategories(categories)
		.filter((cat) => cat.items.length > 0)
		.slice(0, 4)
		.map((cat) => ({ id: cat.id, count: cat.items.length }));
}

function ConfidenceScore({ score }: { score: number }) {
	const percentage = Math.round(score * 100);
	let colorClass = "text-amber-600 dark:text-amber-500";

	if (score > 0.8) colorClass = "text-emerald-600 dark:text-emerald-500";
	else if (score < 0.5) colorClass = "text-rose-600 dark:text-rose-500";

	return (
		<div className={cn("text-xs font-mono font-medium", colorClass)}>
			{percentage}% CONFIDENCE
		</div>
	);
}

function CollapsiblePackage({
	pkg,
	index,
	defaultOpen = false,
	repoUrl,
}: {
	pkg: { name: string; releaseCount: number; categories: Category[] };
	index: number;
	defaultOpen?: boolean;
	repoUrl?: string;
}) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const sortedCategories = sortCategories(pkg.categories);
	const totalItems = getTotalItemCount(pkg.categories);
	const categorySummary = getCategorySummary(pkg.categories);

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.03 }}
		>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<div className="border rounded-xl overflow-hidden bg-card/50 shadow-sm">
					<CollapsibleTrigger asChild>
						<button
							type="button"
							className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
						>
							<div className="flex items-center gap-3 min-w-0">
								<ChevronRight
									className={cn(
										"h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
										isOpen && "rotate-90",
									)}
								/>
								<Box className="h-4 w-4 text-muted-foreground shrink-0" />
								<span className="font-semibold font-mono text-sm truncate">
									{pkg.name}
								</span>
							</div>
							<div className="flex items-center gap-3 shrink-0">
								{/* Category preview badges when collapsed */}
								{!isOpen && categorySummary.length > 0 && (
									<div className="hidden sm:flex items-center gap-1.5">
										{categorySummary.map(({ id, count }) => {
											const config =
												CATEGORY_CONFIG[id] || CATEGORY_CONFIG.other;
											return (
												<span
													key={id}
													className={cn(
														"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
														config.bg,
														config.color,
													)}
												>
													<span className="[&>svg]:h-3 [&>svg]:w-3">
														{config.icon}
													</span>
													{count}
												</span>
											);
										})}
									</div>
								)}
								<Badge variant="secondary" className="font-mono text-xs">
									{totalItems} {totalItems === 1 ? "change" : "changes"}
								</Badge>
							</div>
						</button>
					</CollapsibleTrigger>

					<CollapsibleContent>
						<AnimatePresence>
							{isOpen && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.2 }}
									className="border-t"
								>
									<div className="p-4 grid gap-4">
										{sortedCategories.map((category) => (
											<CollapsibleCategoryBlock
												key={category.id}
												category={category}
												repoUrl={repoUrl}
												defaultExpanded={
													HIGH_PRIORITY_CATEGORIES.includes(category.id) ||
													category.items.length <= 5
												}
											/>
										))}
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</CollapsibleContent>
				</div>
			</Collapsible>
		</motion.div>
	);
}

export function ChangelogViewer({ data }: ChangelogViewerProps) {
	const [expandAll, setExpandAll] = useState(false);

	if (isAggregated(data)) {
		const hasMultiplePackages = data.packages.length > 1;

		return (
			<div className="space-y-6">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
					<div className="min-w-0">
						<h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
							<PackageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
							<span className="truncate">{data.source.repo}</span>
						</h2>
						<p className="text-sm text-muted-foreground">
							{data.releaseCount} releases across {data.packages.length}{" "}
							packages
						</p>
					</div>
					<div className="flex items-center gap-3 shrink-0">
						{hasMultiplePackages && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setExpandAll(!expandAll)}
								className="text-xs"
							>
								{expandAll ? "Collapse All" : "Expand All"}
							</Button>
						)}
						<ConfidenceScore score={data.confidence} />
						<CopyButton value={formatMarkdown(data)} label="Markdown" />
						<CopyButton value={JSON.stringify(data, null, 2)} label="JSON" />
					</div>
				</div>

				<div className="grid gap-3">
					{data.packages.map((pkg, i) => (
						<CollapsiblePackage
							key={`${pkg.name}-${expandAll}`}
							pkg={pkg}
							index={i}
							defaultOpen={!hasMultiplePackages || expandAll || i === 0}
							repoUrl={data.source.repo}
						/>
					))}
				</div>
			</div>
		);
	}

	const sortedCategories = sortCategories(data.categories);

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className="space-y-8"
		>
			<div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div className="min-w-0">
					<h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1 truncate">
						{data.source.tag || data.version}
					</h2>
					<div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
						<a
							href={data.links.release}
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-foreground transition-colors flex items-center gap-1.5"
						>
							<PackageIcon className="h-4 w-4" />
							{data.source.repo}
						</a>
						<span className="text-border">•</span>
						<span className="flex items-center gap-1.5">
							<Calendar className="h-4 w-4" />
							{data.releasedAt
								? new Date(data.releasedAt).toLocaleDateString(undefined, {
										dateStyle: "long",
									})
								: "Unknown date"}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-3 shrink-0">
					<ConfidenceScore score={data.confidence} />
					<CopyButton value={formatMarkdown(data)} label="Markdown" />
					<CopyButton value={JSON.stringify(data, null, 2)} label="JSON" />
				</div>
			</div>

			{data.summary && (
				<div className="prose dark:prose-invert max-w-none">
					<p className="text-lg leading-relaxed text-muted-foreground border-l-4 border-primary/20 pl-4 py-1">
						{data.summary}
					</p>
				</div>
			)}

			<div className="grid grid-cols-1 gap-6">
				{sortedCategories.map((category) => (
					<CollapsibleCategoryBlock
						key={category.id}
						category={category}
						repoUrl={data.source.repo}
						defaultExpanded={
							HIGH_PRIORITY_CATEGORIES.includes(category.id) ||
							category.items.length <= 5
						}
					/>
				))}
			</div>
		</motion.div>
	);
}

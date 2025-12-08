"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, GitBranch, Loader2 } from "lucide-react";
import Image from "next/image";
import {
	parseAsArrayOf,
	parseAsBoolean,
	parseAsString,
	useQueryStates,
} from "nuqs";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChangelogSkeleton } from "@/components/changelog-skeleton";
import { ChangelogViewer } from "@/components/changelog-viewer";
import { RepoInput } from "@/components/repo-input";
import { SocialLinks } from "@/components/social-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnreleasedBanner } from "@/components/unreleased-banner";
import { UnreleasedInfo } from "@/components/unreleased-info";
import { cn } from "@/lib/utils";
import { type ChangelogResult, getChangelog } from "./actions";

// Date preset helpers
const formatDate = (date: Date) => date.toISOString().split("T")[0];

const DATE_PRESETS = [
	{ label: "Today", getValue: () => formatDate(new Date()) },
	{
		label: "This Week",
		getValue: () => {
			const d = new Date();
			d.setDate(d.getDate() - 7);
			return formatDate(d);
		},
	},
	{
		label: "This Month",
		getValue: () => {
			const d = new Date();
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
		},
	},
	{
		label: "Last Month",
		getValue: () => {
			const d = new Date();
			d.setMonth(d.getMonth() - 1);
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
		},
	},
	{
		label: "This Year",
		getValue: () => `${new Date().getFullYear()}-01-01`,
	},
];

const initialState: ChangelogResult = {
	success: false,
	error: "",
};

function SubmitButton({
	onPendingChange,
}: {
	onPendingChange?: (pending: boolean) => void;
}) {
	const { pending } = useFormStatus();
	const prevPending = useRef(pending);

	useEffect(() => {
		if (prevPending.current !== pending) {
			prevPending.current = pending;
			onPendingChange?.(pending);
		}
	}, [pending, onPendingChange]);

	return (
		<Button
			type="submit"
			disabled={pending}
			className="h-12 px-6 rounded-full font-medium transition-all"
		>
			{pending ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Generating
				</>
			) : (
				<>
					Generate
					<ArrowRight className="ml-2 h-4 w-4" />
				</>
			)}
		</Button>
	);
}

export function PageClient() {
	const [state, formAction] = useActionState(getChangelog, initialState);
	const [isExpanded, setIsExpanded] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const hasCheckedOptions = useRef(false);
	const formRef = useRef<HTMLFormElement>(null);
	const hasAutoSubmitted = useRef(false);

	// URL-synced form state using NUQS
	const [params, setParams] = useQueryStates(
		{
			repos: parseAsArrayOf(parseAsString, ",").withDefault([]),
			since: parseAsString.withDefault(""),
			until: parseAsString.withDefault(""),
			package: parseAsString.withDefault(""),
			options: parseAsBoolean.withDefault(false),
			unreleased: parseAsBoolean.withDefault(false),
		},
		{
			shallow: true, // Don't trigger server re-render
			history: "replace", // Don't pollute browser history
		},
	);

	const {
		repos,
		since,
		until,
		package: pkg,
		options: showOptions,
		unreleased,
	} = params;

	useEffect(() => {
		if (state.success) {
			setIsExpanded(true);
			setIsLoading(false);
		} else if (state.error) {
			setIsLoading(false);
		}
	}, [state]);

	// Auto-expand options panel if URL contains optional params (run once on mount)
	// Don't auto-expand if unreleased is set (unreleased mode doesn't need options)
	useEffect(() => {
		if (hasCheckedOptions.current) return;
		hasCheckedOptions.current = true;
		if ((since || until || pkg) && !showOptions && !unreleased) {
			setParams({ options: true });
		}
	}, [since, until, pkg, showOptions, unreleased, setParams]);

	// Auto-generate if URL has repos on first load (for shared links)
	useEffect(() => {
		if (repos.length > 0 && !hasAutoSubmitted.current && formRef.current) {
			hasAutoSubmitted.current = true;
			setIsLoading(true);
			setIsExpanded(true);
			// Small delay to ensure form is ready
			setTimeout(() => {
				formRef.current?.requestSubmit();
			}, 100);
		}
	}, [repos.length]);

	return (
		<div className="min-h-screen flex flex-col items-center bg-background text-foreground selection:bg-primary/10 relative">
			{/* Social Links */}
			<nav className="absolute top-4 right-[max(1rem,env(safe-area-inset-right))] sm:top-6 sm:right-[max(1.5rem,env(safe-area-inset-right))] z-30">
				<SocialLinks />
			</nav>

			<div
				className={cn(
					"w-full max-w-5xl transition-all duration-500 ease-in-out flex flex-col",
					"pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
					"sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]",
					isExpanded ? "pt-16 sm:pt-20" : "justify-center min-h-[80vh]",
				)}
			>
				{/* Header */}
				<motion.div
					layout
					className="flex flex-col items-center text-center mb-10"
				>
					<motion.h1
						layout="position"
						className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 flex items-center gap-3"
					>
						<Image
							src="/logo.png"
							alt=""
							width={120}
							height={56}
							className="dark:invert h-8 sm:h-10 md:h-12 w-auto"
							priority
						/>
						What's New?
					</motion.h1>

					<AnimatePresence>
						{!isExpanded && (
							<motion.p
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, height: 0, marginBottom: 0 }}
								className="text-lg text-muted-foreground max-w-md"
							>
								Generate beautiful, semantic changelogs for any GitHub
								repository.
							</motion.p>
						)}
					</AnimatePresence>
				</motion.div>

				{/* Search Form */}
				<motion.div layout className="w-full relative z-20 mb-12">
					<form ref={formRef} action={formAction} className="space-y-6">
						{/* Hidden inputs for form submission */}
						<input type="hidden" name="repos" value={repos.join(",")} />
						<input
							type="hidden"
							name="unreleased"
							value={unreleased ? "true" : ""}
						/>

						{/* Multi-repo input */}
						<RepoInput
							repos={repos}
							onReposChange={(newRepos) => setParams({ repos: newRepos })}
						/>

						{/* Mode Selection & Date Presets */}
						<div className="flex flex-wrap items-center justify-center gap-2 pt-2">
							{/* Unreleased Toggle */}
							<Button
								type="button"
								variant={unreleased ? "default" : "outline"}
								size="sm"
								onClick={() =>
									setParams({
										unreleased: !unreleased,
										since: "",
										until: "",
									})
								}
								className={cn(
									"text-xs h-7 px-3 gap-1.5",
									unreleased && "bg-primary text-primary-foreground",
								)}
							>
								<GitBranch className="h-3.5 w-3.5" />
								Unreleased
							</Button>

							<span className="text-muted-foreground/50 mx-1">|</span>

							<span className="text-xs text-muted-foreground mr-1">Since:</span>
							{DATE_PRESETS.map((preset) => (
								<Button
									key={preset.label}
									type="button"
									variant="outline"
									size="sm"
									onClick={() =>
										setParams({
											since: preset.getValue(),
											options: true,
											unreleased: false,
										})
									}
									className="text-xs h-7 px-3"
								>
									{preset.label}
								</Button>
							))}
						</div>

						<div className="flex flex-col items-center gap-4">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setParams({ options: !showOptions })}
								className="text-muted-foreground hover:text-foreground"
							>
								{showOptions ? "Hide Options" : "Show Options"}
								<ChevronDown
									className={cn(
										"ml-2 h-4 w-4 transition-transform",
										showOptions && "rotate-180",
									)}
								/>
							</Button>

							<AnimatePresence>
								{showOptions && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: "auto" }}
										exit={{ opacity: 0, height: 0 }}
										className="w-full overflow-hidden"
									>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-4 pt-2 pb-4">
											<div className="space-y-2">
												<label
													htmlFor="since-input"
													className="text-xs font-medium text-muted-foreground"
												>
													Since
												</label>
												<Input
													id="since-input"
													name="since"
													value={since}
													onChange={(e) => setParams({ since: e.target.value })}
													placeholder="v1.0.0"
													className="bg-muted/30"
												/>
											</div>
											<div className="space-y-2">
												<label
													htmlFor="until-input"
													className="text-xs font-medium text-muted-foreground"
												>
													Until
												</label>
												<Input
													id="until-input"
													name="until"
													value={until}
													onChange={(e) => setParams({ until: e.target.value })}
													placeholder="v2.0.0"
													className="bg-muted/30"
												/>
											</div>
											<div className="space-y-2">
												<label
													htmlFor="package-input"
													className="text-xs font-medium text-muted-foreground"
												>
													Package
												</label>
												<Input
													id="package-input"
													name="package"
													value={pkg}
													onChange={(e) =>
														setParams({ package: e.target.value })
													}
													placeholder="@scope/pkg"
													className="bg-muted/30"
												/>
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>

							<SubmitButton
								onPendingChange={(pending) => {
									if (pending) {
										setIsLoading(true);
										setIsExpanded(true);
									}
								}}
							/>
						</div>
					</form>

					{/* Error Message */}
					<AnimatePresence>
						{state.success === false && state.error && (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className="mt-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm text-center font-medium"
							>
								{state.error}
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>

				{/* Results Area */}
				<AnimatePresence mode="wait">
					{isLoading && (
						<motion.div
							key="skeleton"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 20 }}
							transition={{ duration: 0.3 }}
							className="w-full pb-20"
						>
							<ChangelogSkeleton />
						</motion.div>
					)}
					{!isLoading &&
						state.success &&
						state.data &&
						state.data.length > 0 && (
							<motion.div
								key="results"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 20 }}
								transition={{ delay: 0.1, duration: 0.4 }}
								className="w-full pb-20 space-y-8"
							>
								{state.data.map((repoData, index) => {
									const fallbackInfo = state.fallback?.find(
										(f) => f.repo === repoData.source.repo,
									);
									const unreleasedInfo = state.unreleased?.find(
										(u) => u.repo === repoData.source.repo,
									);

									return (
										<div
											key={repoData.source.repo}
											className={cn(index > 0 && "pt-8 border-t")}
										>
											{/* Show amber warning for auto-fallback */}
											{fallbackInfo && (
												<UnreleasedBanner
													repo={fallbackInfo.repo}
													reason={fallbackInfo.reason}
													commitCount={fallbackInfo.commitCount}
												/>
											)}
											{/* Show blue info for explicit unreleased request */}
											{unreleasedInfo && !fallbackInfo && (
												<UnreleasedInfo
													commitCount={unreleasedInfo.commitCount}
													baselineTag={unreleasedInfo.baselineTag}
												/>
											)}
											<ChangelogViewer data={repoData} />
										</div>
									);
								})}
							</motion.div>
						)}
				</AnimatePresence>
			</div>
		</div>
	);
}

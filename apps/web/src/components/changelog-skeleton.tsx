import { Skeleton } from "@/components/ui/skeleton";

export function ChangelogSkeleton() {
	return (
		<div className="w-full space-y-6 animate-in fade-in duration-300">
			{/* Header card skeleton */}
			<div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6">
				<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
					<div className="space-y-3 flex-1 min-w-0">
						<Skeleton className="h-7 w-32" />
						<div className="flex flex-wrap items-center gap-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-32" />
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-9 w-20" />
					</div>
				</div>
			</div>

			{/* Category blocks skeleton */}
			{[1, 2, 3].map((i) => (
				<div key={i} className="rounded-xl border overflow-hidden bg-muted/30">
					{/* Category header */}
					<div className="px-4 py-3 border-b bg-muted/50 flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<Skeleton className="h-4 w-4" />
							<Skeleton className="h-4 w-28" />
						</div>
						<Skeleton className="h-5 w-8 rounded-full" />
					</div>

					{/* Category items */}
					<div className="p-3 space-y-3">
						{[1, 2, 3].map((j) => (
							<div key={j} className="flex items-start gap-3 py-1.5 px-3">
								<Skeleton className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-full max-w-md" />
									<Skeleton className="h-3 w-16" />
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

import { Github } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

function XIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			className={className}
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	);
}

export function SocialLinks() {
	return (
		<div className="flex items-center gap-1">
			<ThemeToggle />
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="text-muted-foreground hover:text-foreground transition-colors"
						asChild
					>
						<a
							href="https://x.com/GustavoValverde"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Follow on X"
						>
							<XIcon className="h-4 w-4" />
						</a>
					</Button>
				</TooltipTrigger>
				<TooltipContent>Follow on X</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="text-muted-foreground hover:text-foreground transition-colors"
						asChild
					>
						<a
							href="https://github.com/gustavovalverde/whatsnew"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="View on GitHub"
						>
							<Github className="h-4 w-4" />
						</a>
					</Button>
				</TooltipTrigger>
				<TooltipContent>View on GitHub</TooltipContent>
			</Tooltip>
		</div>
	);
}

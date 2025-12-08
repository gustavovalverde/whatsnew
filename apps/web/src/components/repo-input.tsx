"use client";

import { Search, X } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RepoInputProps {
	repos: string[];
	onReposChange: (repos: string[]) => void;
	className?: string;
}

export function RepoInput({ repos, onReposChange, className }: RepoInputProps) {
	const [inputValue, setInputValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const addRepo = (value: string) => {
		const trimmed = value.trim().replace(/,$/, ""); // Remove trailing comma
		if (trimmed?.includes("/") && !repos.includes(trimmed)) {
			onReposChange([...repos, trimmed]);
		}
		setInputValue("");
	};

	const focusInput = () => inputRef.current?.focus();

	const removeRepo = (repo: string) => {
		onReposChange(repos.filter((r) => r !== repo));
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Tab" || e.key === "," || e.key === "Enter") {
			if (inputValue.trim()) {
				e.preventDefault();
				addRepo(inputValue);
			}
		}
		if (e.key === "Backspace" && !inputValue && repos.length > 0) {
			removeRepo(repos[repos.length - 1]);
		}
	};

	const handleChange = (value: string) => {
		// Auto-add on comma
		if (value.includes(",")) {
			const parts = value.split(",");
			const toAdd = parts.slice(0, -1).join(""); // Everything before last comma
			if (toAdd.trim()) {
				addRepo(toAdd);
			}
			setInputValue(parts[parts.length - 1]); // Keep text after comma
		} else {
			setInputValue(value);
		}
	};

	const handleBlur = () => {
		// Auto-add repo when focus leaves (e.g., clicking Generate button)
		if (inputValue.trim()) {
			addRepo(inputValue);
		}
	};

	return (
		<fieldset
			className={cn(
				"m-0 min-w-0", // Reset fieldset defaults
				"flex flex-wrap items-center gap-2 w-full rounded-xl border bg-background px-4 py-3.5 shadow-sm transition-all",
				"focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
				className,
			)}
			onClick={focusInput}
			onKeyDown={(e) => e.key === "Enter" && focusInput()}
			aria-label="Repository input"
		>
			<Search className="h-5 w-5 text-muted-foreground shrink-0" />

			{repos.map((repo) => (
				<Badge
					key={repo}
					variant="secondary"
					className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-sm font-medium"
				>
					{repo}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							removeRepo(repo);
						}}
						className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
						aria-label={`Remove ${repo}`}
					>
						<X className="h-3.5 w-3.5" />
					</button>
				</Badge>
			))}

			<input
				ref={inputRef}
				type="text"
				value={inputValue}
				onChange={(e) => handleChange(e.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
				placeholder={
					repos.length ? "Add another repo..." : "owner/repo (e.g. vercel/ai)"
				}
				className={cn(
					"flex-1 min-w-[200px] bg-transparent text-lg outline-none placeholder:text-muted-foreground",
					repos.length > 0 && "text-base",
				)}
				autoComplete="off"
				autoCorrect="off"
				spellCheck={false}
			/>
		</fieldset>
	);
}

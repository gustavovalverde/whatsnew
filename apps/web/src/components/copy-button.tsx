"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
	value: string;
	label: string;
	className?: string;
}

export function CopyButton({ value, label, className }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleCopy}
			className={cn("transition-all", className)}
		>
			{copied ? (
				<Check className="h-4 w-4 sm:mr-2 text-green-600" />
			) : (
				<Copy className="h-4 w-4 sm:mr-2" />
			)}
			<span className="hidden sm:inline">{copied ? "Copied!" : label}</span>
		</Button>
	);
}

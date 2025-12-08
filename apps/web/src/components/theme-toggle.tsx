"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const cycleTheme = () => {
		if (theme === "light") setTheme("dark");
		else if (theme === "dark") setTheme("system");
		else setTheme("light");
	};

	const getThemeLabel = () => {
		if (theme === "light") return "Light";
		if (theme === "dark") return "Dark";
		return "System";
	};

	const getIcon = () => {
		if (theme === "light") return <Sun className="h-4 w-4" />;
		if (theme === "dark") return <Moon className="h-4 w-4" />;
		return <Monitor className="h-4 w-4" />;
	};

	// Prevent hydration mismatch by rendering placeholder until mounted
	if (!mounted) {
		return (
			<Button
				variant="ghost"
				size="icon"
				className="text-muted-foreground hover:text-foreground transition-colors"
				disabled
			>
				<Sun className="h-4 w-4" />
			</Button>
		);
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={cycleTheme}
					className="text-muted-foreground hover:text-foreground transition-colors"
					aria-label={`Current theme: ${getThemeLabel()}. Click to switch.`}
				>
					{getIcon()}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{getThemeLabel()}</TooltipContent>
		</Tooltip>
	);
}

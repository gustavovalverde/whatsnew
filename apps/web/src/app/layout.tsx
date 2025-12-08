import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://whatsnew.sh";

export const metadata: Metadata = {
	title: "What's New - Changelog Intelligence",
	description:
		"Generate beautiful, semantic changelogs for any GitHub repository",
	metadataBase: new URL(siteUrl),
	openGraph: {
		title: "What's New - Changelog Intelligence",
		description:
			"Generate beautiful, semantic changelogs for any GitHub repository",
		url: siteUrl,
		siteName: "What's New",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "What's New - Changelog Intelligence",
			},
		],
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "What's New - Changelog Intelligence",
		description:
			"Generate beautiful, semantic changelogs for any GitHub repository",
		images: ["/og-image.png"],
	},
	icons: {
		icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
		apple: "/apple-touch-icon.png",
	},
	manifest: "/manifest.json",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
	],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<ThemeProvider>
					<TooltipProvider>
						<NuqsAdapter>{children}</NuqsAdapter>
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}

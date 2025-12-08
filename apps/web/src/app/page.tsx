import { Suspense } from "react";
import { PageClient } from "./page-client";

export default function Home() {
	return (
		<Suspense>
			<PageClient />
		</Suspense>
	);
}

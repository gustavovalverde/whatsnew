#!/usr/bin/env bun
import { main } from "../src/index.js";

main(process.argv.slice(2)).catch((error) => {
	console.error(error.message);
	process.exit(1);
});

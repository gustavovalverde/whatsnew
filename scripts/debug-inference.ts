import { extractConventionalCommitType, inferCategory } from "../packages/parsers/src/category-inferrer.js";

const testTexts = [
  "[#15865](https://github.com/nestjs/nest/pull/15865) fix(core): make get() throw for implicitly request-scoped trees",
  "[#15863](https://github.com/nestjs/nest/pull/15863) feat(common): add method options to @sse decorator",
  "[#15899](https://github.com/nestjs/nest/pull/15899) chore(deps): bump fastify from 5.6.1 to 5.6.2",
  "feat(agent): add experimental_download to ToolLoopAgent",
  "`core`",
  "Rami ([@JoeNutt](https://github.com/JoeNutt))",
];

console.log("Testing conventional commit extraction:\n");

for (const text of testTexts) {
  const type = extractConventionalCommitType(text);
  const inferred = inferCategory(text);
  console.log(`Text: "${text.slice(0, 70)}${text.length > 70 ? "..." : ""}"`);
  console.log(`  Extracted Type: ${type || "null"}`);
  console.log(`  Inferred: ${inferred.id} (${inferred.confidence}, ${inferred.reason})`);
  console.log();
}

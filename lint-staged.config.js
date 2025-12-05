module.exports = {
	"*.{js,ts,tsx}": ["biome check --write --no-errors-on-unmatched"],
	"*.{json,jsonc}": ["biome check --write --no-errors-on-unmatched"],
	"*.md": ["biome format --write --no-errors-on-unmatched"],
};

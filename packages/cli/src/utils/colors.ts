/**
 * NO_COLOR aware terminal colors
 * Respects the NO_COLOR environment variable standard
 * https://no-color.org/
 */

const noColor = process.env.NO_COLOR !== undefined || !process.stdout.isTTY;

// ANSI escape codes
const codes = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	gray: "\x1b[90m",
};

function wrap(code: string, text: string): string {
	if (noColor) return text;
	return `${code}${text}${codes.reset}`;
}

export const colors = {
	bold: (text: string) => wrap(codes.bold, text),
	dim: (text: string) => wrap(codes.dim, text),
	red: (text: string) => wrap(codes.red, text),
	green: (text: string) => wrap(codes.green, text),
	yellow: (text: string) => wrap(codes.yellow, text),
	blue: (text: string) => wrap(codes.blue, text),
	magenta: (text: string) => wrap(codes.magenta, text),
	cyan: (text: string) => wrap(codes.cyan, text),
	white: (text: string) => wrap(codes.white, text),
	gray: (text: string) => wrap(codes.gray, text),
};

// Box drawing characters
export const box = {
	topLeft: "┌",
	topRight: "┐",
	bottomLeft: "└",
	bottomRight: "┘",
	horizontal: "─",
	vertical: "│",
	teeRight: "├",
	teeLeft: "┤",
};

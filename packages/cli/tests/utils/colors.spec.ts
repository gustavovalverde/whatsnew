import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("colors", () => {
	describe("with NO_COLOR set", () => {
		beforeEach(() => {
			vi.stubEnv("NO_COLOR", "1");
			vi.resetModules();
		});

		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it("returns plain text when NO_COLOR is set", async () => {
			const { colors } = await import("../../src/utils/colors.js");

			expect(colors.red("hello")).toBe("hello");
			expect(colors.green("world")).toBe("world");
			expect(colors.bold("text")).toBe("text");
		});

		it("all color functions return plain text", async () => {
			const { colors } = await import("../../src/utils/colors.js");

			expect(colors.dim("test")).toBe("test");
			expect(colors.yellow("test")).toBe("test");
			expect(colors.blue("test")).toBe("test");
			expect(colors.magenta("test")).toBe("test");
			expect(colors.cyan("test")).toBe("test");
			expect(colors.white("test")).toBe("test");
			expect(colors.gray("test")).toBe("test");
		});
	});

	describe("box drawing characters", () => {
		it("exports box drawing constants", async () => {
			const { box } = await import("../../src/utils/colors.js");

			expect(box.topLeft).toBe("┌");
			expect(box.topRight).toBe("┐");
			expect(box.bottomLeft).toBe("└");
			expect(box.bottomRight).toBe("┘");
			expect(box.horizontal).toBe("─");
			expect(box.vertical).toBe("│");
			expect(box.teeRight).toBe("├");
			expect(box.teeLeft).toBe("┤");
		});
	});
});

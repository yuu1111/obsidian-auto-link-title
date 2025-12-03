/**
 * @fileoverview
 * Tests for URL regex patterns used in Auto Link Title plugin.
 * Run with: bun test
 */
import { describe, expect, test } from "bun:test";
import { DEFAULT_SETTINGS } from "../src/settings";

describe("URL Regex (regex)", () => {
	const regex = DEFAULT_SETTINGS.regex;

	describe("valid URLs", () => {
		test("basic http URL", () => {
			expect(regex.test("http://example.com")).toBe(true);
		});

		test("basic https URL", () => {
			expect(regex.test("https://example.com")).toBe(true);
		});

		test("URL with www subdomain", () => {
			expect(regex.test("https://www.example.com")).toBe(true);
		});

		test("URL with path", () => {
			expect(regex.test("https://example.com/path/to/page")).toBe(true);
		});

		test("URL with query parameters", () => {
			expect(regex.test("https://example.com/page?foo=bar&baz=qux")).toBe(true);
		});

		test("URL with fragment", () => {
			expect(regex.test("https://example.com/page#section")).toBe(true);
		});

		test("URL with multiple subdomains", () => {
			expect(regex.test("https://sub.domain.example.com")).toBe(true);
		});
	});

	describe("domains with hyphens", () => {
		test("hyphen in subdomain (www-cs-students)", () => {
			expect(regex.test("http://www-cs-students.stanford.edu/~amitp/")).toBe(true);
		});

		test("hyphen in domain name", () => {
			expect(regex.test("https://my-awesome-site.com")).toBe(true);
		});

		test("multiple hyphens in domain", () => {
			expect(regex.test("https://this-is-a-very-long-domain.example.com")).toBe(true);
		});

		test("hyphen in TLD subdomain", () => {
			expect(regex.test("https://co-op.example.org")).toBe(true);
		});
	});

	describe("invalid URLs", () => {
		test("missing protocol", () => {
			expect(regex.test("example.com")).toBe(false);
		});

		test("invalid protocol", () => {
			expect(regex.test("ftp://example.com")).toBe(false);
		});

		test("domain starting with hyphen", () => {
			expect(regex.test("https://-invalid.com")).toBe(false);
		});

		test("domain with only TLD", () => {
			expect(regex.test("https://com")).toBe(false);
		});

		test("empty string", () => {
			expect(regex.test("")).toBe(false);
		});

		test("plain text", () => {
			expect(regex.test("not a url")).toBe(false);
		});

		test("URL with spaces", () => {
			expect(regex.test("https://example .com")).toBe(false);
		});
	});

	describe("unsupported URLs (by design)", () => {
		test("URL with port (not supported)", () => {
			expect(regex.test("https://example.com:8080/path")).toBe(false);
		});
	});
});

describe("Line URL Regex (lineRegex)", () => {
	const lineRegex = DEFAULT_SETTINGS.lineRegex;

	test("finds single URL in text", () => {
		const text = "Check out https://example.com for more info";
		const matches = text.match(lineRegex);
		expect(matches).toEqual(["https://example.com"]);
	});

	test("finds multiple URLs in text", () => {
		const text = "Visit https://example.com and http://test.org";
		const matches = text.match(lineRegex);
		expect(matches).toEqual(["https://example.com", "http://test.org"]);
	});

	test("finds URL with hyphens in domain", () => {
		const text = "See http://www-cs-students.stanford.edu/~amitp/";
		const matches = text.match(lineRegex);
		expect(matches).toEqual(["http://www-cs-students.stanford.edu/~amitp/"]);
	});

	test("returns null for text without URLs", () => {
		const text = "No URLs here";
		const matches = text.match(lineRegex);
		expect(matches).toBe(null);
	});
});

describe("Markdown Link Regex (linkRegex)", () => {
	const linkRegex = DEFAULT_SETTINGS.linkRegex;

	test("matches markdown link format", () => {
		expect(linkRegex.test("[Title](https://example.com)")).toBe(true);
	});

	test("matches link with path", () => {
		expect(linkRegex.test("[Page](https://example.com/path)")).toBe(true);
	});

	test("matches link with hyphenated domain", () => {
		expect(linkRegex.test("[Stanford](http://www-cs-students.stanford.edu/)")).toBe(true);
	});

	test("extracts title and URL", () => {
		const match = "[My Title](https://example.com/page)".match(linkRegex);
		expect(match).not.toBe(null);
		expect(match![1]).toBe("My Title");
		expect(match![2]).toBe("https://example.com/page");
	});

	test("does not match plain URL", () => {
		expect(linkRegex.test("https://example.com")).toBe(false);
	});

	test("does not match incomplete markdown", () => {
		expect(linkRegex.test("[Title]")).toBe(false);
		expect(linkRegex.test("(https://example.com)")).toBe(false);
	});
});

describe("Image Regex (imageRegex)", () => {
	const imageRegex = DEFAULT_SETTINGS.imageRegex;

	test("matches common image extensions", () => {
		expect(imageRegex.test("image.png")).toBe(true);
		expect(imageRegex.test("image.jpg")).toBe(true);
		expect(imageRegex.test("image.jpeg")).toBe(true);
		expect(imageRegex.test("image.gif")).toBe(true);
		expect(imageRegex.test("image.webp")).toBe(true);
	});

	test("matches case insensitively", () => {
		expect(imageRegex.test("image.PNG")).toBe(true);
		expect(imageRegex.test("image.JPG")).toBe(true);
	});

	test("matches tiff variants", () => {
		expect(imageRegex.test("image.tif")).toBe(true);
		expect(imageRegex.test("image.tiff")).toBe(true);
	});

	test("does not match non-image extensions", () => {
		expect(imageRegex.test("document.pdf")).toBe(false);
		expect(imageRegex.test("page.html")).toBe(false);
		expect(imageRegex.test("script.js")).toBe(false);
	});
});

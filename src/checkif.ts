/**
 * @fileoverview
 * Utility class for checking URL and markdown link states.
 * Used to determine whether to auto-fetch titles when pasting.
 */
import type { Editor } from "obsidian";
import { DEFAULT_SETTINGS } from "./settings";

/**
 * Strips angle brackets from autolink format URLs
 * @param text - Text that may be in `<URL>` format
 * @returns URL without angle brackets, or original text if not autolink
 */
export function stripAngleBrackets(text: string): string {
	const trimmed = text.trim();
	if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
		return trimmed.slice(1, -1);
	}
	return text;
}

/**
 * Utility class for URL and link state checking
 */
export class CheckIf {
	/**
	 * Checks if the cursor is already inside a markdown link syntax
	 * @param editor - Obsidian editor instance
	 * @returns true if the two characters before cursor are `](`
	 * @example
	 * // [title](|) ← If cursor is at |, returns true
	 */
	public static isMarkdownLinkAlready(editor: Editor): boolean {
		const cursor = editor.getCursor();

		const titleEnd = editor.getRange(
			{ ch: cursor.ch - 2, line: cursor.line },
			{ ch: cursor.ch, line: cursor.line },
		);

		return titleEnd === "](";
	}

	/**
	 * Checks if the cursor is immediately after a quote character.
	 * Used to detect pasting inside HTML attributes (e.g., href="...")
	 * @param editor - Obsidian editor instance
	 * @returns true if the character before cursor is `"` or `'`
	 * @example
	 * // href="|" ← If cursor is at |, returns true
	 */
	public static isAfterQuote(editor: Editor): boolean {
		const cursor = editor.getCursor();

		const beforeChar = editor.getRange(
			{ ch: cursor.ch - 1, line: cursor.line },
			{ ch: cursor.ch, line: cursor.line },
		);

		return beforeChar === '"' || beforeChar === "'";
	}

	/**
	 * Checks if the text is a valid URL format
	 * @param text - Text to check
	 * @returns true if text matches URL pattern
	 */
	public static isUrl(text: string): boolean {
		const urlRegex = new RegExp(DEFAULT_SETTINGS.regex);
		return urlRegex.test(text);
	}

	/**
	 * Checks if the text is an image URL
	 * @param text - Text to check
	 * @returns true if URL has an image extension
	 */
	public static isImage(text: string): boolean {
		const imageRegex = new RegExp(DEFAULT_SETTINGS.imageRegex);
		return imageRegex.test(text);
	}

	/**
	 * Checks if the text is in markdown link format
	 * @param text - Text to check
	 * @returns true if text matches `[title](url)` format
	 */
	public static isLinkedUrl(text: string): boolean {
		const urlRegex = new RegExp(DEFAULT_SETTINGS.linkRegex);
		return urlRegex.test(text);
	}

	/**
	 * Checks if the cursor is inside inline code (backticks) or a code block
	 * @param editor - Obsidian editor instance
	 * @returns true if cursor is inside code formatting
	 */
	public static isInsideCode(editor: Editor): boolean {
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);

		// Check for inline code: count backticks before cursor
		const textBeforeCursor = line.substring(0, cursor.ch);
		const backticksBeforeCursor = (textBeforeCursor.match(/`/g) || []).length;

		// If odd number of backticks before cursor, we're inside inline code
		if (backticksBeforeCursor % 2 === 1) {
			return true;
		}

		// Check for code block: look for ``` above without closing ```
		const content = editor.getValue();
		const lines = content.split("\n");
		let inCodeBlock = false;

		for (let i = 0; i < cursor.line; i++) {
			const trimmed = lines[i].trim();
			if (trimmed.startsWith("```")) {
				inCodeBlock = !inCodeBlock;
			}
		}

		// Check if current line starts a code block
		if (lines[cursor.line].trim().startsWith("```")) {
			return true;
		}

		return inCodeBlock;
	}

	/**
	 * Checks if the URL is a Twitter/X URL
	 * @param url - URL to check
	 * @returns true if URL is from twitter.com or x.com
	 */
	public static isTwitterUrl(url: string): boolean {
		try {
			const hostname = new URL(url).hostname.toLowerCase();
			return (
				hostname === "twitter.com" ||
				hostname === "www.twitter.com" ||
				hostname === "x.com" ||
				hostname === "www.x.com"
			);
		} catch {
			return false;
		}
	}

	/**
	 * Converts a Twitter/X URL to proxy URL for scraping
	 * twitter.com → fxtwitter.com, x.com → fixupx.com
	 * @param url - Original Twitter/X URL
	 * @returns Proxy URL or original URL if not Twitter
	 */
	public static toTwitterProxyUrl(url: string): string {
		if (!CheckIf.isTwitterUrl(url)) return url;
		try {
			const urlObj = new URL(url);
			const hostname = urlObj.hostname.toLowerCase();

			// twitter.com → fxtwitter.com
			if (hostname === "twitter.com" || hostname === "www.twitter.com") {
				urlObj.hostname = "fxtwitter.com";
			}
			// x.com → fixupx.com
			else if (hostname === "x.com" || hostname === "www.x.com") {
				urlObj.hostname = "fixupx.com";
			}

			return urlObj.toString();
		} catch {
			return url;
		}
	}
}

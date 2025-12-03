/**
 * @fileoverview
 * Markdown text processing utilities.
 */
import { DEFAULT_SETTINGS } from "../settings";

/**
 * Escapes markdown special characters in text
 * @param text - Text to escape
 * @returns Escaped text safe for use in markdown
 */
export function escapeMarkdown(text: string): string {
	const unescaped = text.replace(/\\(\*|_|`|~|\\|\[|\])/g, "$1"); // unescape any "backslashed" character
	const escaped = unescaped.replace(/(\*|_|`|\||<|>|~|\\|\[|\])/g, "\\$1"); // escape *, _, `, ~, \, |, [, ], <, and >
	return escaped;
}

/**
 * Truncates title to maximum length if configured
 * @param title - Title to potentially shorten
 * @param maxLength - Maximum length (0 = no limit)
 * @returns Original or truncated title with ellipsis
 */
export function shortTitle(title: string, maxLength: number): string {
	if (maxLength === 0) {
		return title;
	}
	if (title.length < maxLength + 3) {
		return title;
	}
	return `${title.slice(0, maxLength)}...`;
}

/**
 * Extracts URL from a markdown link format
 * @param link - Markdown link string `[title](url)`
 * @returns Extracted URL or empty string
 */
export function getUrlFromLink(link: string): string {
	const urlRegex = new RegExp(DEFAULT_SETTINGS.linkRegex);
	const match = urlRegex.exec(link);
	return match?.[2] ?? "";
}

/**
 * @fileoverview
 * Common utilities shared between HTTP and Electron scrapers.
 */
import { CheckIf } from "../checkif";

/**
 * Checks if a string is blank (undefined, null, or empty)
 * @param text - Text to check
 * @returns true if text is blank
 */
export function blank(text: string): boolean {
	return text === undefined || text === null || text === "";
}

/**
 * Checks if a string is not blank
 * @param text - Text to check
 * @returns true if text is not blank
 */
export function notBlank(text: string): boolean {
	return !blank(text);
}

/**
 * Extracts og:title meta tag content from a document
 * @param doc - Parsed HTML document
 * @returns og:title content or empty string if not found
 */
export function getOgTitle(doc: Document): string {
	const ogTitle = doc.querySelector('meta[property="og:title"]');
	return ogTitle?.getAttribute("content") ?? "";
}

/**
 * Extracts the final segment from a URL path (typically the filename)
 * @param url - URL to parse
 * @returns Final path segment or "File" as fallback
 */
export function getUrlFinalSegment(url: string): string {
	try {
		const segments = new URL(url).pathname.split("/");
		const last = segments.pop() || segments.pop(); // Handle potential trailing slash
		return last ?? "File";
	} catch (_) {
		return "File";
	}
}

/**
 * Prepares URL and headers for Twitter/X scraping via fxtwitter.com
 * @param url - Original URL
 * @returns Object with scrape URL and headers
 */
export function prepareTwitterScrape(url: string): {
	scrapeUrl: string;
	headers: Record<string, string>;
} {
	const scrapeUrl = CheckIf.isTwitterUrl(url)
		? CheckIf.toFxTwitterUrl(url)
		: url;

	const headers: Record<string, string> = {};
	if (CheckIf.isTwitterUrl(url)) {
		headers["User-Agent"] =
			"Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
	}

	return { scrapeUrl, headers };
}

/**
 * Normalizes URL by adding https:// if missing
 * @param url - URL to normalize
 * @returns URL with protocol
 */
export function normalizeUrl(url: string): string {
	if (!(url.startsWith("http") || url.startsWith("https"))) {
		return `https://${url}`;
	}
	return url;
}

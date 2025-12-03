/**
 * @fileoverview
 * Web scraper for fetching page titles using Obsidian's requestUrl API.
 * This is the mobile-compatible scraper that works without Electron.
 */
import { requestUrl } from "obsidian";
import { CheckIf } from "./checkif";

/**
 * Checks if a string is blank (undefined, null, or empty)
 * @param text - Text to check
 * @returns true if text is blank
 */
function blank(text: string): boolean {
	return text === undefined || text === null || text === "";
}

/**
 * Checks if a string is not blank
 * @param text - Text to check
 * @returns true if text is not blank
 */
function notBlank(text: string): boolean {
	return !blank(text);
}

/**
 * Extracts og:title meta tag content from a document
 * @param doc - Parsed HTML document
 * @returns og:title content or empty string if not found
 */
function getOgTitle(doc: Document): string {
	const ogTitle = doc.querySelector('meta[property="og:title"]');
	return ogTitle?.getAttribute("content") ?? "";
}

/**
 * Scrapes the title from a given URL
 * @param url - URL to scrape
 * @returns Page title, URL as fallback, or empty string on error
 */
async function scrape(url: string): Promise<string> {
	try {
		// For Twitter/X URLs, use fxtwitter.com to get proper titles
		const scrapeUrl = CheckIf.isTwitterUrl(url) ? CheckIf.toFxTwitterUrl(url) : url;

		// Use bot User-Agent for fxtwitter to get OG tags instead of redirect
		const headers: Record<string, string> = {};
		if (CheckIf.isTwitterUrl(url)) {
			headers["User-Agent"] = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
		}

		const response = await requestUrl({ url: scrapeUrl, headers });
		const contentType = response.headers["content-type"];
		if (!contentType?.includes("text/html")) return getUrlFinalSegment(url);
		const html = response.text;

		const doc = new DOMParser().parseFromString(html, "text/html");

		// Try og:title first (works better for Twitter/fxtwitter)
		const ogTitle = getOgTitle(doc);
		if (notBlank(ogTitle)) {
			return ogTitle;
		}

		const title = doc.querySelector("title");

		if (blank(title?.innerText ?? "")) {
			// If site is javascript based and has a no-title attribute when unloaded, use it.
			const noTitle = title?.getAttr("no-title");
			if (noTitle && notBlank(noTitle)) {
				return noTitle;
			}

			// Otherwise if the site has no title/requires javascript simply return Title Unknown
			return url;
		}

		return title?.innerText ?? url;
	} catch (ex) {
		console.error(ex);
		return "";
	}
}

/**
 * Extracts the final segment from a URL path (typically the filename)
 * @param url - URL to parse
 * @returns Final path segment or "File" as fallback
 */
function getUrlFinalSegment(url: string): string {
	try {
		const segments = new URL(url).pathname.split("/");
		const last = segments.pop() || segments.pop(); // Handle potential trailing slash
		return last ?? "File";
	} catch (_) {
		return "File";
	}
}

/**
 * Fetches the page title for a given URL
 * @param url - URL to fetch title from (http/https prefix added if missing)
 * @returns Page title or empty string on error
 */
export default async function getPageTitle(url: string) {
	if (!(url.startsWith("http") || url.startsWith("https"))) {
		url = `https://${url}`;
	}

	return scrape(url);
}

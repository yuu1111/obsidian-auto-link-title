/**
 * @fileoverview
 * Web scraper for fetching page titles using Obsidian's requestUrl API.
 * This is the mobile-compatible scraper that works without Electron.
 */
import { requestUrl } from "obsidian";

import {
	blank,
	getOgTitle,
	getUrlFinalSegment,
	normalizeUrl,
	notBlank,
	prepareTwitterScrape,
} from "./common";

/**
 * Scrapes the title from a given URL using HTTP request
 * @param url - URL to scrape
 * @param useTwitterProxy - Whether to use Twitter proxy for scraping
 * @returns Page title, URL as fallback, or empty string on error
 */
async function scrape(url: string, useTwitterProxy: boolean): Promise<string> {
	try {
		const { scrapeUrl, headers } = prepareTwitterScrape(url, useTwitterProxy);

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
 * Fetches the page title for a given URL using HTTP request
 * @param url - URL to fetch title from (http/https prefix added if missing)
 * @param useTwitterProxy - Whether to use Twitter proxy for scraping
 * @returns Page title or empty string on error
 */
export default async function getPageTitle(url: string, useTwitterProxy: boolean): Promise<string> {
	return scrape(normalizeUrl(url), useTwitterProxy);
}

/**
 * @fileoverview
 * Title fetching utilities for retrieving page titles from URLs.
 * Supports LinkPreview API and fallback scrapers.
 */
import { i18n } from "./lang/i18n";
import getElectronPageTitle from "./scraper/electron";
import getPageTitle from "./scraper/http";

/** Settings required for title fetching */
export interface TitleFetcherSettings {
	linkPreviewApiKey: string;
	useNewScraper: boolean;
	useTwitterProxy: boolean;
}

/**
 * Checks if a LinkPreview API key is configured and valid
 * @param apiKey - API key to check
 * @returns true if API key is valid (32 characters)
 */
function isValidApiKey(apiKey: string): boolean {
	return apiKey.length === 32;
}

/**
 * Fetches page title using LinkPreview.net API
 * @param url - URL to fetch title for
 * @param apiKey - LinkPreview API key (must be 32 characters)
 * @returns Page title or empty string if not configured/error
 */
export async function fetchUrlTitleViaLinkPreview(url: string, apiKey: string): Promise<string> {
	// Skip if no API key configured
	if (!apiKey || apiKey.length === 0) {
		return "";
	}

	// Warn if API key is set but invalid
	if (!isValidApiKey(apiKey)) {
		console.error("LinkPreview API key is not 32 characters long, please check your settings");
		return "";
	}

	try {
		const apiEndpoint = `https://api.linkpreview.net/?q=${encodeURIComponent(url)}`;
		const response = await fetch(apiEndpoint, {
			headers: {
				"X-Linkpreview-Api-Key": apiKey,
			},
		});
		const data = await response.json();
		return data.title;
	} catch (error) {
		console.error(error);
		return "";
	}
}

/**
 * Fetches page title, trying LinkPreview API first then falling back to scraper
 * @param url - URL to fetch title for
 * @param settings - Title fetcher settings
 * @returns Page title or error message
 */
export async function fetchUrlTitle(url: string, settings: TitleFetcherSettings): Promise<string> {
	try {
		let title = "";

		// Try LinkPreview API if configured
		if (settings.linkPreviewApiKey) {
			title = await fetchUrlTitleViaLinkPreview(url, settings.linkPreviewApiKey);
			if (title) {
				return title.replace(/(\r\n|\n|\r)/gm, "").trim();
			}
		}

		// Fall back to scraper
		if (settings.useNewScraper) {
			title = await getPageTitle(url, settings.useTwitterProxy);
		} else {
			title = await getElectronPageTitle(url, settings.useTwitterProxy);
		}

		title = title.replace(/(\r\n|\n|\r)/gm, "").trim() || i18n.notices.titleUnavailable;
		return title;
	} catch (error) {
		console.error(error);
		return i18n.notices.errorFetching;
	}
}

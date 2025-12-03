/**
 * @fileoverview
 * Electron-based web scraper for fetching page titles.
 * Uses Electron's BrowserWindow for JavaScript-rendered pages (desktop only).
 * Falls back to simple HTTP request when Electron is not available.
 */
const electronPkg = require("electron");

import { request } from "obsidian";
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
 * Async wrapper to load a URL in a BrowserWindow and wait for completion
 * @param window - Electron BrowserWindow instance
 * @param url - URL to load
 * @returns Promise that resolves on load finish or rejects on failure
 */
async function load(window: any, url: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		window.webContents.on("did-finish-load", (event: any) => resolve(event));
		window.webContents.on("did-fail-load", (event: any) => reject(event));
		window.loadURL(url);
	});
}

/**
 * Fetches page title using Electron's BrowserWindow (handles JS-rendered pages)
 * @param url - URL to fetch title from
 * @returns Page title, URL as fallback, or empty string on error
 */
async function electronGetPageTitle(url: string): Promise<string> {
	const { remote } = electronPkg;
	const { BrowserWindow } = remote;

	try {
		const window = new BrowserWindow({
			width: 1000,
			height: 600,
			webPreferences: {
				webSecurity: false,
				nodeIntegration: true,
				images: false,
			},
			show: false,
		});
		window.webContents.setAudioMuted(true);

		window.webContents.on("will-navigate", (event: any, newUrl: any) => {
			event.preventDefault();
			window.loadURL(newUrl);
		});

		await load(window, url);

		try {
			const title = window.webContents.getTitle();
			window.destroy();

			if (notBlank(title)) {
				return title;
			} else {
				return url;
			}
		} catch (_ex) {
			window.destroy();
			return url;
		}
	} catch (ex) {
		console.error(ex);
		return "";
	}
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
 * Fetches page title using simple HTTP request (fallback for non-Electron)
 * @param url - URL to fetch title from
 * @returns Page title, URL as fallback, or empty string on error
 */
async function nonElectronGetPageTitle(url: string): Promise<string> {
	try {
		// For Twitter/X URLs, use fxtwitter.com to get proper titles
		const scrapeUrl = CheckIf.isTwitterUrl(url) ? CheckIf.toFxTwitterUrl(url) : url;

		// Use bot User-Agent for fxtwitter to get OG tags instead of redirect
		const headers: Record<string, string> = {};
		if (CheckIf.isTwitterUrl(url)) {
			headers["User-Agent"] = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
		}

		const html = await request({ url: scrapeUrl, headers });

		const doc = new DOMParser().parseFromString(html, "text/html");

		// Try og:title first (works better for Twitter/fxtwitter)
		const ogTitle = getOgTitle(doc);
		if (notBlank(ogTitle)) {
			return ogTitle;
		}

		const title = doc.querySelectorAll("title")[0];

		if (title == null || blank(title?.innerText ?? "")) {
			// If site is javascript based and has a no-title attribute when unloaded, use it.
			const noTitle = title?.getAttr("no-title");
			if (noTitle && notBlank(noTitle)) {
				return noTitle;
			}

			// Otherwise if the site has no title/requires javascript simply return Title Unknown
			return url;
		}

		return title.innerText;
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
 * Attempts to determine the file type via HEAD request
 * @param url - URL to check
 * @returns File name for non-HTML, "Site Unreachable" on error, or null for HTML pages
 */
async function tryGetFileType(url: string) {
	try {
		const response = await fetch(url, { method: "HEAD" });

		// Ensure site returns an ok status code before scraping
		if (!response.ok) {
			return "Site Unreachable";
		}

		// Ensure site is an actual HTML page and not a pdf or 3 gigabyte video file.
		const contentType = response.headers.get("content-type");
		if (!contentType?.includes("text/html")) {
			return getUrlFinalSegment(url);
		}
		return null;
	} catch (_err) {
		return null;
	}
}

/**
 * Fetches page title, using Electron if available, otherwise falls back to HTTP
 * @param url - URL to fetch title from (http/https prefix added if missing)
 * @returns Page title, file name for non-HTML, or error message
 */
export default async function getPageTitle(url: string): Promise<string> {
	// If we're on Desktop use the Electron scraper
	if (!(url.startsWith("http") || url.startsWith("https"))) {
		url = `https://${url}`;
	}

	// For Twitter/X URLs, always use HTTP request with fxtwitter (BrowserWindow won't work well)
	if (CheckIf.isTwitterUrl(url)) {
		return nonElectronGetPageTitle(url);
	}

	// Try to do a HEAD request to see if the site is reachable and if it's an HTML page
	// If we error out due to CORS, we'll just try to scrape the page anyway.
	const fileType = await tryGetFileType(url);
	if (fileType) {
		return fileType;
	}

	if (electronPkg != null) {
		return electronGetPageTitle(url);
	} else {
		return nonElectronGetPageTitle(url);
	}
}

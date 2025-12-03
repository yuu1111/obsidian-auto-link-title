/**
 * @fileoverview
 * Electron-based web scraper for fetching page titles.
 * Uses Electron's BrowserWindow for JavaScript-rendered pages (desktop only).
 * Falls back to simple HTTP request when Electron is not available.
 */
const electronPkg = require("electron");

import { request } from "obsidian";
import { CheckIf } from "../checkif";

import {
	blank,
	getOgTitle,
	getUrlFinalSegment,
	normalizeUrl,
	notBlank,
	prepareTwitterScrape,
} from "./common";

/** Default timeout for page loading (10 seconds) */
const LOAD_TIMEOUT_MS = 10000;

/**
 * Async wrapper to load a URL in a BrowserWindow with timeout
 * @param window - Electron BrowserWindow instance
 * @param url - URL to load
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that resolves on load finish, rejects on failure or timeout
 */
async function load(window: any, url: string, timeoutMs: number = LOAD_TIMEOUT_MS): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		let resolved = false;

		const cleanup = () => {
			resolved = true;
			window.webContents.removeListener("did-finish-load", onFinish);
			window.webContents.removeListener("did-fail-load", onFail);
		};

		const onFinish = () => {
			if (!resolved) {
				cleanup();
				resolve();
			}
		};

		const onFail = (event: any) => {
			if (!resolved) {
				cleanup();
				reject(event);
			}
		};

		// Timeout to prevent infinite loading
		setTimeout(() => {
			if (!resolved) {
				cleanup();
				resolve(); // Resolve anyway, we'll try to get whatever title is available
			}
		}, timeoutMs);

		window.webContents.on("did-finish-load", onFinish);
		window.webContents.on("did-fail-load", onFail);
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

	let window: any = null;
	try {
		window = new BrowserWindow({
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

		// Stop all redirects to prevent infinite loading
		window.webContents.on("will-navigate", (event: any) => {
			event.preventDefault();
		});

		// Stop new window creation
		window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

		await load(window, url);

		const title = window.webContents.getTitle();
		window.destroy();
		window = null;

		return notBlank(title) ? title : url;
	} catch (ex) {
		console.error(ex);
		return "";
	} finally {
		// Ensure window is always destroyed
		if (window && !window.isDestroyed()) {
			window.destroy();
		}
	}
}

/**
 * Fetches page title using simple HTTP request (fallback for non-Electron)
 * @param url - URL to fetch title from
 * @param useTwitterProxy - Whether to use Twitter proxy for scraping
 * @returns Page title, URL as fallback, or empty string on error
 */
async function nonElectronGetPageTitle(url: string, useTwitterProxy: boolean): Promise<string> {
	try {
		const { scrapeUrl, headers } = prepareTwitterScrape(url, useTwitterProxy);

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

/** Default timeout for HEAD request (5 seconds) */
const HEAD_TIMEOUT_MS = 5000;

/**
 * Attempts to determine the file type via HEAD request
 * @param url - URL to check
 * @returns File name for non-HTML, "Site Unreachable" on error, or null for HTML pages
 */
async function tryGetFileType(url: string) {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);

		try {
			const response = await fetch(url, {
				method: "HEAD",
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

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
		} finally {
			clearTimeout(timeoutId);
		}
	} catch (_err) {
		return null;
	}
}

/**
 * Fetches page title, using Electron if available, otherwise falls back to HTTP
 * @param url - URL to fetch title from (http/https prefix added if missing)
 * @param useTwitterProxy - Whether to use Twitter proxy for scraping
 * @returns Page title, file name for non-HTML, or error message
 */
export default async function getPageTitle(url: string, useTwitterProxy: boolean): Promise<string> {
	url = normalizeUrl(url);

	// For Twitter/X URLs, use HTTP request with proxy if enabled (BrowserWindow won't work well)
	if (CheckIf.isTwitterUrl(url)) {
		return nonElectronGetPageTitle(url, useTwitterProxy);
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
		return nonElectronGetPageTitle(url, useTwitterProxy);
	}
}

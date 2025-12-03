/**
 * @fileoverview
 * Main plugin file for Auto Link Title.
 * Automatically fetches and inserts titles when pasting or dropping URLs.
 */
import { type Editor, Notice, Plugin } from "obsidian";
import { CheckIf } from "./checkif";
import { EditorExtensions } from "./editor-enhancements";
import { i18n } from "./lang/i18n";
import getElectronPageTitle from "./scraper/electron";
import getPageTitle from "./scraper/http";
import { type AutoLinkTitleSettings, AutoLinkTitleSettingTab, DEFAULT_SETTINGS } from "./settings";

/** Event handler type for paste events */
type PasteFunction = (this: HTMLElement, ev: ClipboardEvent) => void;

/** Event handler type for drop events */
type DropFunction = (this: HTMLElement, ev: DragEvent) => void;

/**
 * Main plugin class for Auto Link Title
 * Handles URL paste/drop events and fetches page titles automatically
 */
export default class AutoLinkTitle extends Plugin {
	settings: AutoLinkTitleSettings;
	pasteFunction: PasteFunction;
	dropFunction: DropFunction;
	blacklist: Array<string>;

	async onload() {
		console.log("loading obsidian-auto-link-title");
		await this.loadSettings();

		this.blacklist = this.settings.websiteBlacklist
			.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		// Listen to paste event
		this.pasteFunction = this.pasteUrlWithTitle.bind(this);

		// Listen to drop event
		this.dropFunction = this.dropUrlWithTitle.bind(this);

		this.addCommand({
			id: "auto-link-title-paste",
			name: i18n.commands.pasteUrl,
			editorCallback: (editor) => this.manualPasteUrlWithTitle(editor),
			hotkeys: [],
		});

		this.addCommand({
			id: "auto-link-title-normal-paste",
			name: i18n.commands.normalPaste,
			editorCallback: (editor) => this.normalPaste(editor),
			hotkeys: [
				{
					modifiers: ["Mod", "Shift"],
					key: "v",
				},
			],
		});

		this.registerEvent(this.app.workspace.on("editor-paste", this.pasteFunction));

		this.registerEvent(this.app.workspace.on("editor-drop", this.dropFunction));

		this.addCommand({
			id: "enhance-url-with-title",
			name: i18n.commands.enhanceUrl,
			editorCallback: (editor) => this.addTitleToLink(editor),
			hotkeys: [
				{
					modifiers: ["Mod", "Shift"],
					key: "e",
				},
			],
		});

		this.addSettingTab(new AutoLinkTitleSettingTab(this.app, this));
	}

	/**
	 * Adds a title to an existing URL or markdown link at cursor position
	 * @param editor - Obsidian editor instance
	 */
	addTitleToLink(editor: Editor): void {
		// Only attempt fetch if online

		const selectedText = (EditorExtensions.getSelectedText(editor) || "").trim();

		// If the cursor is on a raw html link, convert to a markdown link and fetch title
		if (CheckIf.isUrl(selectedText)) {
			this.convertUrlToTitledLink(editor, selectedText);
		}

		if (!navigator.onLine) {
			new Notice(i18n.notices.noInternet);
			return;
		}

		// If the cursor is on the URL part of a markdown link, fetch title and replace existing link title
		else if (CheckIf.isLinkedUrl(selectedText)) {
			const link = this.getUrlFromLink(selectedText);
			this.convertUrlToTitledLink(editor, link);
		}
	}

	/**
	 * Performs a normal paste without title fetching
	 * @param editor - Obsidian editor instance
	 */
	async normalPaste(editor: Editor): Promise<void> {
		const clipboardText = await navigator.clipboard.readText();
		if (clipboardText === null || clipboardText === "") return;

		editor.replaceSelection(clipboardText);
	}

	/**
	 * Manually triggered paste that fetches title for URLs
	 * Simulates standard paste using editor.replaceSelection since we can't dispatch a paste event
	 * @param editor - Obsidian editor instance
	 */
	async manualPasteUrlWithTitle(editor: Editor): Promise<void> {
		const clipboardText = await navigator.clipboard.readText();

		// Only attempt fetch if online
		if (!navigator.onLine) {
			editor.replaceSelection(clipboardText);
			new Notice(i18n.notices.noInternet);
			return;
		}

		if (clipboardText == null || clipboardText === "") return;

		// If its not a URL, we return false to allow the default paste handler to take care of it.
		// Similarly, image urls don't have a meaningful <title> attribute so downloading it
		// to fetch the title is a waste of bandwidth.
		if (!CheckIf.isUrl(clipboardText) || CheckIf.isImage(clipboardText)) {
			editor.replaceSelection(clipboardText);
			return;
		}

		// If it looks like we're pasting the url into a markdown link already, don't fetch title
		// as the user has already probably put a meaningful title, also it would lead to the title
		// being inside the link.
		if (CheckIf.isMarkdownLinkAlready(editor) || CheckIf.isAfterQuote(editor)) {
			editor.replaceSelection(clipboardText);
			return;
		}

		// If url is pasted over selected text and setting is enabled, no need to fetch title,
		// just insert a link
		const selectedText = (EditorExtensions.getSelectedText(editor) || "").trim();
		if (selectedText && this.settings.shouldPreserveSelectionAsTitle) {
			editor.replaceSelection(`[${selectedText}](${clipboardText})`);
			return;
		}

		// At this point we're just pasting a link in a normal fashion, fetch its title.
		this.convertUrlToTitledLink(editor, clipboardText);
		return;
	}

	/**
	 * Handles paste events to automatically fetch titles for URLs
	 * @param clipboard - Clipboard event from paste action
	 * @param editor - Obsidian editor instance
	 */
	async pasteUrlWithTitle(clipboard: ClipboardEvent, editor: Editor): Promise<void> {
		if (!this.settings.enhanceDefaultPaste) {
			return;
		}

		if (clipboard.defaultPrevented) return;

		const clipboardText = clipboard.clipboardData?.getData("text/plain") ?? "";
		if (clipboardText === null || clipboardText === "") return;

		// If its not a URL, we return false to allow the default paste handler to take care of it.
		// Similarly, image urls don't have a meaningful <title> attribute so downloading it
		// to fetch the title is a waste of bandwidth.
		if (!CheckIf.isUrl(clipboardText) || CheckIf.isImage(clipboardText)) {
			return;
		}

		// Only attempt fetch if online
		if (!navigator.onLine) {
			new Notice(i18n.notices.noInternet);
			return;
		}

		// We've decided to handle the paste, stop propagation to the default handler.
		clipboard.stopPropagation();
		clipboard.preventDefault();

		// If it looks like we're pasting the url into a markdown link already, don't fetch title
		// as the user has already probably put a meaningful title, also it would lead to the title
		// being inside the link.
		if (CheckIf.isMarkdownLinkAlready(editor) || CheckIf.isAfterQuote(editor)) {
			editor.replaceSelection(clipboardText);
			return;
		}

		// If url is pasted over selected text and setting is enabled, no need to fetch title,
		// just insert a link
		const selectedText = (EditorExtensions.getSelectedText(editor) || "").trim();
		if (selectedText && this.settings.shouldPreserveSelectionAsTitle) {
			editor.replaceSelection(`[${selectedText}](${clipboardText})`);
			return;
		}

		// At this point we're just pasting a link in a normal fashion, fetch its title.
		this.convertUrlToTitledLink(editor, clipboardText);
		return;
	}

	/**
	 * Handles drop events to automatically fetch titles for URLs
	 * @param dropEvent - Drag event from drop action
	 * @param editor - Obsidian editor instance
	 */
	async dropUrlWithTitle(dropEvent: DragEvent, editor: Editor): Promise<void> {
		if (!this.settings.enhanceDropEvents) {
			return;
		}

		if (dropEvent.defaultPrevented) return;

		const dropText = dropEvent.dataTransfer?.getData("text/plain") ?? "";
		if (dropText === null || dropText === "") return;

		// If its not a URL, we return false to allow the default paste handler to take care of it.
		// Similarly, image urls don't have a meaningful <title> attribute so downloading it
		// to fetch the title is a waste of bandwidth.
		if (!CheckIf.isUrl(dropText) || CheckIf.isImage(dropText)) {
			return;
		}
		// Only attempt fetch if online
		if (!navigator.onLine) {
			new Notice(i18n.notices.noInternet);
			return;
		}

		// We've decided to handle the paste, stop propagation to the default handler.
		dropEvent.stopPropagation();
		dropEvent.preventDefault();

		// If it looks like we're pasting the url into a markdown link already, don't fetch title
		// as the user has already probably put a meaningful title, also it would lead to the title
		// being inside the link.
		if (CheckIf.isMarkdownLinkAlready(editor) || CheckIf.isAfterQuote(editor)) {
			editor.replaceSelection(dropText);
			return;
		}

		// If url is pasted over selected text and setting is enabled, no need to fetch title,
		// just insert a link
		const selectedText = (EditorExtensions.getSelectedText(editor) || "").trim();
		if (selectedText && this.settings.shouldPreserveSelectionAsTitle) {
			editor.replaceSelection(`[${selectedText}](${dropText})`);
			return;
		}

		// At this point we're just pasting a link in a normal fashion, fetch its title.
		this.convertUrlToTitledLink(editor, dropText);
		return;
	}

	/**
	 * Checks if a URL is blacklisted based on user settings
	 * @param url - URL to check
	 * @returns true if URL matches any blacklist entry
	 */
	async isBlacklisted(url: string): Promise<boolean> {
		await this.loadSettings();
		this.blacklist = this.settings.websiteBlacklist
			.split(/,|\n/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		return this.blacklist.some((site) => url.includes(site));
	}

	/**
	 * Converts a URL to a markdown link with fetched title
	 * @param editor - Obsidian editor instance
	 * @param url - URL to convert
	 */
	async convertUrlToTitledLink(editor: Editor, url: string): Promise<void> {
		if (await this.isBlacklisted(url)) {
			const domain = new URL(url).hostname;
			editor.replaceSelection(`[${domain}](${url})`);
			return;
		}

		// Generate a unique id for find/replace operations for the title.
		const pasteId = this.getPasteId();

		// Instantly paste so you don't wonder if paste is broken
		editor.replaceSelection(`[${pasteId}](${url})`);

		// Fetch title from site, replace Fetching Title with actual title
		const title = await this.fetchUrlTitle(url);
		const escapedTitle = this.escapeMarkdown(title);
		const shortenedTitle = this.shortTitle(escapedTitle);

		const text = editor.getValue();

		const start = text.indexOf(pasteId);
		if (start < 0) {
			console.log(`Unable to find text "${pasteId}" in current editor, bailing out; link ${url}`);
		} else {
			const end = start + pasteId.length;
			const startPos = EditorExtensions.getEditorPositionFromIndex(text, start);
			const endPos = EditorExtensions.getEditorPositionFromIndex(text, end);

			editor.replaceRange(shortenedTitle, startPos, endPos);
		}
	}

	/**
	 * Escapes markdown special characters in text
	 * @param text - Text to escape
	 * @returns Escaped text safe for use in markdown
	 */
	escapeMarkdown(text: string): string {
		var unescaped = text.replace(/\\(\*|_|`|~|\\|\[|\])/g, "$1"); // unescape any "backslashed" character
		var _escaped = unescaped.replace(/(\*|_|`|<|>|~|\\|\[|\])/g, "\\$1"); // escape *, _, `, ~, \, [, ], <, and >
		var escaped = unescaped.replace(/(\*|_|`|\||<|>|~|\\|\[|\])/g, "\\$1"); // escape *, _, `, ~, \, |, [, ], <, and >
		return escaped;
	}

	/**
	 * Truncates title to maximum length if configured
	 * @param title - Title to potentially shorten
	 * @returns Original or truncated title with ellipsis
	 */
	public shortTitle = (title: string): string => {
		if (this.settings.maximumTitleLength === 0) {
			return title;
		}
		if (title.length < this.settings.maximumTitleLength + 3) {
			return title;
		}
		const shortenedTitle = `${title.slice(0, this.settings.maximumTitleLength)}...`;
		return shortenedTitle;
	};

	/**
	 * Fetches page title using LinkPreview.net API
	 * @param url - URL to fetch title for
	 * @returns Page title or empty string on error
	 */
	public async fetchUrlTitleViaLinkPreview(url: string): Promise<string> {
		if (this.settings.linkPreviewApiKey.length !== 32) {
			console.error("LinkPreview API key is not 32 characters long, please check your settings");
			return "";
		}

		try {
			const apiEndpoint = `https://api.linkpreview.net/?q=${encodeURIComponent(url)}`;
			const response = await fetch(apiEndpoint, {
				headers: {
					"X-Linkpreview-Api-Key": this.settings.linkPreviewApiKey,
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
	 * @returns Page title or error message
	 */
	async fetchUrlTitle(url: string): Promise<string> {
		try {
			let title = "";
			title = await this.fetchUrlTitleViaLinkPreview(url);
			console.log(`Title via Link Preview: ${title}`);

			if (title === "") {
				console.log("Title via Link Preview failed, falling back to scraper");
				if (this.settings.useNewScraper) {
					console.log("Using new scraper");
					title = await getPageTitle(url);
				} else {
					console.log("Using old scraper");
					title = await getElectronPageTitle(url);
				}
			}

			console.log(`Title: ${title}`);
			title = title.replace(/(\r\n|\n|\r)/gm, "").trim() || i18n.notices.titleUnavailable;
			return title;
		} catch (error) {
			console.error(error);
			return i18n.notices.errorFetching;
		}
	}

	/**
	 * Extracts URL from a markdown link format
	 * @param link - Markdown link string `[title](url)`
	 * @returns Extracted URL or empty string
	 */
	public getUrlFromLink(link: string): string {
		const urlRegex = new RegExp(DEFAULT_SETTINGS.linkRegex);
		const match = urlRegex.exec(link);
		return match?.[2] ?? "";
	}

	/**
	 * Generates a unique placeholder ID for async title replacement
	 * @returns Unique placeholder string
	 */
	private getPasteId(): string {
		var base = i18n.placeholder.fetching;
		if (this.settings.useBetterPasteId) {
			return this.getBetterPasteId(base);
		} else {
			return `${base}#${this.createBlockHash()}`;
		}
	}

	/**
	 * Creates a visually identical but unique placeholder using invisible characters
	 * @param base - Base placeholder text
	 * @returns Unique placeholder that looks identical to base
	 */
	private getBetterPasteId(base: string): string {
		// After every character, add 0, 1 or 2 invisible characters
		// so that to the user it looks just like the base string.
		// The number of combinations is 3^14 = 4782969
		let result = "";
		var invisibleCharacter = "\u200B";
		var maxInvisibleCharacters = 2;
		for (var i = 0; i < base.length; i++) {
			var count = Math.floor(Math.random() * (maxInvisibleCharacters + 1));
			result += base.charAt(i) + invisibleCharacter.repeat(count);
		}
		return result;
	}

	/**
	 * Creates a random 4-character hash for placeholder uniqueness
	 * Custom hashid implementation by @shabegom
	 * @returns Random alphanumeric hash
	 */
	private createBlockHash(): string {
		let result = "";
		var characters = "abcdefghijklmnopqrstuvwxyz0123456789";
		var charactersLength = characters.length;
		for (var i = 0; i < 4; i++) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}

	onunload() {
		console.log("unloading obsidian-auto-link-title");
	}

	/** Loads plugin settings from Obsidian's data store */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/** Saves plugin settings to Obsidian's data store */
	async saveSettings() {
		await this.saveData(this.settings);
	}
}

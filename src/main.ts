/**
 * @fileoverview
 * Main plugin file for Auto Link Title.
 * Automatically fetches and inserts titles when pasting or dropping URLs.
 */
import { type Editor, Notice, Plugin } from "obsidian";
import {
	CheckIf,
	getUrlOnlyPasteParts,
	stripAngleBrackets,
	type UrlOnlyPastePart,
} from "./checkif";
import { EditorExtensions } from "./editor-enhancements";
import { i18n } from "./lang/i18n";
import { type AutoLinkTitleSettings, AutoLinkTitleSettingTab, DEFAULT_SETTINGS } from "./settings";
import { fetchUrlTitle } from "./title-fetcher";
import { escapeMarkdown, getUrlFromLink, shortTitle } from "./utils/markdown";
import { getPasteId } from "./utils/placeholder";

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
			const link = getUrlFromLink(selectedText);
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
	 * Core handler for processing URLs and converting them to titled links
	 * Shared logic between paste, drop, and manual paste operations
	 * @param editor - Obsidian editor instance
	 * @param text - URL text to process
	 * @param fallbackToPlainPaste - Whether to paste plain text if URL is invalid
	 * @returns true if URL was processed, false otherwise
	 */
	private async processUrlText(
		editor: Editor,
		text: string,
		fallbackToPlainPaste: boolean,
	): Promise<boolean> {
		// Skip empty text
		if (text === null || text === "") return false;

		// Strip angle brackets from autolink format <URL>
		const url = stripAngleBrackets(text);

		// If not a URL or is an image URL, skip processing
		if (!CheckIf.isUrl(url) || CheckIf.isImage(url)) {
			if (fallbackToPlainPaste) editor.replaceSelection(text);
			return false;
		}

		// Only attempt fetch if online
		if (!navigator.onLine) {
			if (fallbackToPlainPaste) editor.replaceSelection(text);
			new Notice(i18n.notices.noInternet);
			return false;
		}

		// If pasting into an existing markdown link context, just paste the URL
		if (CheckIf.isMarkdownLinkAlready(editor) || CheckIf.isAfterQuote(editor)) {
			editor.replaceSelection(url);
			return true;
		}

		// If inside code block and setting is enabled, just paste the URL
		if (this.settings.ignoreCodeBlocks && CheckIf.isInsideCode(editor)) {
			editor.replaceSelection(url);
			return true;
		}

		// If URL is blacklisted, just paste the URL without wrapping
		if (await this.isBlacklisted(url)) {
			editor.replaceSelection(url);
			return true;
		}

		// If URL is pasted over selected text and setting is enabled, use selection as title
		const selectedText = (EditorExtensions.getSelectedText(editor) || "").trim();
		if (selectedText && this.settings.shouldPreserveSelectionAsTitle) {
			editor.replaceSelection(`[${selectedText}](${url})`);
			return true;
		}

		// Fetch title and create markdown link
		this.convertUrlToTitledLink(editor, url);
		return true;
	}

	/**
	 * Converts pasted text made up of multiple URLs while preserving whitespace.
	 * @param editor - Obsidian editor instance
	 * @param parts - Parsed URL and whitespace parts
	 * @param fallbackToPlainPaste - Whether to paste plain text if processing is skipped
	 * @returns true if paste was handled, false otherwise
	 */
	private async processUrlParts(
		editor: Editor,
		parts: UrlOnlyPastePart[],
		fallbackToPlainPaste: boolean,
	): Promise<boolean> {
		const urls = parts.filter((part) => part.type === "url");
		if (urls.length <= 1) return false;

		const plainText = parts.map((part) => (part.type === "url" ? part.url : part.text)).join("");

		if (!navigator.onLine) {
			if (fallbackToPlainPaste) editor.replaceSelection(plainText);
			new Notice(i18n.notices.noInternet);
			return fallbackToPlainPaste;
		}

		if (
			CheckIf.isMarkdownLinkAlready(editor) ||
			CheckIf.isAfterQuote(editor) ||
			(this.settings.ignoreCodeBlocks && CheckIf.isInsideCode(editor))
		) {
			editor.replaceSelection(plainText);
			return true;
		}

		const titleFetches: Array<{ url: string; pasteId: string }> = [];
		const pasteTextParts = await Promise.all(
			parts.map(async (part) => {
				if (part.type === "text") return part.text;
				if (CheckIf.isImage(part.url) || (await this.isBlacklisted(part.url))) return part.url;

				const pasteId = getPasteId(this.settings.useBetterPasteId);
				titleFetches.push({ url: part.url, pasteId });
				return `[${pasteId}](${part.url})`;
			}),
		);

		editor.replaceSelection(pasteTextParts.join(""));
		await Promise.all(
			titleFetches.map(({ url, pasteId }) =>
				this.replacePasteIdWithFetchedTitle(editor, url, pasteId),
			),
		);
		return true;
	}

	/**
	 * Manually triggered paste that fetches title for URLs
	 * @param editor - Obsidian editor instance
	 */
	async manualPasteUrlWithTitle(editor: Editor): Promise<void> {
		const clipboardText = await navigator.clipboard.readText();
		const urlParts = getUrlOnlyPasteParts(clipboardText);
		if (urlParts !== null && (await this.processUrlParts(editor, urlParts, true))) return;

		await this.processUrlText(editor, clipboardText, true);
	}

	/**
	 * Handles paste events to automatically fetch titles for URLs
	 * @param clipboard - Clipboard event from paste action
	 * @param editor - Obsidian editor instance
	 */
	async pasteUrlWithTitle(clipboard: ClipboardEvent, editor: Editor): Promise<void> {
		if (!this.settings.enhanceDefaultPaste) return;
		if (clipboard.defaultPrevented) return;

		const clipboardText = clipboard.clipboardData?.getData("text/plain") ?? "";
		if (clipboardText === null || clipboardText === "") return;

		const urlParts = getUrlOnlyPasteParts(clipboardText);
		if (urlParts !== null && urlParts.filter((part) => part.type === "url").length > 1) {
			if (!navigator.onLine) {
				new Notice(i18n.notices.noInternet);
				return;
			}

			clipboard.stopPropagation();
			clipboard.preventDefault();

			await this.processUrlParts(editor, urlParts, false);
			return;
		}

		// Strip angle brackets from autolink format <URL>
		const url = stripAngleBrackets(clipboardText);

		// Skip non-URLs and image URLs (let default handler process them)
		if (!CheckIf.isUrl(url) || CheckIf.isImage(url)) return;

		// Only attempt fetch if online
		if (!navigator.onLine) {
			new Notice(i18n.notices.noInternet);
			return;
		}

		// We're handling this paste - prevent default behavior
		clipboard.stopPropagation();
		clipboard.preventDefault();

		await this.processUrlText(editor, url, false);
	}

	/**
	 * Handles drop events to automatically fetch titles for URLs
	 * @param dropEvent - Drag event from drop action
	 * @param editor - Obsidian editor instance
	 */
	async dropUrlWithTitle(dropEvent: DragEvent, editor: Editor): Promise<void> {
		if (!this.settings.enhanceDropEvents) return;
		if (dropEvent.defaultPrevented) return;

		const dropText = dropEvent.dataTransfer?.getData("text/plain") ?? "";
		if (dropText === null || dropText === "") return;

		// Strip angle brackets from autolink format <URL>
		const url = stripAngleBrackets(dropText);

		// Skip non-URLs and image URLs (let default handler process them)
		if (!CheckIf.isUrl(url) || CheckIf.isImage(url)) return;

		// Only attempt fetch if online
		if (!navigator.onLine) {
			new Notice(i18n.notices.noInternet);
			return;
		}

		// We're handling this drop - prevent default behavior
		dropEvent.stopPropagation();
		dropEvent.preventDefault();

		await this.processUrlText(editor, url, false);
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
		// If URL is blacklisted, just paste the URL without wrapping
		if (await this.isBlacklisted(url)) {
			editor.replaceSelection(url);
			return;
		}

		// Generate a unique id for find/replace operations for the title.
		const pasteId = getPasteId(this.settings.useBetterPasteId);

		// Instantly paste so you don't wonder if paste is broken
		editor.replaceSelection(`[${pasteId}](${url})`);

		await this.replacePasteIdWithFetchedTitle(editor, url, pasteId);
	}

	/**
	 * Fetches a title and replaces the matching placeholder in the editor.
	 * @param editor - Obsidian editor instance
	 * @param url - URL to fetch
	 * @param pasteId - Unique placeholder to replace
	 */
	private async replacePasteIdWithFetchedTitle(
		editor: Editor,
		url: string,
		pasteId: string,
	): Promise<void> {
		// Fetch title from site, replace Fetching Title with actual title
		const title = await fetchUrlTitle(url, this.settings);
		const escapedTitle = escapeMarkdown(title);
		const shortenedTitle = shortTitle(escapedTitle, this.settings.maximumTitleLength);

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

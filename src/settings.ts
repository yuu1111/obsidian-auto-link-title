/**
 * @fileoverview
 * Plugin settings interface, defaults, and settings tab UI.
 * Handles all user-configurable options for Auto Link Title.
 */
import { type App, Notice, PluginSettingTab, Setting } from "obsidian";
import { i18n } from "./lang/i18n";
import type AutoLinkTitle from "./main";

/**
 * Plugin settings interface defining all configurable options
 */
export interface AutoLinkTitleSettings {
	regex: RegExp;
	lineRegex: RegExp;
	linkRegex: RegExp;
	linkLineRegex: RegExp;
	imageRegex: RegExp;
	shouldPreserveSelectionAsTitle: boolean;
	enhanceDefaultPaste: boolean;
	enhanceDropEvents: boolean;
	websiteBlacklist: string;
	maximumTitleLength: number;
	useNewScraper: boolean;
	linkPreviewApiKey: string;
	useBetterPasteId: boolean;
	ignoreCodeBlocks: boolean;
	useTwitterProxy: boolean;
}

/**
 * Default settings values for the plugin
 */
export const DEFAULT_SETTINGS: AutoLinkTitleSettings = {
	regex:
		/^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/i,
	lineRegex:
		/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi,
	linkRegex:
		/^\[([^[\]]*)\]\((https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})\)$/i,
	linkLineRegex:
		/\[([^[\]]*)\]\((https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})\)/gi,
	imageRegex: /\.(gif|jpe?g|tiff?|png|webp|bmp|tga|psd|ai)$/i,
	enhanceDefaultPaste: true,
	shouldPreserveSelectionAsTitle: false,
	enhanceDropEvents: true,
	websiteBlacklist: "",
	maximumTitleLength: 0,
	useNewScraper: false,
	linkPreviewApiKey: "",
	useBetterPasteId: false,
	ignoreCodeBlocks: true,
	useTwitterProxy: true,
};

/**
 * Settings tab UI for the Auto Link Title plugin
 */
export class AutoLinkTitleSettingTab extends PluginSettingTab {
	plugin: AutoLinkTitle;

	constructor(app: App, plugin: AutoLinkTitle) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName(i18n.settings.enhancePaste.name)
			.setDesc(i18n.settings.enhancePaste.desc)
			.addToggle((val) =>
				val.setValue(this.plugin.settings.enhanceDefaultPaste).onChange(async (value) => {
					console.log(value);
					this.plugin.settings.enhanceDefaultPaste = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.enhanceDrop.name)
			.setDesc(i18n.settings.enhanceDrop.desc)
			.addToggle((val) =>
				val.setValue(this.plugin.settings.enhanceDropEvents).onChange(async (value) => {
					console.log(value);
					this.plugin.settings.enhanceDropEvents = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.maxTitleLength.name)
			.setDesc(i18n.settings.maxTitleLength.desc)
			.addText((val) =>
				val
					.setValue(this.plugin.settings.maximumTitleLength.toString(10))
					.onChange(async (value) => {
						const titleLength = Number(value);
						this.plugin.settings.maximumTitleLength =
							Number.isNaN(titleLength) || titleLength < 0 ? 0 : titleLength;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.preserveSelection.name)
			.setDesc(i18n.settings.preserveSelection.desc)
			.addToggle((val) =>
				val
					.setValue(this.plugin.settings.shouldPreserveSelectionAsTitle)
					.onChange(async (value) => {
						console.log(value);
						this.plugin.settings.shouldPreserveSelectionAsTitle = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.blacklist.name)
			.setDesc(i18n.settings.blacklist.desc)
			.addTextArea((val) =>
				val
					.setValue(this.plugin.settings.websiteBlacklist)
					.setPlaceholder(i18n.settings.blacklist.placeholder)
					.onChange(async (value) => {
						this.plugin.settings.websiteBlacklist = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.newScraper.name)
			.setDesc(i18n.settings.newScraper.desc)
			.addToggle((val) =>
				val.setValue(this.plugin.settings.useNewScraper).onChange(async (value) => {
					console.log(value);
					this.plugin.settings.useNewScraper = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.betterPlaceholder.name)
			.setDesc(i18n.settings.betterPlaceholder.desc)
			.addToggle((val) =>
				val.setValue(this.plugin.settings.useBetterPasteId).onChange(async (value) => {
					console.log(value);
					this.plugin.settings.useBetterPasteId = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.apiKey.name)
			.setDesc(i18n.settings.apiKey.desc)
			.addText((text) =>
				text.setValue(this.plugin.settings.linkPreviewApiKey || "").onChange(async (value) => {
					const trimmedValue = value.trim();
					if (trimmedValue.length > 0 && trimmedValue.length !== 32) {
						new Notice(i18n.notices.apiKeyInvalid);
						this.plugin.settings.linkPreviewApiKey = "";
					} else {
						this.plugin.settings.linkPreviewApiKey = trimmedValue;
					}
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.ignoreCodeBlocks.name)
			.setDesc(i18n.settings.ignoreCodeBlocks.desc)
			.addToggle((val) =>
				val.setValue(this.plugin.settings.ignoreCodeBlocks).onChange(async (value) => {
					this.plugin.settings.ignoreCodeBlocks = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.useTwitterProxy.name)
			.setDesc(i18n.settings.useTwitterProxy.desc)
			.addToggle((val) =>
				val.setValue(this.plugin.settings.useTwitterProxy).onChange(async (value) => {
					this.plugin.settings.useTwitterProxy = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}

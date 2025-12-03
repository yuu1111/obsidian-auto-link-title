/**
 * Preload script to mock external modules for testing
 */
import { mock } from "bun:test";

// Mock window.localStorage for i18n
globalThis.window = {
	localStorage: {
		getItem: (_key: string) => "en",
		setItem: (_key: string, _value: string) => {},
	},
} as any;

// Mock the obsidian module
mock.module("obsidian", () => ({
	Notice: class Notice {},
	PluginSettingTab: class PluginSettingTab {
		app: any;
		plugin: any;
		containerEl: any = { empty: () => {} };
		constructor(app: any, plugin: any) {
			this.app = app;
			this.plugin = plugin;
		}
	},
	Setting: class Setting {
		setName(_name: string) {
			return this;
		}
		setDesc(_desc: string) {
			return this;
		}
		addToggle(_cb: any) {
			return this;
		}
		addText(_cb: any) {
			return this;
		}
		addTextArea(_cb: any) {
			return this;
		}
	},
}));

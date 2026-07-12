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
} as Window & typeof globalThis;

interface ContainerElementMock {
	empty(): void;
}

// Mock the obsidian module
mock.module("obsidian", () => ({
	Notice: class Notice {},
	PluginSettingTab: class PluginSettingTab {
		app: unknown;
		plugin: unknown;
		containerEl: ContainerElementMock = { empty: () => {} };
		constructor(app: unknown, plugin: unknown) {
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
		addToggle(_cb: unknown) {
			return this;
		}
		addText(_cb: unknown) {
			return this;
		}
		addTextArea(_cb: unknown) {
			return this;
		}
	},
}));

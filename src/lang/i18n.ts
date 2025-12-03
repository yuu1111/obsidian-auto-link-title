/**
 * @fileoverview
 * Internationalization (i18n) helper module.
 * Automatically selects locale based on Obsidian's language setting.
 */
import en from "./locale/en";
import ja from "./locale/ja";

/** Map of locale codes to their translation objects */
const localeMap: Record<string, typeof en> = { en, ja };

/** Current language from Obsidian settings, defaults to English */
const lang = window.localStorage.getItem("language") || "en";

/**
 * Exported i18n object containing all localized strings.
 * Falls back to English if the current language is not supported.
 */
export const i18n: typeof en = localeMap[lang] || en;

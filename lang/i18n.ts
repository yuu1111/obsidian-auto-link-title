/**
 * @fileoverview i18n helper
 */
import en from "./locale/en";
import ja from "./locale/ja";

const localeMap: Record<string, typeof en> = { en, ja };
const lang = window.localStorage.getItem("language") || "en";

export const i18n: typeof en = localeMap[lang] || en;

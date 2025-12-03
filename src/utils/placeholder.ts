/**
 * @fileoverview
 * Placeholder ID generation utilities for async title replacement.
 */
import { i18n } from "../lang/i18n";

/**
 * Creates a random 4-character hash for placeholder uniqueness
 * Custom hashid implementation by @shabegom
 * @returns Random alphanumeric hash
 */
function createBlockHash(): string {
	let result = "";
	const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
	const charactersLength = characters.length;
	for (let i = 0; i < 4; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

/**
 * Creates a visually identical but unique placeholder using invisible characters
 * @param base - Base placeholder text
 * @returns Unique placeholder that looks identical to base
 */
function getBetterPasteId(base: string): string {
	// After every character, add 0, 1 or 2 invisible characters
	// so that to the user it looks just like the base string.
	// The number of combinations is 3^14 = 4782969
	let result = "";
	const invisibleCharacter = "\u200B";
	const maxInvisibleCharacters = 2;
	for (let i = 0; i < base.length; i++) {
		const count = Math.floor(Math.random() * (maxInvisibleCharacters + 1));
		result += base.charAt(i) + invisibleCharacter.repeat(count);
	}
	return result;
}

/**
 * Generates a unique placeholder ID for async title replacement
 * @param useBetterPasteId - Whether to use invisible character method
 * @returns Unique placeholder string
 */
export function getPasteId(useBetterPasteId: boolean): string {
	const base = i18n.placeholder.fetching;
	if (useBetterPasteId) {
		return getBetterPasteId(base);
	}
	return `${base}#${createBlockHash()}`;
}

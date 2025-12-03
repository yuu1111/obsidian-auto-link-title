/**
 * @fileoverview
 * Editor extension utilities for text selection and cursor position handling.
 * Provides helpers to work with URLs and markdown links in the editor.
 */
import type { Editor, EditorPosition } from "obsidian";
import { DEFAULT_SETTINGS } from "./settings";

/**
 * Represents the start and end positions of a word/URL in the editor
 */
interface WordBoundaries {
	start: { line: number; ch: number };
	end: { line: number; ch: number };
}

/**
 * Editor extension utilities for text selection and position handling
 */
export class EditorExtensions {
	/**
	 * Gets the currently selected text, or selects the URL/link at cursor position
	 * @param editor - Obsidian editor instance
	 * @returns The selected text or URL at cursor position
	 */
	public static getSelectedText(editor: Editor): string {
		if (!editor.somethingSelected()) {
			const wordBoundaries = EditorExtensions.getWordBoundaries(editor);
			editor.setSelection(wordBoundaries.start, wordBoundaries.end);
		}
		return editor.getSelection();
	}

	/**
	 * Checks if the cursor position is within a regex match boundaries
	 * @param cursor - Current cursor position
	 * @param match - Regex match array with index property
	 * @returns true if cursor is within the match boundaries
	 */
	private static cursorWithinBoundaries(cursor: EditorPosition, match: RegExpMatchArray): boolean {
		if (match.index === undefined) return false;
		const startIndex = match.index;
		const endIndex = match.index + match[0].length;

		return startIndex <= cursor.ch && cursor.ch <= endIndex;
	}

	/**
	 * Gets the word boundaries for a URL or markdown link at cursor position
	 * @param editor - Obsidian editor instance
	 * @returns Start and end positions of the URL/link, or cursor position if none found
	 */
	private static getWordBoundaries(editor: Editor): WordBoundaries {
		let _startCh, _endCh: number;
		const cursor = editor.getCursor();

		// If its a normal URL token this is not a markdown link
		// In this case we can simply overwrite the link boundaries as-is
		const lineText = editor.getLine(cursor.line);

		// First check if we're in a link
		const linksInLine = lineText.matchAll(DEFAULT_SETTINGS.linkLineRegex);

		for (const match of linksInLine) {
			if (EditorExtensions.cursorWithinBoundaries(cursor, match) && match.index !== undefined) {
				return {
					start: { line: cursor.line, ch: match.index },
					end: { line: cursor.line, ch: match.index + match[0].length },
				};
			}
		}

		// If not, check if we're in just a standard ol' URL.
		const urlsInLine = lineText.matchAll(DEFAULT_SETTINGS.lineRegex);

		for (const match of urlsInLine) {
			if (EditorExtensions.cursorWithinBoundaries(cursor, match) && match.index !== undefined) {
				return {
					start: { line: cursor.line, ch: match.index },
					end: { line: cursor.line, ch: match.index + match[0].length },
				};
			}
		}

		return {
			start: cursor,
			end: cursor,
		};
	}

	/**
	 * Converts a string index to an editor position (line and character)
	 * @param content - The full text content
	 * @param index - Character index in the content
	 * @returns Editor position with line and character offset
	 */
	public static getEditorPositionFromIndex(content: string, index: number): EditorPosition {
		const substr = content.substr(0, index);

		let l = 0;
		let offset = -1;
		let r = -1;
		for (; (r = substr.indexOf("\n", r + 1)) !== -1; l++, offset = r);
		offset += 1;

		const ch = content.substr(offset, index - offset).length;

		return { line: l, ch: ch };
	}
}

/**
 * @fileoverview English locale (base)
 */
export default {
	commands: {
		pasteUrl: "Paste URL and auto fetch title",
		normalPaste: "Normal paste (no fetching behavior)",
		enhanceUrl: "Enhance existing URL with link and title",
	},

	notices: {
		noInternet: "No internet connection. Cannot fetch title.",
		titleUnavailable: "Title Unavailable | Site Unreachable",
		errorFetching: "Error fetching title",
		apiKeyInvalid: "LinkPreview API key must be 32 characters long",
	},

	placeholder: {
		fetching: "Fetching Title",
	},

	settings: {
		enhancePaste: {
			name: "Enhance Default Paste",
			desc: "Fetch the link title when pasting a link in the editor with the default paste command",
		},
		enhanceDrop: {
			name: "Enhance Drop Events",
			desc: "Fetch the link title when drag and dropping a link from another program",
		},
		maxTitleLength: {
			name: "Maximum title length",
			desc: "Set the maximum length of the title. Set to 0 to disable.",
		},
		preserveSelection: {
			name: "Preserve selection as title",
			desc: "Whether to prefer selected text as title over fetched title when pasting",
		},
		blacklist: {
			name: "Website Blacklist",
			desc: "List of strings (comma separated) that disable autocompleting website titles. Can be URLs or arbitrary text.",
			placeholder: "localhost, tiktok.com",
		},
		newScraper: {
			name: "Use New Scraper",
			desc: "Use experimental new scraper, seems to work well on desktop but not mobile.",
		},
		betterPlaceholder: {
			name: "Use Better Fetching Placeholder",
			desc: "Use a more readable placeholder when fetching the title of a link.",
		},
		apiKey: {
			name: "LinkPreview API Key",
			desc: "API key for the LinkPreview.net service. Get one at https://my.linkpreview.net/access_keys",
		},
	},
};

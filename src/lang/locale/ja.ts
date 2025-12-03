/**
 * @fileoverview
 * Japanese locale strings.
 * Implements the same structure as the English base locale.
 */
import type en from "./en";

const ja: typeof en = {
	commands: {
		pasteUrl: "URLを貼り付けてタイトルを自動取得",
		normalPaste: "通常の貼り付け（タイトル取得なし）",
		enhanceUrl: "既存のURLにリンクとタイトルを追加",
	},

	notices: {
		noInternet: "インターネット接続がありません。タイトルを取得できません。",
		titleUnavailable: "タイトル取得不可 | サイトに接続できません",
		errorFetching: "タイトル取得エラー",
		apiKeyInvalid: "LinkPreview APIキーは32文字である必要があります",
	},

	placeholder: {
		fetching: "タイトル取得中",
	},

	settings: {
		enhancePaste: {
			name: "デフォルト貼り付けを拡張",
			desc: "デフォルトの貼り付けコマンドでリンクを貼り付ける際にリンクタイトルを取得する",
		},
		enhanceDrop: {
			name: "ドロップイベントを拡張",
			desc: "他のプログラムからリンクをドラッグ＆ドロップする際にリンクタイトルを取得する",
		},
		maxTitleLength: {
			name: "タイトルの最大文字数",
			desc: "タイトルの最大文字数を設定します。0で無効化。",
		},
		preserveSelection: {
			name: "選択テキストをタイトルとして保持",
			desc: "貼り付け時に取得したタイトルより選択テキストを優先するかどうか",
		},
		blacklist: {
			name: "ウェブサイトブラックリスト",
			desc: "タイトル自動補完を無効にする文字列のリスト（カンマ区切り）。URLまたは任意のテキストを指定可能。",
			placeholder: "localhost, tiktok.com",
		},
		newScraper: {
			name: "新しいスクレイパーを使用",
			desc: "実験的な新しいスクレイパーを使用します。デスクトップでは動作しますが、モバイルでは動作しない場合があります。",
		},
		betterPlaceholder: {
			name: "より良いプレースホルダーを使用",
			desc: "リンクのタイトル取得中に、より読みやすいプレースホルダーを使用する。",
		},
		apiKey: {
			name: "LinkPreview APIキー",
			desc: "LinkPreview.netサービスのAPIキー。https://my.linkpreview.net/access_keys で取得できます。",
		},
	},
};

export default ja;

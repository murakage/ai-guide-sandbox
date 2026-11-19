# ai-guide-sandbox

「開発側が用意したアプリの情報を、AI 経由で正確に、簡単に利用者へ届ける」仕組みを、本物のアプリに入れる前に、架空のアプリで試すための場所。

計画の **A (Web サイト + AI 向けの形)** と **B (AI に聞くボタン)** を再現している。C (リモート MCP) はあとで足す。

## フォルダ

| 場所 | 中身 |
| --- | --- |
| `content/` | **情報源**。架空のアプリ「ハコニワ Studio」のガイド (Markdown)。ここだけを書き換える |
| `build.mjs` | `content/` から公開用の `public/` を作る |
| `assets/ask-ai.js` | 「AI に聞く」の共通部品 (ガイドサイトとアプリの両方が使う) |
| `assets/site.css` | 見た目 |
| `app/` | ダミーのアプリ。ヘッダーの「?」から「AI に聞く」を使う |
| `serve.mjs` | `public/` をローカルで配る (http://localhost:8090) |
| `questions.md` | 質問集。AI がガイドを読んで答えたかを測る |
| `playground/` | 以前の MCP / WebMCP の体験で作ったファイル |

## ローカルで見る

```powershell
node build.mjs
node serve.mjs
```

- ガイド: http://localhost:8090/
- ダミーアプリ: http://localhost:8090/app/

ローカルでは、ボタンの動きと AI に渡す文までしか確かめられない。**ChatGPT や Claude は localhost を読めない** ので、AI の答えを試すには公開が必要。

## 公開する (GitHub Pages)

```powershell
node build.mjs --base https://<ユーザー>.github.io/<リポジトリ>/
```

`public/` の中身を GitHub Pages に置く。中身はすべて架空のアプリのもので、本物のガイドは入れない。

## 試し方

1. 公開したダミーアプリを開き、画面を移動して「?」→「AI に聞く」に `questions.md` の困りごとを入れる
2. ChatGPT / Claude で開き、答えを `questions.md` の「正しい答えの決め手」と比べる
3. ガイドのページの右上「AI に聞く」からも同じように試す

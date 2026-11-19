// content/*.md (情報源) から公開用のサイトを public/ に作る。依存なし。
//   node build.mjs                       … ローカル確認用 (llms.txt の URL が http://localhost:8090/ になる)
//   node build.mjs --base https://<ユーザー>.github.io/<リポジトリ>/   … 公開用
//
// 作るもの:
//   public/<ページ>.html   人が読むページ (右上に「AI に聞く」メニュー)
//   public/<ページ>.md     AI が読む Markdown 版 (「AI に聞く」はこちらを AI に渡す)
//   public/llms.txt        AI 向けの目次
//   public/llms-full.txt   全ページをつなげたもの (1 回で全部読ませたいとき用)
//   public/app/            ダミーのアプリ (app/ をそのまま写す)
//   public/assets/         共通の CSS と「AI に聞く」の部品
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const OUT = path.join(ROOT, 'public');
const baseArg = process.argv.indexOf('--base');
const BASE = (baseArg > 0 ? process.argv[baseArg + 1] : 'http://localhost:8090/').replace(/\/?$/, '/');

const SITE = {
  name: 'ハコニワ Studio',
  summary: '写真や動画を飾った「展示ルーム」を作って Web で公開するツールの利用者ガイド (AI 経由の案内を試すための架空のアプリ)。',
};
// サイドバーと llms.txt に並べる順番
const ORDER = ['index', 'getting-started', 'works-list', 'editor', 'publish', 'troubleshooting', 'terminology'];

// ---------- 情報源を読む ----------
function readPage(slug) {
  const raw = fs.readFileSync(path.join(ROOT, 'content', `${slug}.md`), 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = {};
  if (m) for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  return { slug, title: meta.title ?? slug, description: meta.description ?? '', body: m ? raw.slice(m[0].length) : raw };
}
const pages = ORDER.map(readPage);

// ---------- 小さな Markdown 変換 (このガイドで使う書き方だけ) ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
function headingId(text) { return text.trim().replace(/[\s　]+/g, '-'); }
function toHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,4}) (.*)$/);
    if (h) { out.push(`<h${h[1].length} id="${esc(headingId(h[2]))}">${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (line.startsWith('```')) {
      const buf = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue;
    }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]).map((c) => `<th>${inline(c)}</th>`).join('');
      const body = rows.slice(2).map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
      out.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`); continue;
    }
    if (line.startsWith('> ')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('> ')) buf.push(lines[i++].slice(2));
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`); continue;
    }
    const li = line.match(/^(\d+\.|-) (.*)$/);
    if (li) {
      const tag = li[1] === '-' ? 'ul' : 'ol';
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\d+\.|-) (.*)$/);
        if (!m) break;
        items.push(`<li>${inline(m[2])}</li>`); i++;
      }
      out.push(`<${tag}>${items.join('')}</${tag}>`); continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#|```|\||> |\d+\. |- )/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(''))}</p>`);
  }
  return out.join('\n');
}

// ---------- ページの HTML ----------
function pageHtml(p) {
  const nav = pages.map((x) => `<a href="${x.slug}.html"${x.slug === p.slug ? ' class="current"' : ''}>${esc(x.title)}</a>`).join('');
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} | ${esc(SITE.name)} ガイド</title>
<meta name="description" content="${esc(p.description)}">
<link rel="alternate" type="text/markdown" href="${p.slug}.md" title="Markdown 版 (AI 向け)">
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
<header class="top">
  <a class="brand" href="index.html">🏠 ${esc(SITE.name)} <span>ガイド</span></a>
  <a class="toapp" href="app/">ダミーアプリを開く →</a>
</header>
<div class="layout">
  <nav class="side">${nav}<hr><a href="llms.txt">llms.txt (AI 向けの目次)</a></nav>
  <main>
    <div class="pagebar">
      <a class="mdlink" href="${p.slug}.md">Markdown 版</a>
      <div class="askmenu" data-ask-page="${p.slug}.md"></div>
    </div>
    <article>${toHtml(p.body)}</article>
  </main>
</div>
<script type="module">
  import { mountPageMenu } from './assets/ask-ai.js';
  mountPageMenu(document.querySelector('.askmenu'));
</script>
</body>
</html>
`;
}

// ---------- 書き出す ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const p of pages) {
  fs.writeFileSync(path.join(OUT, `${p.slug}.html`), pageHtml(p));
  // AI 向けの Markdown 版。前置き (front matter) は外し、出典の URL を先頭に付ける
  fs.writeFileSync(path.join(OUT, `${p.slug}.md`), `<!-- 出典: ${BASE}${p.slug}.html -->\n${p.body}`);
}

const llms = [
  `# ${SITE.name}`,
  '',
  `> ${SITE.summary}`,
  '',
  'AI へのお願い: 回答はこのガイドの内容だけに基づいてください。ガイドに書いていないことは推測せず、「ガイドには書かれていない」と伝えてください。回答には、根拠にしたページの URL を添えてください。',
  '',
  '## ガイド',
  '',
  ...pages.map((p) => `- [${p.title}](${BASE}${p.slug}.md): ${p.description}`),
  '',
  '## Optional',
  '',
  `- [全文](${BASE}llms-full.txt): 全ページを 1 つにつなげたもの`,
  '',
].join('\n');
fs.writeFileSync(path.join(OUT, 'llms.txt'), llms);
fs.writeFileSync(
  path.join(OUT, 'llms-full.txt'),
  pages.map((p) => `<!-- 出典: ${BASE}${p.slug}.html -->\n${p.body.trim()}\n`).join('\n---\n\n'),
);

fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });
fs.cpSync(path.join(ROOT, 'app'), path.join(OUT, 'app'), { recursive: true });
fs.writeFileSync(path.join(OUT, '.nojekyll'), ''); // GitHub Pages に .md を変換させず、そのまま配らせる
console.log(`public/ を作りました (${pages.length} ページ, BASE=${BASE})`);

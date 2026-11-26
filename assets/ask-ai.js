// 「AI に聞く」の共通部品。ガイドサイトの各ページと、ダミーアプリの「?」ダイアログの両方が使う。
// AI は動かさない。質問文を作って、選んだ AI のページを「質問文が入った状態」で開くだけ (メーラーの mailto: と同じ考え方)。
//
// 送るのは「こちらで決めた固定の文 + ガイドの URL + 利用者が自分で書いた文」だけ。
// 作品名・ID・メールアドレスなどは入れない。

export const AIS = [
  // hints=search: ChatGPT に Web を見に行かせる (渡した URL を読ませるため)
  { id: 'chatgpt', name: 'ChatGPT', url: (q) => `https://chatgpt.com/?hints=search&q=${encodeURIComponent(q)}` },
  { id: 'claude', name: 'Claude', url: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}` },
];

const RULES = 'ガイドに書いていないことは推測せず、「ガイドには書かれていない」と伝えてください。回答には根拠にしたページの URL を添えてください。';

// ガイドのいちばん上の場所。アプリは /app/ の下にあるので 1 つ上がガイド。
export function guideRoot() {
  return new URL(location.pathname.includes('/app/') ? '../' : './', location.href);
}
export const guideUrl = (file) => new URL(file, guideRoot()).href;

// ① ガイドのページから: そのページを読ませて、質問を待ってもらう
export function pagePrompt(mdUrl) {
  return [
    `${mdUrl} を読んで、「ハコニワ Studio」の使い方について質問に答えられるようにしてください。`,
    ...fallbackLines(),
    RULES,
  ].join('\n');
}

// 見つからなかったときの段。AI によっては目次 (llms.txt) の中のリンクを開けないので、
// 全文 (llms-full.txt) の URL も質問文に直接書いておく
function fallbackLines() {
  return [
    `ほかのページが必要なら、ガイド全体の目次 ${guideUrl('llms.txt')} から探してください。`,
    `目次からページを開けないときや、それでも見つからないときは、全文 ${guideUrl('llms-full.txt')} を読んでください。`,
  ];
}

// ② アプリから: 今いる画面と困りごとを添えて、答えてもらう。
// 近いものから順に URL を渡す: この画面のページ → 関係するページ → 目次 → 全文
export function appPrompt({ screen, trouble, pageFile, related = [] }) {
  return [
    `「ハコニワ Studio」を使っています。今は「${screen}」です。`,
    `困っていること: ${trouble || '(ここに困っていることを書いてください)'}`,
    '',
    'Web 検索より先に、次の使い方ガイドを上から順に読んで答えてください。',
    `- この画面のガイド: ${guideUrl(pageFile)}`,
    ...related.map((f) => `- 関係するページ: ${guideUrl(f)}`),
    ...fallbackLines(),
    RULES,
  ].join('\n');
}

// 質問文をコピーしてから AI を開く (URL で質問を受け取れなかったときも、貼り付ければ済むように)
export async function openInAi(aiId, text) {
  let copied = false;
  try { await navigator.clipboard.writeText(text); copied = true; } catch {}
  const ai = AIS.find((a) => a.id === aiId);
  if (ai) window.open(ai.url(text), '_blank', 'noopener');
  toast(ai
    ? `${ai.name} を開きました。${copied ? '質問文はコピー済みなので、入っていなければ貼り付けてください。' : ''}`
    : copied ? '質問文をコピーしました。お使いの AI に貼り付けてください。' : 'コピーできませんでした。');
}

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'ask-toast';
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 4000);
}

// ガイドのページの右上に置くメニュー
export function mountPageMenu(host) {
  const mdUrl = new URL(host.dataset.askPage, location.href).href;
  host.innerHTML = `
    <button class="ask-btn" aria-haspopup="menu" aria-expanded="false">✨ AI に聞く ▾</button>
    <div class="ask-list" role="menu" hidden>
      ${AIS.map((a) => `<button role="menuitem" data-ai="${a.id}"><b>${a.name} で聞く</b><small>このページを読ませて質問する</small></button>`).join('')}
      <button role="menuitem" data-ai="copy"><b>質問文をコピー</b><small>ほかの AI に貼り付けて使う</small></button>
      <button role="menuitem" disabled><b>MCP で登録</b><small>準備中 (段階 C で追加)</small></button>
    </div>`;
  const btn = host.querySelector('.ask-btn');
  const list = host.querySelector('.ask-list');
  const setOpen = (open) => { list.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(list.hidden); });
  document.addEventListener('click', () => setOpen(false));
  list.addEventListener('click', (e) => {
    const item = e.target.closest('[data-ai]');
    if (!item) return;
    setOpen(false);
    openInAi(item.dataset.ai, pagePrompt(mdUrl));
  });
}

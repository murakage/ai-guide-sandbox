// 10 倍版の原稿を content-big/ に作る。依存なし。毎回同じ中身になる (乱数の種を固定)。
//   node gen-big.mjs            … 全文 約 2.35 MB (本番のガイド 約 235 KB の 10 倍)
//   node gen-big.mjs 1000000    … 全文の大きさ (バイト) を指定する
//
// 中身: content/ の 7 ページ + 架空の「部品リファレンス」ページを大量に。
// 全文 (llms-full.txt) の 10%・50%・95% あたりのページに、決め手を 1 つずつ埋める。
// AI が全文のどこまで読めるかを確かめるため。決め手の言葉は、ほかのページには出てこない。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SRC = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'content-big');
const TARGET = Number(process.argv[2]) || 2_350_000;
const PAGE_BYTES = 9_500;

// 決め手。at は全文の中の位置 (割合)
const NEEDLES = [
  { at: 0.10, topic: '床と照明', text: [
    '## 照明プリセット「月光」',
    '',
    '照明プリセット「月光」は、床の色を **「黒檀」** にした展示ルームでだけ選べます。ほかの床の色では、照明の一覧に出てきません。',
    '床の色を「黒檀」から変えると、照明は自動で「標準」に戻ります。',
  ] },
  { at: 0.50, topic: '動画の再生', text: [
    '## 動画の自動再生の本数',
    '',
    '1 つの展示ルームで自動再生できる動画は **3 本まで** です。4 本目からは「自動再生」を選んでいても、見る人が再生ボタンを押したときだけ再生されます。',
    'どの 3 本が自動再生になるかは、壁に置いた順番で決まります。',
  ] },
  { at: 0.95, topic: '公開後の表示', text: [
    '## 訪問者カウンター',
    '',
    '訪問者カウンターは、展示ルームを公開してから **48 時間** たつと表示されます。それまでは「集計中」と出ます。',
    '公開範囲を「非公開」に戻すと、カウンターは 0 に戻ります。',
  ] },
];

// 架空の部品と、その設定の言葉。決め手の言葉 (月光・黒檀・自動再生・訪問者) は使わない
const PARTS = ['額縁', '台座', '壁紙', 'キャプション', '案内板', '展示順', '天井', '入口の扉', '窓', '手すり', '観葉植物', '展示ケース',
  '名札', '床の模様', '影', '反射', '文字の書体', '地図', '目印', 'ラベル', '仕切り', '柱', '階段', '絨毯'];
const PROPS = ['太さ', '色', '余白', '角の丸み', '透明度', '向き', '高さ', '幅', '奥行き', '間隔', '揃え方', '縁取り', '模様', '質感',
  '並び順', '表示の条件', '大きさの単位', '傾き', '明るさの補正', '重なり順'];
const VALUES = ['細い', '標準', '太い', 'なし', '小', '中', '大', '左寄せ', '中央', '右寄せ', '上', '下', '自動', '手動',
  '白', '生成り', '灰', '紺', '若草', '砂色', '0〜100', '1〜12', '0.5 刻み', '2 段階', '5 段階'];
const NOTES = ['変更は保存したあと、見る人の画面に反映されます。', '複数の部品を選んでいるときは、まとめて変わります。',
  'テンプレートから作った展示ルームでは、初期値が異なることがあります。', 'スマートフォンで見たときは、少し小さく表示されます。',
  '元に戻すには、編集画面の「元に戻す」を使います。', '一部の値は、ほかの設定と組み合わせたときだけ選べます。',
  'L 字の展示ルームでは、曲がり角の面には置けません。', '書き出した画像には反映されません。'];

let seed = 20261126;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const bytes = (s) => Buffer.byteLength(s, 'utf8');

function fillerPage(no, topic) {
  const lines = [
    '---',
    `title: 部品リファレンス ${String(no).padStart(3, '0')}: ${topic}`,
    `description: ${topic}の設定項目と初期値の一覧`,
    '---',
    `# 部品リファレンス ${String(no).padStart(3, '0')}: ${topic}`,
    '',
    `「${topic}」の設定を、編集画面の「設定」パネルで変えるときの一覧です。どの項目も、選んでいる部品にだけ効きます。`,
    '',
  ];
  let sec = 1;
  while (bytes(lines.join('\n')) < PAGE_BYTES) {
    const part = pick(PARTS);
    lines.push(`## ${sec}. ${part}の設定`, '', `${part}について、${pick(PROPS)}と${pick(PROPS)}を変えられます。${pick(NOTES)}`, '',
      '| 項目 | 選べる値 | 初期値 | 補足 |', '| --- | --- | --- | --- |');
    for (let i = 0; i < 10; i++) {
      lines.push(`| ${part}の${pick(PROPS)} | ${pick(VALUES)}・${pick(VALUES)}・${pick(VALUES)} | ${pick(VALUES)} | ${pick(NOTES)} |`);
    }
    lines.push('', `- ${pick(NOTES)}`, `- ${pick(NOTES)}`, '');
    sec++;
  }
  return lines;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// まず元の 7 ページ
const baseOrder = ['index', 'getting-started', 'works-list', 'editor', 'publish', 'troubleshooting', 'terminology'];
let total = 0;
for (const slug of baseOrder) {
  const md = fs.readFileSync(path.join(SRC, `${slug}.md`), 'utf8');
  fs.writeFileSync(path.join(OUT, `${slug}.md`), md);
  total += bytes(md);
}

// 部品リファレンスを、全文が TARGET に届くまで足す。決め手は位置に来たページに埋める
const order = [...baseOrder];
const placed = [];
let no = 1;
let next = 0;
while (total < TARGET) {
  const needle = NEEDLES[next] && total >= NEEDLES[next].at * TARGET ? NEEDLES[next++] : null;
  const lines = fillerPage(no, needle ? needle.topic : `${pick(PARTS)}と${pick(PARTS)}`);
  if (needle) {
    lines.splice(Math.floor(lines.length / 2), 0, '', ...needle.text, '');
    placed.push({ page: `ref-${String(no).padStart(3, '0')}`, at: needle.at, actual: total / TARGET });
  }
  const slug = `ref-${String(no).padStart(3, '0')}`;
  const md = lines.join('\n') + '\n';
  fs.writeFileSync(path.join(OUT, `${slug}.md`), md);
  order.push(slug);
  total += bytes(md);
  no++;
}
fs.writeFileSync(path.join(OUT, 'order.json'), JSON.stringify(order));
console.log(`content-big/ を作りました: ${order.length} ページ、原稿の合計 ${(total / 1e6).toFixed(2)} MB`);
for (const p of placed) console.log(`  決め手 ${Math.round(p.at * 100)}% → ${p.page} (全文の ${(p.actual * 100).toFixed(1)}% から)`);

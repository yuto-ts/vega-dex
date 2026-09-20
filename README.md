# vega-dex — ポケモン ファンゲーム攻略サイト

改造ポケモン「ポケットモンスター ベガ」の図鑑・技・攻略情報を、ポケモン徹底攻略風に検索・閲覧できる Web サイトです。ビルドすると単一の HTML ファイルになります。

公開ページ: https://yuto-ts.github.io/vega-dex/ （main への push で GitHub Actions がビルドして GitHub Pages に配信します。設定は `.github/workflows/pages.yml`）

データの出典は [Pokemon Altair @攻略wiki](https://w.atwiki.jp/altair1/) と [Pokémon Vega Wiki (fandom)](https://pokemon-vega.fandom.com/) です。非公式のファンサイトです。

## できること

- 図鑑一覧: タイプ（2 つまで AND）・特性・タマゴグループ・進化段階・専用/本家・名前で絞り込み、種族値で並べ替え
- ポケモン詳細: 種族値と順位、防御相性、進化系統図、生息地（トーホク地方マップ上に表示）、習得技 4 種
- 技一覧・技詳細: タイプ・分類・区分で絞り込み、その技を覚えるポケモンの逆引き
- 特性一覧、タイプ相性表、ひらがな対応のインクリメンタル検索
- トーホク地方マップ: 場所ごとの出現ポケモン（出現率・レベル）、ストーリー進行度ごとに捕まえられるお勧めポケモン
- 攻略: 攻略チャート（場所ごとのカード形式）、ジム攻略 8 件、ポケモンリーグ、スフィアいせき、アイテムデータ、入手方法一覧、Q&A、小ネタ
- 努力値カウンター（`#/vega/ev`）: 倒す相手を図鑑から検索して登録し、クリックまたはキー（A S D F G / Q W E R T、Shift で −1、Z でもどす）で討伐数と努力値を集計。ポケルス・パワー系アイテム・きょうせいギプスの補正、目標値までの必要匹数、複数体の管理。データはブラウザに自動保存（Chrome / Edge では指定した JSON ファイルにも自動保存）。JSON の書き出し・読み込みあり

## サイトを開く

### 1. ビルド済みファイルを開く

```bash
npm install
npm run build
```

`dist/vega-dex.html` ができます。ブラウザでこのファイルを直接開けば動きます（画像・データをすべて埋め込んだ約 9.5MB の単一ファイルです）。

必要なもの: Node.js、Python 3、Pillow（`pip install pillow`）。

### 2. 開発用にローカルサーバーで開く

```bash
npm install
npm run bundle          # src/ → dist/app.js, dist/app.css
python3 build.py        # data/ と画像 → data.js（dist/vega-dex.html も更新される）
python3 -m http.server 8767
```

ブラウザで http://localhost:8767/ を開くと、`index.html` が `data.js` と `dist/app.js` を読み込んで動きます。コードを直しながら見るなら `npm run watch`（保存のたびに再バンドル）が便利で、`data.js` のほうはデータや画像を変えたときだけ `build.py` で作り直せば足ります。

## リポジトリの構成

```
index.html          ヘッダー・フッターだけの骨組み。data.js と dist/app.js, dist/app.css を読む
src/                アプリ本体（TypeScript、ハッシュルーティングの SPA）
  main.ts             ルート定義と起動
  router.ts           #/ … のハッシュルーティング
  data.ts             VEGA データの型と索引（名前→ポケモン、技→覚えるポケモン など）
  html.ts             HTML 文字列の部品（タイプバッジ、スプライトなど）
  typechart.ts        タイプ相性表
  gyms.ts             ジムと町の対応
  stages.ts           ストーリー進行度ごとに行ける場所とお勧めポケモン
  figures.ts          場所・トレーナー画像の表示部品
  search.ts           ヘッダーの検索
  map/tiles.ts        タウンマップのタイル座標・道路の経路・ラベル位置
  map/render.ts       タウンマップの SVG 描画
  views/*.ts          ページごとの描画（図鑑一覧、詳細、技、マップ、場所、攻略、攻略チャート、努力値カウンター など）
  styles/*.css        画面ごとの CSS
build.py            データと画像を data.js にまとめ、index.html にバンドルを埋め込んで dist/vega-dex.html を作る
package.json        npm scripts（typecheck / bundle / watch / build）
data/
  dex2.json           wiki の各ポケモンページを解析した生データ（386 匹）
  guide.json          wiki の攻略ページ（攻略チャート、ジム、リーグ、アイテムなど 17 件）と分布データ
  moves_base.tsv      wiki の技データに無い第 1〜3 世代の技（原作値を手で入力）
img/NNN.png         wiki の図鑑画面のスクリーンショット。build.py がスプライト部分を切り出して埋め込む
map/
  world_map_rgb.png   ゲーム内タウンマップ。build.py が陸地の輪郭を SVG パスに変換する
  loc/                町の俯瞰マップ（fandom）
  src/                道路の俯瞰マップ、ダンジョンの入口・階層マップ、トレーナーのドット絵（fandom）
tools/recv.py       wiki をブラウザ内で解析した結果をフォーム POST で受け取るローカルサーバー（データ再取得時のみ使う）
dist/               生成物（git 管理外）
```

## データを取り直す

wiki は curl を Cloudflare が弾くため、ブラウザで wiki を開き、ページ内の JavaScript で各ページを fetch して解析し、結果を `tools/recv.py` にフォーム POST で送る方式を取っています。

```bash
python3 tools/recv.py 8766      # data/ に保存する受信サーバー
```

- 図鑑: https://w.atwiki.jp/altair1/pages/19.html を開き、一覧の各ページを fetch して `data/dex2.json` に送る
- 攻略ページ・分布データ: 攻略チャート（page 39）、ジム（40〜47）、リーグ（48）ほかを整形して `data/guide.json` に送る
- 画像: fandom の `static.wikia.nocookie.net` は curl で取得できる。ファイル名は `build.py` の `IMG_SRC` / `TRAINER_SRC` / `FLOOR_SRC` を参照

取り直したあとは `npm run build` で反映します。

## 既知の制限

- 第 1〜3 世代の技の威力・命中・PP は原作（第 5 世代基準）の値に wiki の「既存技変更点」を上書きしたもので、wiki に載っていないベガ独自の変更は反映されていません
- マホースの努力値は wiki の記載が不正なため「不明」と表示します
- トーホク地方マップの町・道路の位置は攻略チャートの接続関係から手で割り当てたもので、ひのしま・かみなりのしま・こおりのしまの 3 島の対応は推定です。はなれのことう・スフィアいせきはタウンマップに載っていません
- 「専用」ラベル（本家に登場しないポケモン・技）の判定は `build.py` の名前一覧によるもので、漏れがあるかもしれません
- ダンジョン内の階層マップは fandom にあるもの（7 か所）だけです

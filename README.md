# vega-dex — Pokemon Vega 図鑑サイト

Pokemon Altair @攻略wiki の「ポケモン図鑑V」（386 匹）をスクレイプし、ポケモン徹底攻略風に検索・並べ替えできる単一ファイルの Web サイトにしたもの。

## 構成

- `index.html` … アプリ本体（`data.js` を読む）。ハッシュルーティングの SPA
- `build.py` … `data/dex2.json` + `data/moves_base.tsv` + `img/*.png` → `data.js` と `dist/vega-dex.html`（単一ファイル）、`dist/vega-dex.artifact.html`（Artifact 用に doctype 等を剥がした版）
- `data/dex2.json` … wiki の各ポケモンページをブラウザ内でパースした生データ（2026-09-06 取得）
- `data/moves_base.tsv` … wiki の技データに無い第 1〜3 世代の技（第 5 世代基準の数値、手書き）
- `img/NNN.png` … wiki の図鑑画面スクショ（240x160）。build.py が右側 64x64 を切り出して背景を透過し data URI で埋め込む
- `tools/recv.py` … スクレイプ時にブラウザからフォーム POST を受けるローカルサーバー

## 更新手順

1. Browser pane で https://w.atwiki.jp/altair1/pages/19.html を開く（curl は Cloudflare に弾かれる）
2. `tools/recv.py 8766` を起動（`.claude/launch.json` の `recv`）
3. ページ内 JS で 386 ページを fetch → パース → `<form method=POST action=http://127.0.0.1:8766/dex2.json>` で送信
   （fetch/sendBeacon/window.open は Browser pane が localhost 宛を遮断するので、フォーム送信によるトップレベル遷移だけが通る）
4. `python3 build.py`
5. ローカル確認: `.claude/launch.json` の `vega-dex`（python http.server 8767）

## 機能

- 図鑑一覧: タイプ（2 つまで AND）・特性・タマゴグループ・進化段階・名前で絞り込み、種族値で並べ替え
- ポケモン詳細: 種族値バーと順位、防御相性、進化系統図、生息地、習得技 4 種（タマゴ技は遺伝経路つき）
- 技一覧・技詳細: タイプ・分類・区分で絞り込み、技を覚えるポケモンの逆引き
- 特性一覧、タイプ相性表、ひらがな対応のインクリメンタル検索

## 既知の制限

- 第 1〜3 世代の技の威力・命中・PP は原作値に wiki の「既存技変更点」を上書きしたもので、wiki に載っていないベガ独自変更は反映されない
- マホースの努力値は wiki の記載（「99～」）が不正なので「不明」と表示する
- wiki 側の誤記「ジビビール」は build.py でシビビールに読み替えている

## トーホク地方マップ

- `map/world_map_rgb.png` … ゲーム内タウンマップ（192x144、8px タイル 24x18）。出典は Pokémon Vega Wiki (fandom) の `World_map.png`（非公式ポケモンWiki aon49 の image.jpg と同一画像）
- 町 11・ダンジョン 8・道路/水道 23 のタイル座標は `index.html` の `TOWNS` / `DUNGEONS` / `ROUTES` に直書き。攻略チャート（wiki page 39）の接続関係から割り当てた
- ひのしま・かみなりのしま・こおりのしまの 3 島（アーシアとう周辺の 3 つの□）の対応は推定
- はなれのことう・スフィアいせきはタウンマップに無いので「マップ外」扱い
- `map/assign_check.png` は割り当てを重ねた確認用画像（`build.py` とは無関係、手動生成）
- 生息地文字列は `parseHab()` で「501/502/503ばんどうろ」→ 個別の道路、「サファリゾーン-東(草むら)」→ 場所・エリア・地形 に分解している

## ハブ構成と攻略ページ（2026-09-06 追加）

- ルーティングは `#/`（ハブ: ゲーム選択）→ `#/vega/...`（ベガ）。接頭辞なしの旧 URL もベガとして扱う
- ベガトップ（`#/vega`）は yakkun.com 風に「攻略」「データ」の 2 列メニュー
- 攻略ページ（`#/vega/g/<wiki page id>`）は wiki の HTML をブラウザ内で整形したもの（`data/guide.json` の `pages`）。取り込み対象: 攻略チャート(39)・ジム 8 件(40-47)・ポケモンリーグ(48)・スフィアいせき(49)・ミラージュバトル(50)・アイテム(54)・入手方法一覧(52)・Q&A(12)・小ネタ(57)・攻略情報トップ(16)
  - 整形ルール: コメント・画像・タグ編集 UI などを除去、openclose プラグイン→`<details>`、style は background-color と span の color だけ残す、wiki 内リンクは `#wiki/<pid>` にして表示時に図鑑/攻略ページへ解決
  - 表示時に `decorateWiki()` が表のセル（ポケモン名・技名）を自動リンクし、h3/h4 から目次を作る
- 分布データ（55, 56）は `build.py` で `enc`（場所 → [{area, post(殿堂入り後), rows:[地形, ポケモン, Lv, 出現率, 努力値]}]）に構造化し、場所ページ（`#/vega/loc/<名前>`）に表示
- 再取得: Browser pane で wiki を開き、この会話で使った整形 JS（README 上部の手順と同じフォーム POST 方式）で `data/guide.json` を送る

## 2026-09-06 の修正（マップの SVG 化ほか）

- マップは画像表示をやめ、`build.py` の `land_path()` で元画像（192x144）から陸地の輪郭を抽出（2 値化 → 境界追跡 → 共線点除去 → Chaikin 平滑化 2 回）した SVG パス（`VEGA.land`）と、`index.html` の `RPATH`（道路の折れ線）・`TOWNS`/`DUNGEONS`（マーカー）・`LBL`（ラベル位置）で描画する
  - 確認用レンダリング: `map/preview.svg` を同じ規則で生成し `qlmanage -t` で PNG 化（Browser pane が閉じているとスクリーンショットが撮れないため）
- 「専用」ラベル: `build.py` の `OFFICIAL`（本家第 1〜5 世代に存在する名前）に無いポケモンは `orig=true`。技は wiki の区分が「〜オリジナル」のもの。図鑑一覧・技一覧に「専用のみ／本家のみ」フィルターあり
- タイプ相性は「こうかは ばつぐんだ／いまひとつ／こうかが ない」表記。相性表は ◎△× 記号
- マップページの「ストーリー進行度」: `STAGES`（累積で行ける場所）と `TERRAIN_STAGE`（なみのり・いわくだき・つりざおの入手時期）から、その時点の分布データに出るポケモンを最終進化の種族値合計順に並べる。wiki のジムページ「お勧めポケモン」表（`VEGA.recs`、第 1〜4 ジムのみ記載あり）は先頭に表示
- ポケモン詳細 → ポケモン詳細の遷移ではスクロール位置を保持（進化系統のクリック用）

## 画像（2026-09-06 追加）

- 出典はすべて Pokémon Vega Wiki (fandom, CC-BY-SA) から curl で取得。`map/src/`（道路 23・ダンジョン入口 13・トレーナー 17）と `map/loc/`（町の俯瞰 12）
  - 道路: `Route_5xx.png`（515/521/522 はファイル名が `Route_15/21/22.png`）、町: `<City>.png`（Seafin は `Russette_City.png`）、ダンジョン: `<Landmark>.png`（240x112 の入口画像）、トレーナー: `Sprite_<Name>.png`（ギンノ・ライバル・博士は歩行グラのみ）
  - fandom の Category:Routes / Landmarks / Gym_Leaders / Elite_Four_Trainers から infobox の画像 URL を集めた（ブラウザ内 fetch）
- `build.py` の `IMG_SRC`（場所名 → ファイル）と `TRAINER_SRC`（トレーナー名 → ファイル）。長辺 720px に縮小して WebP（小さい画像はロスレス）、トレーナーは PNG のまま data URI で `VEGA.img` / `VEGA.trainer` に埋め込む。埋め込み後の HTML は約 5.7MB
- 表示: 場所ページ先頭に俯瞰マップ/入口画像、ジム攻略ページ先頭にリーダーのドット絵と町の俯瞰サムネ（`GYM_CITY`）、ポケモンリーグに四天王・チャンピオン、攻略チャートにライバル・博士。wiki 由来の表ではポケモン名のセルに図鑑スプライトを付ける（`decorateWiki`）
- 英名→和名の対応: Annette=アマナ, Geoff=ナギナタ, Brooke=キリ, Avery(Hanza)=ハンザ, Chie&Rito=モクとレン, Fenton=サザンカ, Tara=コナギ, Francis=スレナ, Theodore=ホオノキ, Vanessa=ミヤマ, Irene=ヤチヨ, Cole=カンゾウ, Sylvia=ギンノ
- ダンジョン内部の階層マップ（`FLOOR_SRC`、`VEGA.floors`）: fandom の allimages API（`/api.php?action=query&list=allimages`）で名前を探し、`prop=imageinfo&iiprop=url` で URL を取得。ときのようかん 11・チャンピオンロード 7・ひのしま 5・こころのやかた 3・ハクジのもり 2・かいていトンネル 1・ニューアイランドジム 2。場所ページに「ダンジョン内マップ」ギャラリー（クリックで拡大、再クリックで原寸）。ちえのどうくつ・ユキユキやま・ダークタワー・サファリゾーン・D・H 系・かみなり/こおりのしま・ポケモンじょう・スフィアいせきは fandom に内部マップ無し。埋め込み後の HTML は約 8.1MB
- マップとジム攻略の連携: `GYM_CITY`（ジムページ id → 町）から `CITY_GYM` を作り、マップ上の町マーカー右上に番号バッジ（クリックでジム攻略へ）、町一覧に「ジム攻略」リンク、町ページに `gymBox()`（リーダーのドット絵つき案内）を出す。町と同じタイルの施設（D・Hだんアジト等 6 件）はマップのホットスポットを作らず、町ページの「この町にある施設」からリンクする
- 町と同じマスの施設は `OFFS`（タイル単位のずらし量）でマーカー・ラベル・小ホットスポットだけ斜めに描く（ハイライトのマスは町と同じ）。`TOWNS` / `DUNGEONS` の並び順が一覧の順（攻略で訪れる順）。`tmap()` はデフォルトで 768px・ラベルあり
- 施設（DUNGEONS）のラベルは通常非表示（`text.lbl.dg{display:none}`）。ホットスポットのホバーで `.hov`、そのページで強調中（`tmap()` の hl に含まれる）なら `.show` を付けて表示する。町名は常時表示
- 攻略チャート（pid 39）は `vChart()` で専用表示。wiki HTML を `parseChart()` で「h3/h4 = パート」「先頭 li が場所名の ul = ステップ」「続く details/table = そのステップの補足」に分解し、ストーリー本編は「〜バッジ」を含むステップでの区切りで 9 章に分ける。各ステップはカード（左: 場所の画像か小地図、右: 番号・場所名リンク・登場トレーナーのドット絵・手順）。章の先頭に範囲をハイライトした 300px の地図。`[data-jump]` は共通のクリックハンドラでスクロール

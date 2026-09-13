#!/usr/bin/env python3
"""data/dex2.json + data/moves_base.tsv + img/*.png → dist/vega-dex.html（単一ファイル）と data.js

使い方: python3 build.py            # dist/vega-dex.html と data.js を生成
        python3 build.py --no-img   # 画像を埋め込まない（デバッグ用）
"""
import json, re, sys, os, base64, io
from collections import Counter, defaultdict
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
EMBED_IMG = '--no-img' not in sys.argv

raw = json.load(open('data/dex2.json', encoding='utf-8'))
D = raw['dex']
pid2no = {p['pid']: p['no'] for p in D.values()}
name2no = {p['name']: p['no'] for p in D.values()}
assert len(name2no) == len(D), '名前の重複あり'
name2no['ジビビール'] = name2no['シビビール']  # wiki 側の誤記


# 本家（第 1〜5 世代）に存在するポケモン名。図鑑 386 匹のうちこれに無いものは Vega/Altair 専用（orig=True）
OFFICIAL = set("""スバメ オオスバメ リオル ルカリオ デルビル ヘルガー ディグダ ダグトリオ トゲピー トゲチック トゲキッス ピチュー ピカチュウ ライチュウ エアームド
ニドラン♀ ニドリーナ ニドクイン ニドラン♂ ニドリーノ ニドキング ブイゼル フローゼル クヌギダマ フォレトス シェルダー パルシェン バルキー サワムラー エビワラー カポエラー
アブソル キリンリキ コイル レアコイル ジバコイル ヒトデマン スターミー ゴース ゴースト ゲンガー タマタマ ナッシー サイホーン サイドン ドサイドン トロピウス
ポリゴン ポリゴン２ ポリゴンＺ タマザラシ トドグラー トドゼルガ ユキカブリ ユキノオー ミルタンク ツボツボ ホーホー ヨルノズク エレキッド エレブー エレキブル
ブビィ ブーバー ブーバーン ガルーラ リリーラ ユレイドル プテラ ヨーギラス サナギラス バンギラス ダンバル メタング メタグロス フカマル ガバイト ガブリアス
フリーザー サンダー ファイヤー ライコウ エンテイ スイクン ディアルガ パルキア ダークライ ルギア ホウオウ ミュウツー ミュウ
フシギダネ フシギソウ フシギバナ ヒトカゲ リザード リザードン ゼニガメ カメール カメックス パチリス メタモン ムチュール ルージュラ ペラップ レディバ レディアン
アンノーン ケンタロス ルナトーン ソルロック テッポウオ オクタン メノクラゲ ドククラゲ ビリリダマ マルマイン ヤミカラス ドンカラス ゴニョニョ ドゴーム バクオング
クラブ キングラー ニューラ マニューラ キノココ キノガッサ ヤミラミ クチート ストライク ハッサム カイロス アーボ アーボック ドガース マタドガス
ヨマワル サマヨール ヨノワール ベロリンガ ベロベルト イトマル アリアドス バチュル デンチュラ ジーランス ピンプク ラッキー ハピナス ツチニン テッカニン ヌケニン
サンド サンドパン ラルトス キルリア サーナイト エルレイド フリージオ イシツブテ ゴローン ゴローニャ スコルピ ドラピオン カゲボウズ ジュペッタ ウリムー イノムー マンムー
マッギョ パッチール マスキッパ ギアル ギギアル ギギギアル ラブカス ラプラス サボネア ノクタス イシズマイ イワパレス テッシード ナットレイ シビシラス シビビール シビルドン
デリバード コータス ノコッチ カモネギ ズルッグ ズルズキン チュリネ ドレディア コジョフー コジョンド メグロコ ワルビル ワルビアル ヒードラン ラティアス ラティオス フィオネ マナフィ""".split())

STAT_KEYS = ['HP', '攻撃', '防御', '特攻', '特防', '素早さ']

def num(s):
    return int(s) if re.fullmatch(r'\d+', s or '') else None

def parse_evo(sec):
    """'リーティン(Lv.16)\nゴリチュウ(なつき)' → [{name,n,cond}]"""
    if not sec:
        return []
    out = []
    for line in sec['text'].split('\n'):
        line = line.strip()
        if not line or line in ('‐', '-', '進化しない', '―'):
            continue
        m = re.match(r'^(.+?)\((.*)\)$', line)
        name, cond = (m.group(1), m.group(2)) if m else (line, '')
        out.append({'name': name, 'n': name2no.get(name), 'cond': cond})
    return out

def split_lines(s):
    return [x for x in (s or '').split('\n') if x]

# ---- スプライト ------------------------------------------------------------
def sprite_data_uri(no):
    """図鑑画面スクショ(240x160)の右側64x64を切り出し、外周と繋がる背景色を透過にする"""
    im = Image.open(f'img/{no}.png').convert('RGBA').crop((153, 22, 217, 86))
    seeds = [(x, y) for x in range(64) for y in (0, 63)] + [(x, y) for y in range(64) for x in (0, 63)]
    for s in seeds:
        if im.getpixel(s)[3] != 0:
            ImageDraw.floodfill(im, s, (0, 0, 0, 0), thresh=24)
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

# ---- ポケモン -----------------------------------------------------------------
pokemon = []
for no in sorted(D):
    p = D[no]; sec = p['sec']
    stats = [int(x) for x in p['stats']]
    evs = [num(x) for x in p['evs']]
    if any(v is None for v in evs):
        evs = None  # wiki の記載が不正（例: マホース「99～」）
    rec = {
        'n': no, 'name': p['name'], 'pid': p['pid'],
        't': sec['/タイプ'].split('・'),
        'a': sec['/特性'].split('・'),
        's': stats, 'ev': evs,
        'pre': parse_evo(sec.get('進化前')),
        'evo': parse_evo(sec.get('進化後')),
        'noevo': (sec.get('進化前') or {}).get('text') == '進化しない',
        'orig': p['name'] not in OFFICIAL,
        'hab': split_lines(sec.get('入手方法/生息地')),
        'get': split_lines(sec.get('入手方法/入手方法')),
        'egg': sec['タマゴデータ/タマゴグループ'].split('・'),
        'hatch': sec['タマゴデータ/孵化歩数'],
        'gender': sec['隠しデータ/性別比率'],
        'catch': sec['隠しデータ/被捕獲率'],
        'happy': sec['隠しデータ/初期なつき度'],
        'bexp': sec['隠しデータ/基礎経験値'],
        'exp': sec['隠しデータ/経験値タイプ'],
        'item50': sec['野生で持っている道具/ときどき(50%)'],
        'item5': sec['野生で持っている道具/たまに(5%)'],
        'lv': [[r[0], r[1]] for r in p['moves']['レベルアップ'] if len(r) >= 2 and r[1] and r[1] != 'なし'],
        'tm': [[r[0], r[1]] for r in p['moves']['技マシン'] if len(r) >= 2 and r[1] and r[1] != 'なし'],
        'tutor': [r[0] for r in p['moves']['教え技'] if r and r[0] and r[0] != 'なし'],
        'eggm': [{'m': r['move'], 'c': r['chain']} for r in p['moves']['タマゴ技'] if r['move'] and r['move'] != 'なし'],
    }
    if EMBED_IMG:
        rec['img'] = sprite_data_uri(no)
    pokemon.append(rec)

# 進化リンク解決チェック
unresolved = [(p['name'], e['name']) for p in pokemon for e in p['pre'] + p['evo'] if e['n'] is None]
if unresolved:
    print('未解決の進化リンク:', unresolved)

# ---- 技 -------------------------------------------------------------------------
moves = {}
SRC_NAMES = ['第四世代', '第五世代', 'アルタイル・シリウスオリジナル', 'ベガオリジナル']
for ti, table in enumerate(raw['moves'][:4]):
    for r in table:
        if len(r) < 9:
            continue
        name, typ, cat, pw, acc, pp, tg, pr, eff = r[:9]
        moves[name] = {'t': typ, 'c': cat, 'p': num(pw), 'a': num(acc), 'pp': num(pp), 'tg': tg, 'pr': pr, 'e': eff,
                       'src': SRC_NAMES[ti]}
for line in open('data/moves_base.tsv', encoding='utf-8'):
    line = line.rstrip('\n')
    if not line or line.startswith('#'):
        continue
    f = line.split('\t')
    name, typ, cat, pw, acc, pp, eff, pr = f[:8]
    if name in moves:
        continue  # wiki 側を優先
    moves[name] = {'t': typ, 'c': cat, 'p': num(pw), 'a': num(acc), 'pp': num(pp), 'tg': '', 'pr': pr, 'e': eff,
                   'src': '第三世代以前'}
# 既存技変更点を適用
changed = 0
for name, chg in raw['moves'][4]:
    m = moves.get(name)
    if not m:
        print('変更点の技が未登録:', name); continue
    m['chg'] = chg.split('\n')
    for c in m['chg']:
        mm = re.match(r'^(威力|命中|PP|優先度)：(.+?)→(.+)$', c)
        if not mm:
            continue
        k, new = mm.group(1), mm.group(3).strip()
        key = {'威力': 'p', '命中': 'a', 'PP': 'pp', '優先度': 'pr'}[k]
        m[key] = new if key == 'pr' else num(new)
        changed += 1

used = Counter()
for p in pokemon:
    for _, m in p['lv']: used[m] += 1
    for _, m in p['tm']: used[m] += 1
    for m in p['tutor']: used[m] += 1
    for e in p['eggm']: used[e['m']] += 1
missing = sorted(m for m in used if m not in moves)
if missing:
    print('技データ未登録:', missing)

# 技マシン番号 → 技名（教え技一覧などで使う）
tm_no = {}
for p in pokemon:
    for no_, m in p['tm']:
        tm_no.setdefault(no_, m)

# タウンマップ（192x144, 8px タイル 24x18）。出典: pokemon-vega.fandom.com の World_map.png
map_uri = 'data:image/png;base64,' + base64.b64encode(open('map/world_map_rgb.png', 'rb').read()).decode()

# ---- 攻略ページ・分布データ（data/guide.json: wiki の攻略ページをブラウザ内で整形したもの）----
guide_raw = json.load(open('data/guide.json', encoding='utf-8'))
GUIDE_ORDER = ['39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '54', '52', '12', '57', '16']
guide = {pid: guide_raw['pages'][pid] for pid in GUIDE_ORDER if pid in guide_raw['pages']}

def norm_ev(s):
    return s.replace(' ', '').replace('　', '').translate(str.maketrans('０１２３４５６７８９ＨＰ', '0123456789HP'))

enc = {}
for pid in ('55', '56'):
    for sec in guide_raw['enc'][pid]:
        if sec['h'] != 'H4':
            continue
        post, groups = False, []
        for it in sec['items']:
            if 'text' in it:
                if it['text'].startswith('殿堂入り後'):
                    post = True
                continue
            area, rows = '', []
            def flush():
                if rows:
                    groups.append({'area': area, 'post': post, 'rows': list(rows)})
                    rows.clear()
            for r in it['table']:
                if len(r) > 1 and len(set(r)) == 1 and not r[0].endswith('%'):
                    flush(); area = r[0]; continue  # フロア・エリア見出し行
                if len(r) >= 4 and r[1]:
                    r = (r + [''] * 5)[:5]
                    rows.append([r[0], r[1], r[2].replace('Lv.', ''), r[3], norm_ev(r[4])])
            flush()
        if groups:
            enc[sec['title']] = groups
enc_names = set(p['name'] for p in pokemon)
unknown = sorted({r[1] for g in enc.values() for grp in g for r in grp['rows'] if r[1] not in enc_names})
if unknown:
    print('分布データの未知のポケモン名:', unknown)


# ---- タウンマップの陸地輪郭（192x144 の画像を 2 値化して境界をたどり、平滑化して SVG パスに）----
def land_path():
    im = Image.open('map/world_map_rgb.png').convert('RGB')
    W, H = im.size
    px = im.load()
    def is_land(x, y):
        if x < 0 or y < 0 or x >= W or y >= H:
            return False
        r, g, b = px[x, y]
        if b > g + 10 and b > r + 30:
            return False  # 海（縞模様の青）と海上ルートの青
        return True
    M = [[is_land(x, y) for x in range(W)] for y in range(H)]
    # 海上にある□（かいていトンネル・チャンピオンロード）は陸地扱いにしない
    for tx, ty in ((13, 14), (3, 14)):
        for y in range(ty * 8, ty * 8 + 8):
            for x in range(tx * 8, tx * 8 + 8):
                M[y][x] = False
    edges = {}  # 始点 → [終点]（時計回り）
    def add(a, b):
        edges.setdefault(a, []).append(b)
    for y in range(H):
        for x in range(W):
            if not M[y][x]:
                continue
            if not (y > 0 and M[y - 1][x]): add((x, y), (x + 1, y))
            if not (x + 1 < W and M[y][x + 1]): add((x + 1, y), (x + 1, y + 1))
            if not (y + 1 < H and M[y + 1][x]): add((x + 1, y + 1), (x, y + 1))
            if not (x > 0 and M[y][x - 1]): add((x, y + 1), (x, y))
    loops = []
    while edges:
        start = next(iter(edges))
        loop = [start]
        cur = start
        while True:
            nxt = edges[cur].pop()
            if not edges[cur]:
                del edges[cur]
            if nxt == start:
                break
            loop.append(nxt)
            cur = nxt
        loops.append(loop)
    def area(l):
        return abs(sum(l[i][0] * l[(i + 1) % len(l)][1] - l[(i + 1) % len(l)][0] * l[i][1] for i in range(len(l)))) / 2
    loops = [l for l in loops if area(l) >= 12]
    def collinear(l):
        out = []
        n = len(l)
        for i in range(n):
            a, b, c = l[i - 1], l[i], l[(i + 1) % n]
            if (b[0] - a[0]) * (c[1] - b[1]) != (b[1] - a[1]) * (c[0] - b[0]):
                out.append(b)
        return out
    def chaikin(l):
        out = []
        n = len(l)
        for i in range(n):
            a, b = l[i], l[(i + 1) % n]
            out.append((a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25))
            out.append((a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75))
        return out
    paths = []
    for l in loops:
        l = collinear(l)
        for _ in range(2):
            l = chaikin(l)
        paths.append('M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in l) + 'Z')
    return ''.join(paths)

# ジム攻略ページの「お勧めポケモン」表を抽出 → recs[pid] = [[名前, 説明]]
import html as _html
def gym_recs(page_html):
    out = []
    for tbl in re.findall(r'<table>(.*?)</table>', page_html, flags=re.S):
        if '<th>ポケモン</th>' not in tbl or '<th>説明</th>' not in tbl:
            continue
        for tr in re.findall(r'<tr>(.*?)</tr>', tbl, flags=re.S):
            cells = re.findall(r'<td[^>]*>(.*?)</td>', tr, flags=re.S)
            if len(cells) >= 2:
                name = _html.unescape(re.sub(r'<[^>]+>', '', cells[0])).strip()
                desc = _html.unescape(re.sub(r'<br\s*/?>', '\n', cells[1]))
                desc = re.sub(r'<[^>]+>', '', desc).strip()
                out.append([name, desc])
    return out
recs = {pid: gym_recs(guide[pid]['html']) for pid in ['40', '41', '42', '43', '44', '45', '46', '47'] if pid in guide}
print('お勧めポケモン:', {pid: len(v) for pid, v in recs.items()})

# ---- 場所・トレーナーの画像（Pokémon Vega Wiki (fandom) から取得、map/src と map/loc）----
SEA_NO = {'507', '508', '509', '510', '511', '512', '513', '523'}
IMG_SRC = {f'{n}ばん{"すいどう" if str(n) in SEA_NO else "どうろ"}': f'map/src/r{n}.png' for n in range(501, 524)}
IMG_SRC.update({
    'ハクジタウン': 'map/loc/Porcelia_Town.png', 'アヤメシティ': 'map/loc/Junopsis_City.png', 'ミルシティ': 'map/loc/Russette_City.png',
    'シオウシティ': 'map/loc/Gamboge_City.png', 'ヒスイシティ': 'map/loc/Nephrite_City.png', 'オウニシティ': 'map/loc/Orpimence_City.png',
    'カラスバシティ': 'map/loc/Ravenplume_City.png', 'ラピスラシティ': 'map/loc/Lapizula_City.png', 'アーシアとう': 'map/loc/Shamouti_Island.png',
    'ニューアイランド': 'map/loc/New_Island.png', 'シャクドウじま': 'map/loc/Shakudo_Island.png', 'はなれのことう': 'map/loc/Distant_Island.png',
    'ときのようかん': 'map/src/d_chateau.png', 'ひのしま': 'map/src/d_fire.png', 'ユキユキやま': 'map/src/d_snowfall.png', 'ポケモンじょう': 'map/src/d_castle.png',
    'ハクジのもり': 'map/src/d_forest.png', 'サファリゾーン': 'map/src/d_safari.png', 'こころのやかた': 'map/src/d_mansion.png', 'ダークタワー': 'map/src/d_tower.png',
    'かいていトンネル': 'map/src/d_tunnel.png', 'ちえのどうくつ': 'map/src/d_wiseman.png', 'リムけんきゅうじょ': 'map/src/d_lab.png',
})
TRAINER_SRC = {'アマナ': 't_annette', 'ナギナタ': 't_geoff', 'キリ': 't_brooke', 'ハンザ': 't_avery', 'モクとレン': 't_chierito', 'サザンカ': 't_fenton',
               'コナギ': 't_tara', 'ミュウツー': 't_mewtwo', 'スレナ': 't_francis', 'ホオノキ': 't_theodore', 'ミヤマ': 't_vanessa', 'ヤチヨ': 't_irene',
               'カンゾウ': 't_cole', 'ギンノ': 't_sylvia', 'ライバル': 't_rival', 'ヒイラギ': 't_prof'}
def webp_uri(path, long=720):
    im = Image.open(path).convert('RGBA')
    lossless = im.width <= 260
    sc = min(1, long / max(im.size))
    if sc < 1:
        im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=82, lossless=lossless, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
def png_uri(path):
    im = Image.open(path).convert('RGBA'); buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
imgs = {k: webp_uri(v) for k, v in IMG_SRC.items() if os.path.exists(v)}
trainers = {k: png_uri(f'map/src/{v}.png') for k, v in TRAINER_SRC.items() if os.path.exists(f'map/src/{v}.png')}
print(f'場所画像 {len(imgs)} 件, トレーナー画像 {len(trainers)} 件')

# ダンジョン内部の階層マップ（fandom）: 場所名 → [(ラベル, ファイル)]
FLOOR_SRC = {
    'ときのようかん': [('1F', 'f_chateau_1F'), ('1F 洞穴', 'f_chateau_1F_cave'), ('2F', 'f_chateau_2F'), ('2F 東階段', 'f_chateau_2F_east'), ('2F 西階段', 'f_chateau_2F_west'), ('2F 右端', 'f_chateau_2F_right'), ('3F', 'f_chateau_3F'), ('B1F', 'f_chateau_B1F'), ('B1F 奥', 'f_chateau_B1F_back'), ('B1F 迷路', 'f_chateau_B1F_maze'), ('B2F', 'f_chateau_B2F')],
    'ひのしま': [('1F', 'f_fire_1F'), ('B1F', 'f_fire_B1F'), ('B2F', 'f_fire_B2F'), ('B3F', 'f_fire_B3F'), ('B4F', 'f_fire_B4F')],
    'ハクジのもり': [('東エリア', 'f_forest_east'), ('西エリア', 'f_forest_west')],
    'こころのやかた': [('1F', 'f_mansion_1F'), ('2F', 'f_mansion_2F'), ('B1F', 'f_mansion_B1F')],
    'かいていトンネル': [('1F', 'f_tunnel_1F')],
    'チャンピオンロード': [('1F', 'f_victory_1F'), ('B1F', 'f_victory_B1F'), ('B2F', 'f_victory_B2F'), ('B3F', 'f_victory_B3F'), ('B4F', 'f_victory_B4F'), ('B5F', 'f_victory_B5F'), ('B6F', 'f_victory_B6F')],
    'ニューアイランド': [('ジム前', 'f_newisland_gymfront'), ('ジムの仕掛け', 'f_newisland_gympuzzle')],
}
floors = {loc: [[lab, webp_uri(f'map/src/{f}.png')] for lab, f in fl if os.path.exists(f'map/src/{f}.png')] for loc, fl in FLOOR_SRC.items()}
print(f'階層マップ {sum(len(v) for v in floors.values())} 枚')

data = {
    'img': imgs, 'trainer': trainers, 'floors': floors,
    'pokemon': pokemon, 'moves': moves, 'tm': tm_no, 'map': map_uri, 'land': land_path(), 'recs': recs, 'guide': guide, 'enc': enc,
    'source': 'https://w.atwiki.jp/altair1/pages/19.html', 'fetched': '2026-09-06',
}
js = 'const VEGA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
open('data.js', 'w', encoding='utf-8').write(js)

html = open('index.html', encoding='utf-8').read()
html = html.replace('<script src="data.js"></script>', '<script>\n' + js + '</script>')
os.makedirs('dist', exist_ok=True)
open('dist/vega-dex.html', 'w', encoding='utf-8').write(html)
# Artifact 用: <!doctype>/<html>/<head>/<body> を剥がした版
art = re.sub(r'^\s*<!doctype html>\s*<html lang="ja">\s*<head>\s*<meta charset="utf-8">\s*', '', html, flags=re.I)
art = art.replace('<meta name="viewport" content="width=device-width, initial-scale=1">\n', '')
art = art.replace('</head>\n<body>\n', '').replace('\n</body>\n</html>', '')
open('dist/vega-dex.artifact.html', 'w', encoding='utf-8').write(art)
print(f'guide={len(guide)} enc={len(enc)} ', end='')
print(f'pokemon={len(pokemon)} moves={len(moves)} (wiki {sum(1 for m in moves.values() if m["src"]!="第三世代以前")}, base {sum(1 for m in moves.values() if m["src"]=="第三世代以前")}), 変更点適用={changed}, data.js={len(js)//1024}KB, html={len(html)//1024}KB')

// 場所・トレーナーの画像まわりの部品（Pokémon Vega Wiki 由来の画像を表示する）
import { V, type GuidePage } from './data';
import { esc, enc, ty, trImg } from './html';
import { TCOL } from './typechart';
import { CITY_GYM, GYM_CITY, gymBadge, gymLeaderOf, gymTypeOf } from './gyms';

const LEAGUE = ['ホオノキ', 'ミヤマ', 'ヤチヨ', 'カンゾウ', 'ギンノ'];

export const cityThumb = (city: string, label?: string) => V.img[city] ? `<a class="thumb" href="#/vega/loc/${enc(city)}"><img src="${V.img[city]}" alt="${esc(city)}" loading="lazy">${esc(label || city)}</a>` : '';

/** 町ページ用: その町のジムへの案内 */
export function gymBox(city: string) {
  const pid = CITY_GYM[city]; if (!pid) return '';
  const g = V.guide[pid], leader = gymLeaderOf(pid), type = gymTypeOf(pid);
  const badge = type.split('・').filter(t => TCOL[t]).map(t => `<span class="ty small" style="background:${TCOL[t]}">${esc(t)}</span>`).join(' ');
  return `<a class="gymbox" href="#/vega/g/${pid}">${trImg(leader, 'tr')}<span><b>${gymBadge(pid)} ${esc(g.title)}</b><br><span class="muted">ジムリーダー ${esc(leader)}　${badge}</span><br><span class="go">ジム攻略ページへ ▶</span></span></a>`;
}

/** ダンジョン内部の階層マップ（クリックで拡大） */
export function floorGallery(name: string, title = 'ダンジョン内マップ') {
  const fl = V.floors[name];
  if (!fl || !fl.length) return '';
  return `<h2>${esc(title)} <span class="cnt">${fl.length} 枚・クリックで拡大</span></h2><div class="floors">${fl.map(([lab, uri]) => `<figure class="floor"><img src="${uri}" alt="${esc(name)} ${esc(lab)}" loading="lazy" data-zoom><figcaption>${esc(lab)}</figcaption></figure>`).join('')}</div><p class="src">出典: Pokémon Vega Wiki (fandom)</p>`;
}

/** 攻略ページ先頭の画像（ジムリーダーのドット絵・町の俯瞰・四天王） */
export function guideHero(pid: string, g: GuidePage) {
  const city = GYM_CITY[pid];
  if (city) {
    const leader = gymLeaderOf(pid), type = gymTypeOf(pid);
    return `<div class="leader">${trImg(leader)}<div><div class="role">ジムリーダー</div><div class="who">${esc(leader)}</div><div>${type.split('・').filter(t => TCOL[t]).map(t => ty(t)).join(' ') || esc(type)}</div><div class="src">ドット絵の出典: Pokémon Vega Wiki</div></div>${cityThumb(city, city + 'の俯瞰マップ')}</div>${pid === '47' ? floorGallery('ニューアイランド', 'ジムの画像') : ''}`;
  }
  if (pid === '48') return `<div class="leader"><div class="trs">${LEAGUE.map((n, i) => `<div class="tr1">${trImg(n)}<span>${i < 4 ? '四天王' : 'チャンピオン'}</span><b>${esc(n)}</b></div>`).join('')}</div>${cityThumb('シャクドウじま')}</div>`;
  if (pid === '39') return `<div class="leader"><div class="trs"><div class="tr1">${trImg('ライバル')}<span>ライバル</span></div><div class="tr1">${trImg('ヒイラギ')}<span>博士</span><b>ヒイラギ</b></div></div>${cityThumb('ハクジタウン', 'はじまりの町 ハクジタウン')}</div>`;
  if (pid === '49') return `<div class="leader">${cityThumb('はなれのことう')}</div>`;
  return '';
}

/** [data-zoom] の画像をクリックで全画面表示（もう一度クリックで原寸、背景クリックか Esc で閉じる） */
export function bindZoom() {
  document.querySelectorAll<HTMLImageElement>('img[data-zoom]').forEach(im => im.addEventListener('click', () => {
    const z = document.createElement('div'); z.className = 'zoom';
    z.innerHTML = `<img src="${im.src}" alt=""><div class="cap">${esc(im.alt)}　（クリックで閉じる・もう一度クリックで原寸）</div>`;
    z.addEventListener('click', e => { if ((e.target as Element).tagName === 'IMG') { z.classList.toggle('native'); } else z.remove(); });
    document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { z.remove(); document.removeEventListener('keydown', onKey); } });
    document.body.appendChild(z);
  }));
}

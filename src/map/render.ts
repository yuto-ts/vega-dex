// タウンマップの描画（SVG）とホットスポット
import { V } from '../data';
import { esc, enc } from '../html';
import { CITY_GYM, gymNo } from '../gyms';
import { MAP_W, MAP_H, TOWNS, DUNGEONS, OFFS, TILE, RPATH, LBL, locCount, type Tile } from './tiles';

const key = ([x, y]: Tile) => x + ',' + y;
/** 町のあるタイル（同じマスの施設はマーカー・ホットスポットを町に譲る） */
const TOWN_KEYS = new Set(Object.values(TOWNS).filter(ts => ts.length).map(([t]) => key(t)));
const tileStyle = ([x, y]: Tile) => `left:${x / MAP_W * 100}%;top:${y / MAP_H * 100}%;width:${100 / MAP_W}%;height:${100 / MAP_H}%`;
const cx = ([x, y]: Tile): Tile => [(x + .5) * 8, (y + .5) * 8];

// タイル集合を 1 つの領域として描く: 塗りは各タイル、線は外周（隣が同じ集合なら辺を引かない）
function region(tiles: Tile[], cls: string) {
  const S = new Set(tiles.map(key));
  const fills = tiles.map(([x, y]) => `<rect class="hl-fill ${cls}" x="${x}" y="${y}" width="1" height="1"/>`).join('');
  if (cls) return fills;
  let d = '';
  tiles.forEach(([x, y]) => {
    if (!S.has(key([x, y - 1]))) d += `M${x} ${y}h1`;
    if (!S.has(key([x, y + 1]))) d += `M${x} ${y + 1}h1`;
    if (!S.has(key([x - 1, y]))) d += `M${x} ${y}v1`;
    if (!S.has(key([x + 1, y]))) d += `M${x + 1} ${y}v1`;
  });
  return fills + `<path class="hl-line" d="${d}"/>`;
}

function mapSvg(labels: boolean, showSet: Set<string> = new Set()) {
  const pts = (ps: Tile[]) => ps.map(cx).map(([x, y]) => `${x},${y}`).join(' ');
  let s = `<svg class="map" viewBox="0 0 ${MAP_W * 8} ${MAP_H * 8}" aria-label="トーホク地方のタウンマップ"><defs><pattern id="sea" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#7fabee"/><rect y="2" width="4" height="1" fill="#8fb8f2"/></pattern></defs><rect width="100%" height="100%" fill="url(#sea)"/>
  <path class="land" d="${V.land}"/>`;
  const roads = Object.entries(RPATH).filter(([n]) => !n.includes('すいどう')), seas = Object.entries(RPATH).filter(([n]) => n.includes('すいどう'));
  roads.forEach(([, ps]) => { s += `<polyline class="road-e" points="${pts(ps)}"/>`; });
  roads.forEach(([, ps]) => { s += `<polyline class="road" points="${pts(ps)}"/>`; });
  seas.forEach(([, ps]) => { s += `<polyline class="sea-e" points="${pts(ps)}"/><polyline class="sea" points="${pts(ps)}"/>`; });
  Object.entries(DUNGEONS).forEach(([n, ts]) => {
    if (!ts.length) return;
    const o = OFFS[n];
    if (!o && TOWN_KEYS.has(key(ts[0]))) return;
    const [x, y] = cx(o ? [ts[0][0] + o[0], ts[0][1] + o[1]] : ts[0]);
    s += `<rect class="dg" x="${x - 2.8}" y="${y - 2.8}" width="5.6" height="5.6" rx=".8"/>`;
  });
  Object.entries(TOWNS).forEach(([n, [t]]) => {
    if (!t) return;
    const [x, y] = cx(t);
    s += `<circle class="town" cx="${x}" cy="${y}" r="3.3"/><circle class="town-in" cx="${x}" cy="${y}" r="1.3"/>`;
    if (CITY_GYM[n]) s += `<g class="gymmark"><rect x="${x + 2.2}" y="${y - 6.2}" width="4.6" height="4.6" rx=".6"/><text x="${x + 4.5}" y="${y - 2.4}" text-anchor="middle">${gymNo(CITY_GYM[n])}</text></g>`;
  });
  if (labels) {
    const put = (n: string, ts: Tile[], cls: 'dg' | 'town') => {
      if (!ts.length) return;
      const o = OFFS[n] || [0, 0];
      if (cls === 'dg' && !OFFS[n] && TOWN_KEYS.has(key(ts[0]))) return;
      const [dx, dy, an] = LBL[n] || [0, -.5, 'middle'];
      const [x, y] = cx([ts[0][0] + o[0] + dx, ts[0][1] + o[1] + dy]);
      s += `<text class="lbl ${cls}${cls === 'dg' && showSet.has(n) ? ' show' : ''}" data-loc="${esc(n)}" x="${x}" y="${y}" text-anchor="${an}">${esc(n)}</text>`;
    };
    Object.entries(DUNGEONS).forEach(([n, ts]) => put(n, ts, 'dg'));
    Object.entries(TOWNS).forEach(([n, ts]) => put(n, ts, 'town'));
  }
  return s + '</svg>';
}

export interface TmapOpts {
  /** 場所名ラベルを描くか（既定: 描く） */
  labels?: boolean;
  width?: number;
  /** hl 以外の場所を暗くする */
  dimAll?: boolean;
  /** この集合以外の場所を暗くする */
  dimSet?: Set<string> | null;
  /** クリックで場所ページ・ジム攻略へ飛ぶリンクを重ねる */
  hotspots?: boolean;
}

/** hl の場所をぶんぷ風に点滅ハイライトしたタウンマップ */
export function tmap(hl: string[], opts: TmapOpts = {}) {
  const hlSet = new Set(hl);
  let s = `<div class="tmap" ${opts.width ? `style="width:${opts.width}px"` : ''}>${mapSvg(opts.labels !== false, hlSet)}`;
  let svg = '';
  const dimOutside = (keep: Set<string>) => region(Object.entries(TILE).filter(([n]) => !keep.has(n)).flatMap(([, ts]) => ts), 'dim');
  if (opts.dimAll) svg += dimOutside(hlSet);
  if (opts.dimSet) svg += dimOutside(opts.dimSet);
  const hlTiles = [...new Set(hl.flatMap(n => (TILE[n] || []).map(key)))].map(k => k.split(',').map(Number) as Tile);
  if (hlTiles.length) svg += region(hlTiles, '');
  if (svg) s += `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="none" aria-hidden="true">${svg}</svg>`;
  if (opts.hotspots) s += hotspots();
  return s + '</div>';
}

function hotspots() {
  let s = '';
  const pct = (v: number, of: number) => v / of * 100;
  const hot = (attrs: string, title: string, [x, y]: [number, number], size: number) =>
    `<a class="hot gymhot" ${attrs} title="${title}" style="left:${pct(x, MAP_W)}%;top:${pct(y, MAP_H)}%;width:${pct(size, MAP_W)}%;height:${pct(size, MAP_H)}%"></a>`;
  // 町と同じマスの施設は、ずらして描いたマーカーの上に小さいホットスポットを置く
  Object.entries(OFFS).forEach(([n, o]) => {
    const t = (DUNGEONS[n] || [])[0];
    if (!t) return;
    s += hot(`data-loc="${esc(n)}" href="#/vega/loc/${enc(n)}"`, `${esc(n)}（${locCount(n)} 匹）`, [t[0] + .5 + o[0] - .4, t[1] + .5 + o[1] - .4], .8);
  });
  // 町と同じタイルにある施設（D・Hだんアジト等）はタイルのホットスポットを作らない（町を優先し、町ページから施設へリンクする）
  Object.entries(TILE).forEach(([n, ts]) => ts.forEach(t => {
    if (DUNGEONS[n] && !TOWNS[n] && TOWN_KEYS.has(key(t))) return;
    s += `<a class="hot" data-loc="${esc(n)}" href="#/vega/loc/${enc(n)}" title="${esc(n)}（${locCount(n)} 匹）${CITY_GYM[n] ? '・第' + gymNo(CITY_GYM[n]) + 'ジムあり' : ''}" style="${tileStyle(t)}"></a>`;
  }));
  // ジムのある町: マーカー右上の番号をクリックするとジム攻略へ
  Object.entries(TOWNS).forEach(([n, ts]) => {
    const pid = CITY_GYM[n];
    if (!pid || !ts.length) return;
    const [x, y] = ts[0];
    s += hot(`href="#/vega/g/${pid}"`, `${esc(V.guide[pid].title)}（ジム攻略）`, [x + .75, y - .3], .7);
  });
  return s;
}

/** ホットスポットのホバーで施設ラベルを表示する */
export function bindMapHover() {
  document.querySelectorAll<HTMLElement>('.tmap').forEach(m => {
    const hov = (loc: string | undefined, on: boolean) => {
      m.querySelectorAll<HTMLElement>('.hot').forEach(h => h.classList.toggle('hov', on && h.dataset.loc === loc));
      m.querySelectorAll<SVGElement>('text.lbl.dg').forEach(t => t.classList.toggle('hov', on && t.dataset.loc === loc));
    };
    m.addEventListener('mouseover', e => { const h = (e.target as Element).closest<HTMLElement>('.hot'); if (h) hov(h.dataset.loc, true); });
    m.addEventListener('mouseout', e => { const h = (e.target as Element).closest<HTMLElement>('.hot'); if (h) hov(h.dataset.loc, false); });
  });
}

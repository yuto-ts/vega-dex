// 場所ページ（出現ポケモン・画像・マップ）
import { V, encPokemon } from '../data';
import { esc, img, plink, tys, loclink } from '../html';
import { TOWNS, DUNGEONS, ROUTES, TILE, LOC, locCount } from '../map/tiles';
import { tmap } from '../map/render';
import { gymBox, floorGallery } from '../figures';

/** 分布データ（wiki の出現率つき表） */
function encTable(name: string) {
  const groups = V.enc[name];
  if (!groups) return '';
  return groups.map(g => `<div class="enc-area">${esc(g.area || '全域')}${g.post ? '<span class="post">殿堂入り後</span>' : ''}</div>
  <div class="tbl-wrap compact"><table><thead><tr><th>地形</th><th></th><th>ポケモン</th><th>タイプ</th><th class="num">Lv</th><th class="num">出現率</th><th>努力値</th></tr></thead><tbody>
  ${g.rows.map(r => {
    const p = encPokemon(r[1]);
    const form = p && r[1] !== p.name ? ` <span class="muted">${esc(r[1].slice(p.name.length))}</span>` : '';
    return `<tr><td><span class="terrain">${esc(r[0])}</span></td><td>${p ? img(p) : ''}</td><td>${p ? plink(p) + form : esc(r[1])}</td><td>${p ? tys(p.t, true) : ''}</td><td class="num">${esc(r[2])}</td><td class="num">${esc(r[3])}</td><td class="muted" style="font-size:12px">${esc(r[4])}</td></tr>`;
  }).join('')}
  </tbody></table></div>`).join('');
}

/** 町と同じタイルにある施設への案内 */
function facilities(name: string) {
  if (!TOWNS[name] || !TOWNS[name].length) return '';
  const k = TOWNS[name][0].join(',');
  const ds = Object.entries(DUNGEONS).filter(([, ts]) => ts.length && ts[0].join(',') === k).map(([d]) => d);
  return ds.length ? `<p class="note" style="margin:0 0 12px">この町にある施設: ${ds.map(d => `${loclink(d, `<b>${esc(d)}</b>`)}（${locCount(d)} 匹）`).join('　')}</p>` : '';
}

export function vLoc(name: string) {
  const rows = (LOC[name] || []).slice().sort((a, b) => a.p.n.localeCompare(b.p.n) || a.sub.localeCompare(b.sub, 'ja'));
  const tiles = TILE[name];
  const pic = V.img[name];
  const kind = ROUTES[name] ? '俯瞰マップ' : TOWNS[name] || name === 'はなれのことう' ? '町の俯瞰マップ' : '入口の風景';
  const hasEnc = !!V.enc[name];
  const habTable = rows.length
    ? `<div class="tbl-wrap compact"><table><thead><tr><th>No.</th><th></th><th>名前</th><th>タイプ</th><th>エリア</th><th>出現</th></tr></thead><tbody>${rows.map(r => `<tr><td class="num muted">${r.p.n}</td><td>${img(r.p)}</td><td>${plink(r.p)}</td><td>${tys(r.p.t, true)}</td><td>${esc(r.sub) || '—'}</td><td class="muted">${esc(r.detail) || '—'}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="muted">この場所に出現する野生ポケモンは図鑑データにありません。</p>';
  return `<div class="crumb"><a href="#/vega/map">マップ</a></div>
  <h1>${esc(name)} <span class="sub">${new Set(rows.map(r => r.p.n)).size} 匹</span></h1>
  ${pic ? `<figure class="locfig"><img class="${pic.length < 20000 ? 'px' : ''}" src="${pic}" alt="${esc(name)}の${kind}" loading="lazy"><figcaption>${esc(name)}の${kind}（出典: <a href="https://pokemon-vega.fandom.com/wiki/Tohoak" target="_blank" rel="noopener">Pokémon Vega Wiki</a>）</figcaption></figure>` : ''}
  ${gymBox(name)}
  ${facilities(name)}
  ${floorGallery(name)}
  <div class="mapwrap">${tiles && tiles.length ? tmap([name], { dimAll: true, hotspots: true }) : '<p class="muted">この場所はタウンマップに載っていません。</p>'}
  <div>${hasEnc ? `<h2 style="margin-top:0">出現ポケモン <span class="cnt">分布データ（出現率・レベル）</span></h2>${encTable(name)}<details class="chain" style="margin-top:10px"><summary>図鑑の生息地欄からの一覧（${rows.length} 件）</summary>` : ''}
  ${habTable}${hasEnc ? '</details>' : ''}</div></div>`;
}

import { ABIL } from '../data';
import { esc, enc } from '../html';

/** 特性一覧 */
export function vAbilities() {
  const names = Object.keys(ABIL).sort((x, y) => x.localeCompare(y, 'ja'));
  return `<h1>特性一覧 <span class="sub">${names.length} 種</span></h1>
  <div class="tbl-wrap" style="max-width:720px"><table><thead><tr><th>特性</th><th class="num">匹数</th><th>持っているポケモン</th></tr></thead><tbody>
  ${names.map(a => `<tr><td><a href="#/vega/a/${enc(a)}" class="name">${esc(a)}</a></td><td class="num">${ABIL[a].length}</td><td style="font-size:12px">${ABIL[a].slice(0, 8).map(p => `<a href="#/vega/p/${p.n}">${esc(p.name)}</a>`).join('、')}${ABIL[a].length > 8 ? `、<a href="#/vega/a/${enc(a)}">他 ${ABIL[a].length - 8} 匹</a>` : ''}</td></tr>`).join('')}
  </tbody></table></div>`;
}

import { TYPES, TCOL, CH } from '../typechart';

/** タイプ相性表 */
export function vTypes() {
  const cell = (v: number) => v === 2 ? '<td class="x2" title="こうかは ばつぐんだ（2倍）">◎</td>' : v === 0.5 ? '<td class="x05" title="こうかは いまひとつ（1/2倍）">△</td>' : v === 0 ? '<td class="x0" title="こうかが ない（0倍）">×</td>' : '<td title="等倍"></td>';
  return `<h1>タイプ相性表 <span class="sub">縦: 攻撃側のタイプ → 横: 防御側のタイプ</span></h1>
  <div class="frow" style="margin-bottom:10px;font-size:13px"><span class="matrix-key x2">◎</span> こうかは ばつぐんだ（2倍）　<span class="matrix-key x05">△</span> こうかは いまひとつ（1/2倍）　<span class="matrix-key x0">×</span> こうかが ない（0倍）　<span class="matrix-key">　</span> 等倍</div>
  <div class="tbl-wrap"><table class="matrix"><thead><tr><th>攻撃＼防御</th>${TYPES.map(t => `<th class="rot" style="background:${TCOL[t]};color:#fff">${t}</th>`).join('')}</tr></thead><tbody>
  ${TYPES.map(a => `<tr><th style="background:${TCOL[a]};color:#fff;position:static">${a}</th>${TYPES.map(d => cell(CH[a][d])).join('')}</tr>`).join('')}</tbody></table></div>
  <p class="note">第 2〜5 世代の相性表（フェアリータイプ無し）。複合タイプの防御相性は各ポケモンの詳細ページに表示します。</p>`;
}

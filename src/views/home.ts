// ベガ トップ（攻略・データの 2 列メニュー）
import { V, P, M, EGGG } from '../data';
import { esc, enc, ty } from '../html';
import { TYPES } from '../typechart';
import { GYMS } from '../gyms';
import { listTable } from './list';

/** [攻略ページ id（または gyms / map）, 表示名, 説明] */
export const GUIDE_MENU: [string, string, string][] = [
  ['39', '攻略チャート', 'ストーリー〜殿堂入り後〜エリア調査'],
  ['gyms', 'ジム攻略', '8 ジムのリーダー手持ちと攻略法'],
  ['48', 'ポケモンリーグ', '四天王・チャンピオン（初回・強化）'],
  ['49', 'スフィアいせき', '殿堂入り後の最終ダンジョン'],
  ['50', 'ミラージュバトルシステム', 'クリア後のバトル施設'],
  ['54', 'アイテムデータ', '入手場所・技マシン・ショップ'],
  ['52', 'ポケモン入手方法一覧', '生息地と入手方法の一覧表'],
  ['map', '出現ポケモン分布', '道路・ダンジョンごとの出現率とレベル'],
  ['12', 'Q&A', 'よくある質問'],
  ['57', '小ネタ', '細かい仕様・小技'],
];
export const gHref = (pid: string) => pid === 'gyms' ? '#/vega/guide' : pid === 'map' ? '#/vega/map' : `#/vega/g/${pid}`;

export function vHome() {
  const G = V.guide;
  return `<div class="crumb"><a href="#/">ファンゲーム攻略</a> › ベガ</div>
  <h1>ポケットモンスター ベガ 攻略 <span class="sub">トーホク地方 ／ 図鑑 ${P.length} 匹・技 ${Object.keys(M).length}</span></h1>
  <div class="menu2">
    <div><h2>攻略</h2><ul>${GUIDE_MENU.map(([pid, t, d]) => `<li><a href="${gHref(pid)}">${esc(t)}<span>${esc(d)}</span></a></li>${pid === 'gyms' ? GYMS.map(g => `<li class="sub"><a href="#/vega/g/${g}">${esc(G[g].title)}</a></li>`).join('') : ''}`).join('')}</ul></div>
    <div><h2>データ</h2><ul>
      <li><a href="#/vega/list">図鑑一覧<span>タイプ・特性・タマゴグループで絞り込み、種族値で並べ替え</span></a></li>
      <li><a href="#/vega/moves">技一覧<span>タイプ・分類で絞り込み、覚えるポケモンを逆引き</span></a></li>
      <li><a href="#/vega/abilities">特性一覧<span>特性ごとのポケモン</span></a></li>
      <li><a href="#/vega/map">トーホク地方マップ<span>場所ごとの出現ポケモン</span></a></li>
      <li><a href="#/vega/types">タイプ相性表<span>17 タイプ（フェアリー無し）</span></a></li>
    </ul></div>
  </div>
  <h2>タイプから探す</h2>
  <div class="frow">${TYPES.map(t => ty(t)).join(' ')}</div>
  <h2>種族値合計 上位 <span class="cnt">上位 20 匹</span></h2>
  ${listTable([...P].sort((a, b) => b.tot - a.tot).slice(0, 20), 'tot', 'desc', true)}
  <h2>タマゴグループから探す</h2>
  <div class="frow">${Object.keys(EGGG).sort().map(g => `<a class="chip" href="#/vega/egg/${enc(g)}">${esc(g)} <span class="muted">${EGGG[g].length}</span></a>`).join('')}</div>`;
}

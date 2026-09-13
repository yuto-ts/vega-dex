import { P, M } from '../data';

/** ハブ（ゲーム選択） */
export function vHub() {
  return `<h1>ポケモン ファンゲーム攻略 <span class="sub">改造ポケモン（ファンゲーム）の図鑑・攻略データベース</span></h1>
  <div class="hub">
    <a class="card" href="#/vega/"><b>ポケットモンスター ベガ<span class="badge">公開中</span></b><span>トーホク地方。図鑑 ${P.length} 匹・技 ${Object.keys(M).length}・攻略チャート・ジム攻略・分布データ</span></a>
    <span class="card soon"><b>ポケットモンスター アルタイル / シリウス<span class="badge gray">準備中</span></b><span>ホウエン地方が舞台の前作。データは今後追加予定</span></span>
    <span class="card soon"><b>ポケットモンスター プロキオン / デネブ<span class="badge gray">準備中</span></b><span>シリーズ最新作。データは今後追加予定</span></span>
  </div>
  <p class="note">データ出典は <a href="https://w.atwiki.jp/altair1/" target="_blank" rel="noopener">Pokemon Altair @攻略wiki</a> です。非公式ファンサイトです。</p>`;
}

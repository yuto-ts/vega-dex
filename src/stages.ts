// ストーリー進行度ごとに行ける場所と、その時点で捕まえられるポケモン
import { V, byNo, encPokemon, type Pokemon } from './data';

// 攻略チャートの順。累積で行ける場所が増える
export const STAGES: [string, string[]][] = [
  ['アヤメジム（第1）まで', ['ハクジタウン', '501ばんどうろ', '502ばんどうろ', 'アヤメシティ']],
  ['ミルジム（第2）まで', ['503ばんどうろ', 'ちえのどうくつ', '504ばんどうろ', '505ばんどうろ', 'ミルシティ', 'こころのやかた']],
  ['シオウジム（第3）まで', ['506ばんどうろ', '519ばんどうろ', 'シオウシティ']],
  ['ヒスイジム（第4）まで', ['507ばんすいどう', '508ばんすいどう', 'かいていトンネル', '509ばんすいどう', 'アーシアとう', 'D・Hビル', '520ばんどうろ', '521ばんどうろ', 'ヒスイシティ', 'サファリゾーン']],
  ['オウニジム（第5）まで', ['518ばんどうろ', 'ハクジのもり', '522ばんどうろ', 'オウニシティ']],
  ['カラスバジム（第6）まで', ['ダークタワー', '514ばんどうろ', 'カラスバシティ']],
  ['ラピスラジム（第7）まで', ['ときのようかん', '517ばんどうろ', 'ユキユキやま', '515ばんどうろ', '516ばんどうろ', 'ラピスラシティ']],
  ['ニューアイランドジム（第8）まで', ['D・Hだんアジト', '510ばんすいどう', '511ばんすいどう', '512ばんすいどう', '513ばんすいどう', 'ひのしま', 'かみなりのしま', 'こおりのしま', 'ニューアイランド']],
  ['ポケモンリーグまで', ['ポケモンじょう', '523ばんすいどう', 'チャンピオンロード', 'シャクドウじま']],
  ['殿堂入り後', ['はなれのことう', 'スフィアいせき']],
];
// 地形ごとに必要な進行度（index）: なみのり=シオウジム後、ボロのつりざお=シオウシティ、いわくだき=ヒスイジム後。良釣・凄釣は入手時期が不明なので目安
const TERRAIN_STAGE: Record<string, number> = { 水上: 3, ボロ釣: 2, 良釣: 4, 凄釣: 5, 岩: 4 };
export const stageLocs = (i: number) => new Set(STAGES.slice(0, i + 1).flatMap(s => s[1]));

/** 進化先のうち種族値合計が最も高いもの */
export function finalForm(p: Pokemon) {
  let best = p;
  const seen = new Set<string>();
  const walk = (x: Pokemon) => {
    if (seen.has(x.n)) return;
    seen.add(x.n);
    if (x.tot > best.tot) best = x;
    x.evo.forEach(e => { const c = byNo[e.n!]; if (c) walk(c); });
  };
  walk(p);
  return best;
}

export interface Where { loc: string; area: string; rate: string; lv: string; terrain: string }
export interface Rec { p: Pokemon; where: Where[]; fin: Pokemon }

/** 進行度 i までに出現するポケモンを、最終進化の種族値合計が高い順に */
export function recsFor(i: number): Rec[] {
  const locs = stageLocs(i), post = i >= STAGES.length - 1, cand: Record<string, { p: Pokemon; where: Where[] }> = {};
  for (const name of locs) (V.enc[name] || []).forEach(g => {
    if (g.post && !post) return;
    g.rows.forEach(r => {
      const need = TERRAIN_STAGE[r[0]]; if (need !== undefined && i < need) return;
      const p = encPokemon(r[1]); if (!p) return;
      (cand[p.n] ??= { p, where: [] }).where.push({ loc: name, area: g.area, rate: r[3], lv: r[2], terrain: r[0] });
    });
  });
  return Object.values(cand).map(c => ({ ...c, fin: finalForm(c.p) })).sort((a, b) => b.fin.tot - a.fin.tot || a.p.n.localeCompare(b.p.n));
}

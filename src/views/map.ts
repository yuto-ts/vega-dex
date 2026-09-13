// トーホク地方マップ（場所から探す・進行度別のお勧め）
import { V, byName } from '../data';
import { esc, img, plink, tys, loclink } from '../html';
import { GYMS, CITY_GYM, gymBadge } from '../gyms';
import { TOWNS, DUNGEONS, ROUTES, TILE, locCount, type TileMap } from '../map/tiles';
import { tmap } from '../map/render';
import { STAGES, stageLocs, recsFor, finalForm, type Rec } from '../stages';
import type { Query } from '../router';

function recCard(c: Rec, wikiText?: string) {
  const p = c.p, f = c.fin;
  const where = c.where.slice().sort((a, b) => parseInt(b.rate) - parseInt(a.rate)).slice(0, 3).map(w => `${loclink(w.loc)}${w.area ? ' ' + esc(w.area) : ''}（${esc(w.terrain)} ${esc(w.rate)} Lv${esc(w.lv)}）`).join('・');
  return `<div class="rec ${wikiText != null ? 'wiki' : ''}">${img(p)}<div><div class="nm">${plink(p)}${f.n !== p.n ? ` <span class="arrow">→ ${plink(f)}</span>` : ''}${wikiText != null ? '<span class="tag">wiki お勧め</span>' : ''} <span class="muted" style="font-weight:400;font-size:12px">合計 ${f.tot}</span></div>
  <div>${tys(f.t, true)}</div>${wikiText ? `<div class="ds">${esc(wikiText).replace(/\n/g, '<br>')}</div>` : ''}<div class="wh">${where || '（この進行度では出現データなし）'}</div></div></div>`;
}

function recsSection(si: number) {
  const all = recsFor(si);
  const wiki = (V.recs[GYMS[si]] || []).map(([nm, ds]) => ({ p: byName[nm.replace(/\(.*$/, '')], ds }));
  const wikiRecs = wiki.map(({ p, ds }) => p ? recCard(all.find(c => c.p.n === p.n) || { p, where: [], fin: finalForm(p) }, ds) : '').join('');
  const wikiNos = new Set(wiki.map(({ p }) => p?.n));
  const auto = all.filter(c => !wikiNos.has(c.p.n)).slice(0, 16).map(c => recCard(c)).join('');
  return `<h2>${esc(STAGES[si][0])}に捕まえられるお勧めポケモン <span class="cnt">${all.length} 種が出現</span></h2>
    ${wikiRecs ? `<div class="recs">${wikiRecs}</div><p class="note">上は wiki の ${esc(V.guide[GYMS[si]].title)} ページ「お勧めポケモン」の記載。</p>` : ''}
    <div class="recs">${auto}</div>
    <p class="note">この進行度までに行ける場所（マップ上で明るい部分）の分布データから、最終進化の種族値合計が高い順に並べたものです。なみのり（第3ジム後）・いわくだき（第4ジム後）・つりざおが要る地形は入手時期を考慮しています。伝説・固定シンボルやイベント入手は含みません。</p>`;
}

export function vMap(q: Query) {
  const si = q.stage === undefined || q.stage === '' ? -1 : +q.stage;
  const group = (title: string, obj: TileMap) => `<h3>${title}</h3>${Object.keys(obj).map(n => {
    const gp = CITY_GYM[n];
    return `<div class="locrow">${loclink(n, `${esc(n)}${TILE[n] && TILE[n].length ? '' : '<small class="muted">（マップ外）</small>'}<span>${locCount(n)} 匹</span>`)}${gp ? `<a class="gymlink" href="#/vega/g/${gp}" title="${esc(V.guide[gp].title)}">${gymBadge(gp)} ジム攻略</a>` : ''}</div>`;
  }).join('')}`;
  return `<h1>トーホク地方マップ <span class="sub">場所から探す</span></h1>
  <div class="stage"><label for="stage">ストーリー進行度</label><select id="stage"><option value="">選択しない（全体を表示）</option>${STAGES.map((s, i) => `<option value="${i}" ${i === si ? 'selected' : ''}>${esc(s[0])}</option>`).join('')}</select><span class="muted" style="font-size:12px">選ぶと、行ける範囲とその時点で捕まえられるお勧めポケモンを表示します。白い四角はダンジョン・施設で、マウスを乗せると名前が出ます</span></div>
  <div class="mapwrap">${tmap([], { hotspots: true, dimSet: si >= 0 ? stageLocs(si) : null })}
  <div class="loclist">${group('町・島', TOWNS)}${group('ダンジョン・施設', DUNGEONS)}${group('道路・水道', ROUTES)}</div></div>
  ${si >= 0 ? recsSection(si) : ''}
  <p class="note">陸地の形は Pokémon Vega Wiki (fandom) のタウンマップ画像から輪郭を取り、道路・町・ダンジョンは攻略チャートの接続関係から配置し直したものです。ひのしま・かみなりのしま・こおりのしまの 3 島の対応は推定。はなれのことう・スフィアいせきはタウンマップに載っていません。</p>`;
}

export function bindStage() {
  const st = document.getElementById('stage') as HTMLSelectElement | null;
  if (st) st.addEventListener('change', () => { location.hash = '#/vega/map' + (st.value !== '' ? '?stage=' + st.value : ''); });
}

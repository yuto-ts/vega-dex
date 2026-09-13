// 技一覧・技詳細
import { M, LEARN, learnCount, type LearnHow, type Pokemon, type Move } from '../data';
import { esc, norm, img, tys, ty, dash, moveCells, isOrigMove, options, sortTh, typeButtons } from '../html';
import { TYPES } from '../typechart';
import { parseHash, setQuery, type Query } from '../router';

export function vMoves(q: Query) {
  const t = q.t || '', c = q.c || '', txt = q.q || '', sort = q.sort || 'name', dir = q.dir || 'asc', src = q.src || '', origF = q.orig || '';
  const rows = Object.entries(M).filter(([n, d]) => (!t || d.t === t) && (!c || d.c === c) && (!txt || norm(n).includes(norm(txt))) && (!src || d.src === src) && (!origF || (origF === '1' ? isOrigMove(d) : !isOrigMove(d))));
  const key = ([n, d]: [string, Move]) => sort === 'name' ? n : sort === 'learn' ? learnCount(n) : ((d as unknown as Record<string, string | number | null>)[sort] ?? -1);
  rows.sort((x, y) => { const kx = key(x), ky = key(y); const cmp = typeof kx === 'number' ? kx - (ky as number) : String(kx).localeCompare(String(ky), 'ja'); return (dir === 'asc' ? cmp : -cmp) || x[0].localeCompare(y[0], 'ja'); });
  const th = (k: string, l: string, cls = '') => sortTh(sort, dir, k, l, cls);
  const srcs = [...new Set(Object.values(M).map(d => d.src))];
  return `<h1>技一覧 <span class="sub">${rows.length} 技</span></h1>
  <div class="filters" id="mfilters">
    <div class="frow"><span class="lab">タイプ</span>${typeButtons(x => t === x, TYPES)}</div>
    <div class="frow"><span class="lab">分類</span><select id="mf-c"><option value="">すべて</option>${options(['物理', '特殊', '変化'].map(x => [null, x]), c)}</select>
      <span class="lab">専用</span><select id="mf-orig"><option value="">すべて</option>${options([['1', '専用のみ（本家にない技）'], ['0', '本家の技のみ']], origF)}</select>
      <span class="lab">区分</span><select id="mf-src"><option value="">すべて</option>${options(srcs.map(x => [null, x]), src)}</select>
      <span class="lab">技名</span><input type="text" id="mf-q" value="${esc(txt)}" placeholder="部分一致" size="12"><button class="btn" id="mf-clear">条件をクリア</button></div>
  </div>
  <div class="tbl-wrap compact"><table><thead><tr>${th('name', '技')}${th('t', 'タイプ')}${th('c', '分類', 'c')}${th('p', '威力', 'num')}${th('a', '命中', 'num')}${th('pp', 'PP', 'num')}<th>効果</th>${th('learn', '習得', 'num')}</tr></thead><tbody>
  ${rows.map(([n]) => `<tr>${moveCells(n)}<td class="num">${learnCount(n)}</td></tr>`).join('')}</tbody></table></div>
  <p class="note">「専用」印は本家に無いアルタイル・シリウス／ベガのオリジナル技、「変更」印は wiki の「既存技変更点」に載っている技です（カーソルを合わせると内容を表示）。</p>`;
}

export function vMove(name: string) {
  const d = M[name], L = LEARN[name] || { lv: [], tm: [], tutor: [], egg: [] };
  const learners = (arr: [Pokemon, string][], how: LearnHow) => arr.length ? `<div class="learners">${arr.sort((a, b) => a[0].n.localeCompare(b[0].n)).map(([p, x]) => `<a href="#/vega/p/${p.n}">${img(p)}<span><b>${esc(p.name)}</b><br>${tys(p.t, true)}</span><span class="lvl">${how === 'lv' ? 'Lv.' + esc(x) : how === 'tm' ? esc(x) : how === 'egg' ? `<span title="${esc(x)}">遺伝</span>` : ''}</span></a>`).join('')}</div>` : '<p class="muted">なし</p>';
  const section = (label: string, how: LearnHow) => `<h2>${label}で覚える <span class="cnt">${L[how].length} 匹</span></h2>${learners(L[how], how)}`;
  return `<div class="crumb"><a href="#/vega/moves">技一覧</a></div>
  <h1>${esc(name)} ${d ? tys([d.t]) : ''}</h1>
  ${d ? `<div class="tbl-wrap compact" style="max-width:760px"><table><thead><tr><th>タイプ</th><th class="c">分類</th><th class="num">威力</th><th class="num">命中</th><th class="num">PP</th>${d.tg ? '<th>対象</th>' : ''}<th class="c">優先度</th><th>効果</th></tr></thead><tbody><tr><td>${ty(d.t, true)}</td><td class="c">${esc(d.c)}</td><td class="num">${dash(d.p)}</td><td class="num">${dash(d.a)}</td><td class="num">${dash(d.pp)}</td>${d.tg ? `<td>${esc(d.tg)}</td>` : ''}<td class="c">${esc(d.pr || '0')}</td><td>${esc(d.e)}</td></tr></tbody></table></div>
  <p class="note">区分: ${esc(d.src)}${d.chg ? `　／　ベガでの変更点: ${d.chg.map(esc).join('、')}` : ''}${d.src === '第三世代以前' ? '　／　数値は原作（第 5 世代）基準です' : ''}</p>` : '<p class="muted">この技のデータは wiki にありません。</p>'}
  ${section('レベルアップ', 'lv')}
  ${section('技マシン', 'tm')}
  ${section('教え技', 'tutor')}
  ${section('タマゴ技', 'egg')}`;
}

const setMoves = (patch: Query) => setQuery('#/vega/moves', patch);

export function bindMoves() {
  const mf = document.getElementById('mfilters');
  if (!mf) return;
  const sel = (id: string) => mf.querySelector<HTMLSelectElement>(id)!;
  mf.querySelectorAll<HTMLElement>('.tybtn').forEach(b => b.addEventListener('click', () => setMoves({ t: parseHash().q.t === b.dataset.t ? '' : b.dataset.t! })));
  sel('#mf-c').addEventListener('change', e => setMoves({ c: (e.target as HTMLSelectElement).value }));
  sel('#mf-src').addEventListener('change', e => setMoves({ src: (e.target as HTMLSelectElement).value }));
  sel('#mf-orig').addEventListener('change', e => setMoves({ orig: (e.target as HTMLSelectElement).value }));
  const fq = mf.querySelector<HTMLInputElement>('#mf-q')!;
  let tm: number | undefined;
  fq.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => setMoves({ q: fq.value }), 250); });
  mf.querySelector('#mf-clear')!.addEventListener('click', () => { location.hash = '#/vega/moves'; });
  document.querySelectorAll<HTMLElement>('#app th.sort').forEach(th => th.addEventListener('click', () => {
    const s = parseHash().q, k = th.dataset.k!;
    const dir = s.sort === k ? (s.dir === 'asc' ? 'desc' : 'asc') : (k === 'name' || k === 't' || k === 'c' ? 'asc' : 'desc');
    setMoves({ sort: k, dir });
  }));
  if (parseHash().q.q) { fq.focus(); fq.setSelectionRange(fq.value.length, fq.value.length); }
}

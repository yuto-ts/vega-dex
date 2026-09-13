// 図鑑一覧
import { P, ABIL, EGGG, type Pokemon } from '../data';
import { esc, norm, img, plink, alink, tys, options, sortTh, typeButtons } from '../html';
import { TYPES, STAT_S } from '../typechart';
import { parseHash, setQuery, type Query } from '../router';

export function listTable(rows: Pokemon[], sort: string, dir: string, noSort?: boolean) {
  const th = (k: string, label: string, cls = '') => noSort ? `<th class="${cls}">${label}</th>` : sortTh(sort, dir, k, label, cls);
  return `<div class="tbl-wrap"><table class="list"><thead><tr>${th('n', 'No.')}<th></th>${th('name', '名前')}<th>タイプ</th><th>特性</th>${STAT_S.map((s, i) => th('s' + i, s, 'num')).join('')}${th('tot', '合計', 'num')}</tr></thead><tbody>
  ${rows.map(p => `<tr><td class="num muted">${p.n}</td><td>${img(p)}</td><td>${plink(p)}${p.orig ? ' <span class="orig">専用</span>' : ''}</td><td>${tys(p.t, true)}</td><td style="font-size:12px">${p.a.map(alink).join('<br>')}</td>${p.s.map(v => `<td class="num">${v}</td>`).join('')}<td class="num"><b>${p.tot}</b></td></tr>`).join('')}
  </tbody></table></div>`;
}

const evoMatch = (p: Pokemon, evoF: string) =>
  !evoF || (evoF === 'final' ? p.evo.length === 0 : evoF === 'noevo' ? p.noevo : evoF === 'base' ? p.pre.length === 0 && p.evo.length > 0 : true);

export function vList(q: Query) {
  const tsel = (q.t || '').split(',').filter(Boolean);
  const a = q.a || '', e = q.e || '', txt = q.q || '', sort = q.sort || 'n', dir = q.dir || (sort === 'n' || sort === 'name' ? 'asc' : 'desc');
  const evoF = q.evo || '', origF = q.orig || '';
  const rows = P.filter(p => tsel.every(t => p.t.includes(t)) && (!a || p.a.includes(a)) && (!e || p.egg.includes(e)) && (!txt || normIncludes(p.name, txt))
    && (!origF || (origF === '1' ? p.orig : !p.orig))
    && evoMatch(p, evoF));
  const key = (p: Pokemon): string | number | undefined => sort === 'n' ? p.n : sort === 'name' ? p.name : sort === 'tot' ? p.tot : p.s[+sort[1]];
  rows.sort((x, y) => { const kx = key(x), ky = key(y); const c = typeof kx === 'number' ? kx - (ky as number) : String(kx).localeCompare(String(ky), 'ja'); return (dir === 'asc' ? c : -c) || x.n.localeCompare(y.n); });
  const abils = Object.keys(ABIL).sort((x, y) => x.localeCompare(y, 'ja'));
  const eggs = Object.keys(EGGG).sort();
  let title = '図鑑一覧';
  if (a) title = `特性「${a}」のポケモン`; else if (e) title = `タマゴグループ「${e}」のポケモン`; else if (tsel.length) title = `${tsel.join('・')}タイプのポケモン`;
  return `<h1>${esc(title)} <span class="sub">${rows.length} 匹</span></h1>
  <div class="filters" id="filters">
    <div class="frow"><span class="lab">タイプ</span>${typeButtons(t => tsel.includes(t), TYPES)}<span class="muted" style="font-size:11px">（2 つ選ぶと複合タイプ）</span></div>
    <div class="frow"><span class="lab">特性</span><select id="f-a"><option value="">すべて</option>${options(abils.map(x => [null, x]), a)}</select>
      <span class="lab">タマゴ</span><select id="f-e"><option value="">すべて</option>${options(eggs.map(x => [null, x]), e)}</select>
      <span class="lab">進化</span><select id="f-evo"><option value="">すべて</option>${options([['final', '最終進化のみ'], ['base', '進化前のみ'], ['noevo', '進化しない']], evoF)}</select>
      <span class="lab">専用</span><select id="f-orig"><option value="">すべて</option>${options([['1', '専用のみ（本家に登場しない）'], ['0', '本家のポケモンのみ']], origF)}</select>
      <span class="lab">名前</span><input type="text" id="f-q" value="${esc(txt)}" placeholder="部分一致" size="12">
      <button class="btn" id="f-clear">条件をクリア</button><span class="count">列見出しをクリックで並べ替え</span></div>
  </div>
  ${listTable(rows, sort, dir)}`;
}
const normIncludes = (s: string, sub: string) => norm(s).includes(norm(sub));

const setList = (patch: Query) => setQuery('#/vega/list', patch);

export function bindList() {
  const f = document.getElementById('filters');
  if (!f) return;
  const sel = (id: string) => f.querySelector<HTMLSelectElement>(id)!;
  f.querySelectorAll<HTMLElement>('.tybtn').forEach(b => b.addEventListener('click', () => {
    const cur = (parseHash().q.t || '').split(',').filter(Boolean);
    const t = b.dataset.t!;
    const nx = cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t].slice(-2);
    setList({ t: nx.join(',') });
  }));
  sel('#f-a').addEventListener('change', e => setList({ a: (e.target as HTMLSelectElement).value }));
  sel('#f-e').addEventListener('change', e => setList({ e: (e.target as HTMLSelectElement).value }));
  sel('#f-evo').addEventListener('change', e => setList({ evo: (e.target as HTMLSelectElement).value }));
  sel('#f-orig').addEventListener('change', e => setList({ orig: (e.target as HTMLSelectElement).value }));
  const fq = f.querySelector<HTMLInputElement>('#f-q')!;
  let tm: number | undefined;
  fq.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { setList({ q: fq.value }); }, 250); });
  f.querySelector('#f-clear')!.addEventListener('click', () => { location.hash = '#/vega/list'; });
  document.querySelectorAll<HTMLElement>('table.list th.sort').forEach(th => th.addEventListener('click', () => {
    const s = parseHash().q, k = th.dataset.k!;
    const dir = s.sort === k ? (s.dir === 'asc' ? 'desc' : 'asc') : (k === 'n' || k === 'name' ? 'asc' : 'desc');
    setList({ sort: k, dir });
  }));
  if (parseHash().q.q) { fq.focus(); fq.setSelectionRange(fq.value.length, fq.value.length); }
}

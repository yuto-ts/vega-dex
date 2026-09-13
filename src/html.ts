// HTML 文字列を組み立てる小さな部品
import { V, M, type Move, type Pokemon } from './data';
import { TCOL } from './typechart';

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
/** 検索用の正規化: 全角半角・大小文字をそろえ、ひらがなをカタカナにし、空白を除く */
export const norm = (s: string) => String(s).normalize('NFKC').toLowerCase().replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60)).replace(/\s+/g, '');
export const enc = encodeURIComponent;
export const dash = (v: number | null | undefined) => v == null ? '—' : v;

export const ty = (t: string, small?: boolean) => `<a class="ty${small ? ' small' : ''}" style="background:${TCOL[t] || '#888'}" href="#/vega/list?t=${enc(t)}">${esc(t)}</a>`;
export const tys = (ts: string[], small?: boolean) => `<span class="tys">${ts.map(t => ty(t, small)).join('')}</span>`;
export const img = (p: Pokemon, cls = 'sprite') => p.img ? `<img class="${cls}" src="${p.img}" alt="" width="64" height="64" loading="lazy">` : '';
export const plink = (p: Pokemon) => `<a href="#/vega/p/${p.n}" class="name">${esc(p.name)}</a>`;
export const mlink = (m: string) => `<a href="#/vega/m/${enc(m)}">${esc(m)}</a>`;
export const alink = (a: string) => `<a href="#/vega/a/${enc(a)}">${esc(a)}</a>`;
export const loclink = (n: string, label = esc(n)) => `<a href="#/vega/loc/${enc(n)}">${label}</a>`;
export const trImg = (name: string, cls = 'tr') => V.trainer[name] ? `<img class="${cls}" src="${V.trainer[name]}" alt="${esc(name)}">` : '';
export const barCol = (v: number) => v < 50 ? 'var(--bar-lo)' : v < 80 ? 'var(--bar-mid)' : v < 100 ? 'var(--bar-ok)' : v < 120 ? 'var(--bar-good)' : 'var(--bar-hi)';
/** `<select>` の `<option>` 群。opts は [value, label]（value が null ならラベルをそのまま値に使う） */
export const options = (opts: [string | null, string][], cur: string) =>
  opts.map(([v, l]) => v === null ? `<option ${l === cur ? 'selected' : ''}>${esc(l)}</option>` : `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`).join('');
export const sortTh = (sort: string, dir: string, k: string, label: string, cls = '') =>
  `<th class="sort ${cls} ${sort === k ? 'on' : ''}" data-k="${k}">${label}<span class="arr">${sort === k ? (dir === 'asc' ? '▲' : '▼') : ''}</span></th>`;
export const typeButtons = (on: (t: string) => boolean, types: string[]) =>
  types.map(t => `<button class="ty tybtn ${on(t) ? 'on' : ''}" data-t="${t}" style="background:${TCOL[t]}">${t}</button>`).join('');

// ---------- 技の表 ----------
export const isOrigMove = (d: Move) => /オリジナル/.test(d.src);
export const MOVE_HEAD = '<th>タイプ</th><th class="c">分類</th><th class="num">威力</th><th class="num">命中</th><th class="num">PP</th><th>効果</th>';
export function moveCells(m: string) {
  const d = M[m];
  if (!d) return `<td>${mlink(m)}</td><td colspan="6" class="muted">データなし</td>`;
  const chg = d.chg ? `<span class="chg" title="${esc(d.chg.join(' / '))}">変更</span>` : '';
  const orig = isOrigMove(d) ? `<span class="orig" title="${esc(d.src)}">専用</span>` : '';
  return `<td>${mlink(m)}${orig}${chg}</td><td>${ty(d.t, true)}</td><td class="c">${esc(d.c)}</td><td class="num">${dash(d.p)}</td><td class="num">${dash(d.a)}</td><td class="num">${dash(d.pp)}</td><td class="eff">${esc(d.e)}</td>`;
}

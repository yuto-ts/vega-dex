// ヘッダーのインクリメンタル検索（場所・ポケモン・技・特性）
import { P, M, ABIL } from './data';
import { esc, enc, norm, img, tys, ty, dash } from './html';
import { TILE, locCount } from './map/tiles';

export function initSearch() {
  const qEl = document.getElementById('q') as HTMLInputElement, sug = document.getElementById('sug')!;
  let sugIdx = -1;
  const close = () => sug.classList.remove('on');
  function suggest() {
    const v = norm(qEl.value.trim());
    if (!v) { close(); sug.innerHTML = ''; return; }
    const starts = (s: string) => +norm(s).startsWith(v), has = (s: string) => norm(s).includes(v);
    const pk = P.filter(p => has(p.name)).sort((a, b) => (starts(b.name) - starts(a.name)) || a.n.localeCompare(b.n)).slice(0, 6);
    const mv = Object.keys(M).filter(has).sort((a, b) => (starts(b) - starts(a)) || a.localeCompare(b, 'ja')).slice(0, 5);
    const ab = Object.keys(ABIL).filter(has).slice(0, 4);
    const lc = Object.keys(TILE).filter(has).slice(0, 4);
    const items = [
      ...lc.map(n => `<a href="#/vega/loc/${enc(n)}"><span style="width:32px;text-align:center">📍</span><span>${esc(n)}</span><span class="k">場所 ${locCount(n)} 匹</span></a>`),
      ...pk.map(p => `<a href="#/vega/p/${p.n}">${img(p)}<span><b>${esc(p.name)}</b> ${tys(p.t, true)}</span><span class="k">No.${p.n}</span></a>`),
      ...mv.map(m => `<a href="#/vega/m/${enc(m)}"><span style="width:32px;text-align:center">${ty(M[m].t, true)}</span><span>${esc(m)}</span><span class="k">技 ${M[m].c} ${dash(M[m].p)}</span></a>`),
      ...ab.map(a => `<a href="#/vega/a/${enc(a)}"><span style="width:32px"></span><span>${esc(a)}</span><span class="k">特性 ${ABIL[a].length} 匹</span></a>`),
    ];
    sug.innerHTML = items.join('') || '<a class="muted">該当なし</a>';
    sug.classList.add('on'); sugIdx = -1;
  }
  qEl.addEventListener('input', suggest);
  qEl.addEventListener('focus', suggest);
  qEl.addEventListener('keydown', e => {
    const as = [...sug.querySelectorAll('a[href]')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + as.length) % as.length; as.forEach((a, i) => a.classList.toggle('act', i === sugIdx)); }
    else if (e.key === 'Enter') { const a = as[sugIdx >= 0 ? sugIdx : 0]; if (a) { location.hash = a.getAttribute('href')!; close(); qEl.blur(); } }
    else if (e.key === 'Escape') { close(); qEl.blur(); }
  });
  document.addEventListener('click', e => { if (!(e.target as Element).closest('.search')) close(); });
  sug.addEventListener('click', () => { close(); qEl.value = ''; });
}

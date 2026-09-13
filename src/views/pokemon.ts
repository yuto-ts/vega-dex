// ポケモン詳細
import { P, byNo, RANK, RANK_T, type Pokemon } from '../data';
import { esc, enc, img, alink, tys, barCol, loclink, moveCells, MOVE_HEAD } from '../html';
import { TYPES, CH, STAT } from '../typechart';
import { TILE, parseHab } from '../map/tiles';
import { tmap } from '../map/render';

function evoChain(p: Pokemon) {
  // 進化前をさかのぼる
  let root = p, guard = 0;
  while (root.pre.length && root.pre[0].n && byNo[root.pre[0].n] && guard++ < 5) root = byNo[root.pre[0].n];
  const node = (x: Pokemon) => `<a class="node ${x.n === p.n ? 'cur' : ''}" href="#/vega/p/${x.n}">${img(x)}<b>${esc(x.name)}</b>${tys(x.t, true)}</a>`;
  const render = (x: Pokemon): string => {
    if (!x.evo.length) return node(x);
    const kids = x.evo.map(e => { const c = byNo[e.n!]; return `<div class="pair"><span class="arrow">${esc(e.cond)}</span>${c ? render(c) : `<span class="node"><b>${esc(e.name)}</b></span>`}</div>`; });
    return `<div class="pair">${node(x)}<div class="branch">${kids.join('')}</div></div>`;
  };
  return `<div class="evo">${render(root)}</div>`;
}

function defense(p: Pokemon) {
  const res: Record<string, number> = {};
  TYPES.forEach(at => { let m = 1; p.t.forEach(dt => m *= CH[at][dt]); res[at] = m; });
  const groups: [number, string, string][] = [[4, 'こうかは ばつぐんだ', '4倍'], [2, 'こうかは ばつぐんだ', '2倍'], [1, '等倍', '1倍'], [0.5, 'こうかは いまひとつ', '1/2倍'], [0.25, 'こうかは いまひとつ', '1/4倍'], [0, 'こうかが ない', '0倍']];
  return `<div class="mx">${groups.map(([v, l, m]) => { const ts = TYPES.filter(t => res[t] === v); return ts.length ? `<div class="cell eff${v >= 2 ? ' weak' : v === 1 ? '' : v === 0 ? ' immune' : ' resist'}"><b>${l} <span class="mul">${m}</span></b>${tys(ts, true)}</div>` : ''; }).join('')}</div>`;
}

function moveTable<T extends { m: string }>(rows: T[], firstHead?: string, firstCell?: (r: T) => string) {
  if (!rows.length) return '<p class="muted">なし</p>';
  return `<div class="tbl-wrap compact"><table><thead><tr>${firstHead ? `<th>${firstHead}</th>` : ''}<th>技</th>${MOVE_HEAD}</tr></thead><tbody>${rows.map(r => `<tr>${firstHead ? `<td>${firstCell!(r)}</td>` : ''}${moveCells(r.m)}</tr>`).join('')}</tbody></table></div>`;
}

function habitatMap(p: Pokemon) {
  const habs = p.hab.map(parseHab);
  const names = [...new Set(habs.flatMap(h => h.names))];
  if (!names.length) return '';
  const onMap = names.filter(n => (TILE[n] || []).length);
  const items = habs.map(h => {
    const links = h.names.map(n => loclink(n)).join('・') || esc(h.raw);
    const has = h.names.some(n => (TILE[n] || []).length);
    const off = h.names.length && !has ? '<span class="sub">（マップ外）</span>' : '';
    return `<li><span class="pin ${has ? '' : 'none'}"></span><span>${links}${h.sub ? `<span class="sub"> ${esc(h.sub)}</span>` : ''}${h.detail ? `<span class="sub">（${esc(h.detail)}）</span>` : ''}${off}</span></li>`;
  }).join('');
  return `<h2>生息地マップ <span class="cnt">トーホク地方</span></h2>
  <div class="mapwrap">${tmap(onMap, { dimAll: false, hotspots: true })}<div><ul class="hablist">${items}</ul><p class="note">マップ上の道路・町をクリックすると、その場所に出るポケモンの一覧を表示します。</p></div></div>`;
}

export function vPokemon(no: string) {
  const p = byNo[no];
  if (!p) return `<h1>見つかりません</h1><p>No.${esc(no)} のポケモンはありません。</p>`;
  const i = P.indexOf(p), prev = P[i - 1], next = P[i + 1];
  const evText = p.ev ? p.ev.map((v, k) => v ? `${STAT[k]}${v}` : '').filter(Boolean).join('・') || '—' : '<span class="muted">不明（wiki の記載が不正）</span>';
  const tabs: [string, string, number, () => string][] = [
    ['lv', 'レベルアップ', p.lv.length, () => moveTable(p.lv.map(([l, m]) => ({ l, m })), 'Lv', r => `<b>${esc(r.l)}</b>`)],
    ['tm', '技マシン', p.tm.length, () => moveTable(p.tm.map(([n, m]) => ({ n, m })), 'No', r => esc(r.n))],
    ['tutor', '教え技', p.tutor.length, () => moveTable(p.tutor.map(m => ({ m })))],
    ['egg', 'タマゴ技', p.eggm.length, () => moveTable(p.eggm.map(e => ({ m: e.m, c: e.c })), '遺伝経路', r => r.c.length ? `<details class="chain"><summary>${r.c.length} 経路</summary><div>${r.c.map(c => esc(c).replace(/→/g, ' → ')).join('<br>')}</div></details>` : '—')],
  ];
  const kv = (rows: [string, string][]) => rows.map(([k, v]) => `
      <tr><th>${k}</th><td>${v}</td></tr>`).join('');
  return `<div class="crumb"><a href="#/vega/list">図鑑一覧</a> › No.${p.n} ${esc(p.name)}</div>
  <div class="hero">
    <div class="pic">${img(p)}</div>
    <div><div class="no">No.${p.n}${p.orig ? ' <span class="orig">専用</span>' : ''}</div><h1>${esc(p.name)}</h1>${tys(p.t)}
      <div style="margin-top:8px;font-size:13px">特性: ${p.a.map(alink).join(' / ')}</div>
      <div style="font-size:13px">種族値合計 <b>${p.tot}</b> <span class="muted">（${RANK_T[p.tot]} 位 / ${P.length}）</span>　努力値: ${evText}</div></div>
    <div class="pn">${prev ? `<a href="#/vega/p/${prev.n}">◀ ${img(prev)}No.${prev.n} ${esc(prev.name)}</a>` : ''}${next ? `<a href="#/vega/p/${next.n}">${img(next)}No.${next.n} ${esc(next.name)} ▶</a>` : ''}</div>
  </div>
  <div class="two">
    <div><h2>種族値</h2>
      <table class="stats"><tbody>${p.s.map((v, k) => `<tr><th>${STAT[k]}</th><td class="v">${v}</td><td><div class="bar"><i style="width:${Math.min(100, v / 1.8)}%;background:${barCol(v)}"></i></div></td><td class="r">${RANK[k][v]} 位</td></tr>`).join('')}<tr class="total"><th>合計</th><td class="v">${p.tot}</td><td></td><td class="r">${RANK_T[p.tot]} 位</td></tr></tbody></table>
      <h2>タイプ相性（防御側）</h2>${defense(p)}
    </div>
    <div><h2>基本データ</h2>
      <table class="kv"><tbody>${kv([
        ['タイプ', tys(p.t, true)],
        ['特性', p.a.map(alink).join('<br>')],
        ['努力値', evText],
        ['タマゴグループ', p.egg.map(g => `<a href="#/vega/egg/${enc(g)}">${esc(g)}</a>`).join('・')],
        ['孵化歩数', esc(p.hatch)],
        ['性別比率', esc(p.gender)],
        ['被捕獲率', esc(p.catch)],
        ['初期なつき度', esc(p.happy)],
        ['基礎経験値', esc(p.bexp)],
        ['経験値タイプ', esc(p.exp)],
        ['持ち物 50%', esc(p.item50)],
        ['持ち物 5%', esc(p.item5)],
      ])}
      </tbody></table>
      <h2>入手方法</h2>
      <table class="kv"><tbody><tr><th>生息地</th><td>${p.hab.length ? p.hab.map(esc).join('<br>') : '—'}</td></tr><tr><th>入手方法</th><td>${p.get.length ? p.get.map(esc).join('<br>') : '—'}</td></tr></tbody></table>
    </div>
  </div>
  ${habitatMap(p)}
  <h2>進化</h2>${p.noevo && !p.evo.length && !p.pre.length ? '<p class="muted">進化しない</p>' : evoChain(p)}
  <h2>習得技</h2>
  <div class="tabs" id="mtabs">${tabs.map(([k, l, n], j) => `<button class="${j === 0 ? 'on' : ''}" data-tab="${k}">${l}<span class="n">${n}</span></button>`).join('')}</div>
  ${tabs.map(([k, , , f], j) => `<div data-pane="${k}" ${j ? 'hidden' : ''}>${f()}</div>`).join('')}
  <p class="note">出典: <a href="https://w.atwiki.jp/altair1/pages/${p.pid}.html" target="_blank" rel="noopener">wiki の ${esc(p.name)} ページ</a></p>`;
}

/** 習得技のタブ切り替え */
export function bindMoveTabs() {
  const tabs = document.getElementById('mtabs');
  if (!tabs) return;
  tabs.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.addEventListener('click', () => {
    tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll<HTMLElement>('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab);
  }));
}

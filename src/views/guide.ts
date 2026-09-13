// 攻略ページ（wiki 由来）
import { V, P, M, byName } from '../data';
import { esc, enc } from '../html';
import { GYMS } from '../gyms';
import { guideHero } from '../figures';
import { GUIDE_MENU, gHref } from './home';
import { vChart } from './chart';

const STORY = ['39', 'gyms', '48'];

export function vGuideIndex() {
  const G = V.guide;
  const item = ([pid, t, d]: [string, string, string]) => `<li><a href="${gHref(pid)}">${esc(t)}<span>${esc(d)}</span></a></li>`;
  const gyms = (d: string) => `<li><a>ジム攻略<span>${esc(d)}</span></a></li>${GYMS.map(g => `<li class="sub"><a href="#/vega/g/${g}">${esc(G[g].title)}<span>${esc((G[g].html.match(/主なタイプ<\/span>：([^<]+)/) || [])[1] || '')}</span></a></li>`).join('')}`;
  return `<div class="crumb"><a href="#/vega/">ベガ</a></div><h1>ベガ 攻略 <span class="sub">攻略情報の目次</span></h1>
  <div class="menu2"><div><h2>ストーリー</h2><ul>${GUIDE_MENU.filter(([p]) => STORY.includes(p)).map(m => m[0] === 'gyms' ? gyms(m[2]) : item(m)).join('')}</ul></div>
  <div><h2>殿堂入り後・データ</h2><ul>${GUIDE_MENU.filter(([p]) => !STORY.includes(p)).map(item).join('')}</ul></div></div>`;
}

export function vGuide(pid: string) {
  const g = V.guide[pid];
  if (!g) return `<h1>見つかりません</h1><p class="muted">この攻略ページはまだ取り込んでいません。<a href="https://w.atwiki.jp/altair1/pages/${esc(pid)}.html" target="_blank" rel="noopener">wiki で見る</a></p>`;
  if (pid === '39') return vChart(g);
  const gi = GYMS.indexOf(pid);
  const nav = gi >= 0 ? `<div class="pn" style="flex-direction:row;margin:0 0 10px">${gi > 0 ? `<a href="#/vega/g/${GYMS[gi - 1]}">◀ ${esc(V.guide[GYMS[gi - 1]].title)}</a>` : ''}${gi < GYMS.length - 1 ? `<a href="#/vega/g/${GYMS[gi + 1]}">${esc(V.guide[GYMS[gi + 1]].title)} ▶</a>` : ''}</div>` : '';
  return `<div class="crumb"><a href="#/vega/">ベガ</a> › <a href="#/vega/guide">攻略</a></div>
  <h1>${esc(g.title)}${gi >= 0 ? ` <span class="sub">第 ${gi + 1} ジム</span>` : ''}</h1>${nav}${guideHero(pid, g)}
  <div class="toc" data-toc hidden></div>
  <div class="wiki" data-wiki>${g.html}</div>
  <p class="note">出典: <a href="https://w.atwiki.jp/altair1/pages/${esc(pid)}.html" target="_blank" rel="noopener">wiki の ${esc(g.title)} ページ</a>（2026-09-06 取得）。表中のポケモン名・技名はこのサイト内のページにリンクしています。</p>`;
}

const PID_NO = Object.fromEntries(P.map(p => [p.pid, p.n]));
/** wiki 内リンク（#wiki/<pid>）の行き先 */
function wikiHref(pid: string): string | null {
  if (PID_NO[pid]) return `#/vega/p/${PID_NO[pid]}`;
  if (V.guide[pid]) return `#/vega/g/${pid}`;
  if (pid === '55' || pid === '56') return '#/vega/map';
  if (pid === '53') return '#/vega/moves';
  if (pid === '19' || pid === '51') return '#/vega/list';
  return null;
}

/** wiki 由来 HTML の後処理: リンク書き換え・名前の自動リンク・目次 */
function decorateWiki(root: HTMLElement) {
  // wiki の薄文字（攻略上必須ではないが勧める項目）は色ではなく「（補足）」の接頭辞で表す
  root.querySelectorAll('span[style*="lightgrey"], span[style*="lightgray"]').forEach(sp => { sp.removeAttribute('style'); sp.classList.add('opt'); sp.insertAdjacentHTML('afterbegin', '<b class="optlab">（補足）</b>'); });
  root.querySelectorAll<HTMLAnchorElement>('a[href^="#wiki/"]').forEach(a => {
    const pid = a.getAttribute('href')!.slice(6);
    const href = wikiHref(pid);
    if (href) a.setAttribute('href', href);
    else { a.setAttribute('href', `https://w.atwiki.jp/altair1/pages/${pid}.html`); a.target = '_blank'; a.rel = 'noopener'; }
  });
  root.querySelectorAll('td').forEach(td => {
    if (td.children.length) return;
    const t = td.textContent!.trim();
    const p = byName[t];
    if (p) td.innerHTML = `${p.img ? `<img class="s32" src="${p.img}" alt="">` : ''}<a href="#/vega/p/${p.n}">${esc(t)}</a>`;
    else if (V.trainer[t]) td.innerHTML = `<img class="s32" src="${V.trainer[t]}" alt="">${esc(t)}`;
    else if (M[t]) td.innerHTML = `<a href="#/vega/m/${enc(t)}">${esc(t)}</a>`;
  });
  root.querySelectorAll('table').forEach(t => { const w = document.createElement('div'); w.className = 'tbl-wrap'; t.replaceWith(w); w.appendChild(t); });
  const hs = [...root.querySelectorAll('h3,h4')].filter(h => !h.closest('details'));
  const toc = root.parentElement!.querySelector<HTMLElement>('[data-toc]');
  if (toc && hs.length >= 3) {
    hs.forEach((h, i) => { h.id = 'sec' + i; });
    toc.innerHTML = hs.map((h, i) => `<a class="${h.tagName === 'H4' ? 'h4' : ''}" href="javascript:void(0)" data-jump="sec${i}">${esc(h.textContent!.trim())}</a>`).join('');
    toc.hidden = false;
    toc.addEventListener('click', e => { const a = (e.target as Element).closest<HTMLElement>('[data-jump]'); if (a) { e.preventDefault(); document.getElementById(a.dataset.jump!)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  }
}

export const bindWiki = () => document.querySelectorAll<HTMLElement>('[data-wiki]').forEach(decorateWiki);

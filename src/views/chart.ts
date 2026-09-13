// 攻略チャート（ステップ分解・章立て・画像つき）
// wiki HTML を「h3/h4 = パート」「先頭 li が場所名の ul = ステップ」「続く details/table = そのステップの補足」に分解する
import { V, type GuidePage } from '../data';
import { esc, enc, trImg } from '../html';
import { CITY_GYM, gymBadge } from '../gyms';
import { TILE } from '../map/tiles';
import { tmap } from '../map/render';
import { guideHero } from '../figures';

interface Step { loc: string; title: string; nodes: string[]; id: string }
interface Chapter { title: string; steps: Step[] }
interface Part { title: string; level: string; intro: string[]; steps: Step[]; chapters: Chapter[] }

const LOC_NAMES = [...Object.keys(TILE), 'リムけんきゅうじょ', 'ポケモンリーグ', 'はなれのことう', 'スフィアいせき'].sort((a, b) => b.length - a.length);
const locOf = (text: string) => LOC_NAMES.find(n => text.startsWith(n)) || '';
const TRAINER_NAMES = Object.keys(V.trainer).sort((a, b) => b.length - a.length);

function parseChart(html: string): Part[] {
  const doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, 'text/html');
  const newPart = (title: string, level: string): Part => ({ title, level, intro: [], steps: [], chapters: [] });
  let part = newPart('はじめに', 'h3'), step: Step | null = null;
  const parts = [part];
  for (const el of doc.getElementById('r')!.children) {
    const tag = el.tagName;
    if (tag === 'H3' || tag === 'H4') { part = newPart(el.textContent!.trim(), tag.toLowerCase()); parts.push(part); step = null; continue; }
    if (tag === 'HR' || tag === 'BR') continue;
    if (tag === 'UL') {
      const li = el.firstElementChild;
      const own = li ? [...li.childNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && (n as Element).tagName !== 'UL')).map(n => n.textContent).join('').trim() : '';
      const loc = locOf(own);
      if (li && loc && el.children.length === 1) {
        const inner = li.querySelector('ul');
        step = { loc, title: own, nodes: inner ? [inner.outerHTML] : [], id: '' };
        part.steps.push(step);
        continue;
      }
    }
    (step ? step.nodes : part.intro).push(el.outerHTML);
  }
  // ストーリー本編はバッジ入手ごとに章に分ける
  for (const p of parts) {
    if (p.title !== 'ストーリー') { p.chapters = [{ title: '', steps: p.steps }]; continue; }
    let cur: Step[] = [];
    for (const s of p.steps) {
      cur.push(s);
      const m = s.nodes.join('').match(/([^\s、。「」<>]+?バッジ)/);
      if (m) { p.chapters.push({ title: `${p.chapters.length + 1}. ${m[1]}を手に入れるまで`, steps: cur }); cur = []; }
    }
    if (cur.length) p.chapters.push({ title: `${p.chapters.length + 1}. ポケモンリーグへ`, steps: cur });
  }
  return parts;
}

const jump = (id: string, label: string) => `<a href="javascript:void(0)" data-jump="${id}">${esc(label)}</a>`;

function stepCard(s: Step, idx: string) {
  const text = s.nodes.join(' ').replace(/<[^>]+>/g, ' ');
  const trs = TRAINER_NAMES.filter(n => n !== 'ヒイラギ' && text.includes(n)).slice(0, 4);
  const pic = V.img[s.loc];
  const locLink = TILE[s.loc] !== undefined || V.enc[s.loc] ? `<a href="#/vega/loc/${enc(s.loc)}">${esc(s.title)}</a>` : esc(s.title);
  const gymPid = CITY_GYM[s.loc] && /ジムリーダー/.test(text) ? CITY_GYM[s.loc] : null;
  return `<div class="step" id="${s.id}">
    <div class="step-img">${pic ? `<a href="#/vega/loc/${enc(s.loc)}" title="${esc(s.loc)}の画像を見る"><img src="${pic}" alt="${esc(s.loc)}" loading="lazy"></a>` : tmap([s.loc], { labels: false, width: 200 })}</div>
    <div class="step-body"><div class="step-head"><span class="step-no">${idx}</span><h4>${locLink}</h4>${gymPid ? `<a class="gymlink" href="#/vega/g/${gymPid}">${gymBadge(gymPid)} ジム攻略</a>` : ''}${trs.length ? `<span class="step-trs">${trs.map(n => `<span title="${esc(n)}">${trImg(n, 'tr')}<small>${esc(n)}</small></span>`).join('')}</span>` : ''}</div>
    <div class="wiki step-wiki" data-wiki>${s.nodes.join('')}</div></div></div>`;
}

export function vChart(g: GuidePage) {
  const parts = parseChart(g.html);
  let n = 0; parts.forEach(p => p.chapters.forEach(c => c.steps.forEach(s => { s.id = 'st' + (++n); })));
  const toc = parts.filter(p => p.steps.length || p.title !== 'はじめに').map(p => `<div class="toc-part"><b>${esc(p.title)}</b>${p.chapters.filter(c => c.title).map(c => jump(c.steps[0].id, c.title)).join('')}${p.chapters.length === 1 && !p.chapters[0].title && p.steps.length ? p.steps.map(s => jump(s.id, s.loc)).join('') : ''}</div>`).join('');
  const intro = parts[0].intro.length ? `<details class="wiki chart-intro" data-wiki><summary>よくある質問・原作経験者向けの注意（wiki より）</summary>${parts[0].intro.join('').replace(/薄文字は/g, '「（補足）」の付いた項目は')}</details>` : '';
  let body = '';
  for (const p of parts.slice(1)) {
    body += `<h2 id="part-${esc(p.title)}">${esc(p.title)}</h2>`;
    if (p.intro.length) body += `<div class="wiki" data-wiki>${p.intro.join('')}</div>`;
    for (const c of p.chapters) {
      const locs = [...new Set(c.steps.map(s => s.loc).filter(l => TILE[l] && TILE[l].length))];
      if (c.title) body += `<div class="chapter"><div class="chapter-map">${tmap(locs, { labels: false, width: 300 })}</div><div><h3>${esc(c.title)}</h3><div class="chapter-locs">${c.steps.map(s => jump(s.id, s.loc)).join('<span class="muted"> › </span>')}</div></div></div>`;
      body += c.steps.map(s => stepCard(s, s.id.slice(2))).join('');
    }
  }
  return `<div class="crumb"><a href="#/vega/">ベガ</a> › <a href="#/vega/guide">攻略</a></div>
  <h1>${esc(g.title)} <span class="sub">ストーリーの流れを場所ごとに</span></h1>${guideHero('39', g)}
  <div class="toc chart-toc" data-jumps>${toc}</div>${intro}${body}
  <p class="note">出典: <a href="https://w.atwiki.jp/altair1/pages/39.html" target="_blank" rel="noopener">wiki の攻略チャート</a>（2026-09-06 取得）を場所ごとに分割し、画像（Pokémon Vega Wiki）を添えたものです。手順の文章は wiki のままです。</p>`;
}

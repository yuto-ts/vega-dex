// 努力値カウンター: たおす相手を図鑑から登録し、クリックやキーで討伐数と努力値を集計する
import { P, byNo, type Pokemon } from '../data';
import { esc, norm, img, tys } from '../html';
import { STAT, STAT_S } from '../typechart';

const MAX_STAT = 252, MAX_TOTAL = 510;
const LS = 'vega-ev-v1';
const ITEM_LABEL = ['パワーウエイト', 'パワーリスト', 'パワーベルト', 'パワーレンズ', 'パワーバンド', 'パワーアンクル'];
// たおす相手のショートカット。左手で打ちやすい順: ホームポジション → 上段
const KEY_CODES = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'];
const KEY_LABELS = ['A', 'S', 'D', 'F', 'G', 'Q', 'W', 'E', 'R', 'T'];
const PRESETS = [0, 4, 6, 12, 52, 100, 180, 204, 252];

interface Enemy { no: string; count: number }
interface Mon { id: string; name: string; ev: number[]; target: number[]; enemies: Enemy[] }
/** item: '' なし / 'brace' きょうせいギプス / '0'〜'5' パワー系（対象ステータスの添字） */
interface State { mons: Mon[]; active: number; item: string; pokerus: boolean; pbonus: 4 | 8; manual: boolean; updatedAt: number }

const zero = () => [0, 0, 0, 0, 0, 0];
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const mkMon = (name: string, ev = zero(), target = zero(), enemies: Enemy[] = []): Mon => ({ id: newId(), name, ev, target, enemies });
const clamp = (v: unknown) => Math.max(0, Math.min(MAX_STAT, Math.round(Number(v) || 0)));
const total = (m: Mon) => m.ev.reduce((a, b) => a + b, 0);
const wild = (p: Pokemon) => p.hab.length > 0 && !p.hab.some(h => h.includes('野生では出現しない'));

// ---------- 状態 ----------
let state: State = load();
let history: string[] = [];

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(LS) || 'null');
    if (s && Array.isArray(s.mons) && s.mons.length) return s as State;
  } catch { /* 壊れていれば初期値 */ }
  return { mons: [mkMon('', zero(), zero(), [])], active: 0, item: '', pokerus: false, pbonus: 4, manual: false, updatedAt: 0 };
}
/** 取り込んだデータを検証して State にする（ファイル読み込み・自動保存ファイルの復元で使う） */
function sanitize(raw: unknown): Mon[] {
  const src = Array.isArray(raw) ? raw : (raw as { mons?: unknown[] })?.mons;
  if (!Array.isArray(src)) return [];
  const out: Mon[] = [];
  for (const r of src as Record<string, unknown>[]) {
    if (!r || typeof r !== 'object') continue;
    const m = mkMon(String(r.name || '').slice(0, 20));
    if (typeof r.id === 'string') m.id = r.id;
    const ev = Array.isArray(r.ev) ? r.ev : [], tg = Array.isArray(r.target) ? r.target : [];
    m.ev = STAT.map((_, i) => clamp(ev[i])); m.target = STAT.map((_, i) => clamp(tg[i]));
    let over = total(m) - MAX_TOTAL;
    for (let i = 5; i >= 0 && over > 0; i--) { const cut = Math.min(over, m.ev[i]); m.ev[i] -= cut; over -= cut; }
    m.enemies = (Array.isArray(r.enemies) ? r.enemies as Record<string, unknown>[] : []).filter(e => e && byNo[String(e.no)]).map(e => ({ no: String(e.no), count: Math.max(0, Math.round(Number(e.count) || 0)) }));
    out.push(m);
  }
  return out;
}
const mon = () => state.mons[state.active];
function save() {
  state.updatedAt = Date.now();
  try { localStorage.setItem(LS, JSON.stringify(state)); } catch { /* 容量超過などは無視 */ }
  scheduleFileSave();
}

// ---------- 履歴（もどす） ----------
const snapshot = () => JSON.stringify({ ev: mon().ev, enemies: mon().enemies });
function pushHistory() { history.push(snapshot()); if (history.length > 200) history.shift(); }
function clearHistory() { history = []; }
function undo() {
  const s = history.pop(); if (!s) return;
  const d = JSON.parse(s); mon().ev = d.ev; mon().enemies = d.enemies;
  save(); render(); toast('1 手もどしました');
}

// ---------- 努力値の計算 ----------
/** 補正込みの獲得努力値。base は倒した相手の努力値 */
function gains(base: number[]) {
  const g = base.map(v => v * (state.item === 'brace' ? 2 : 1));
  if (state.item !== '' && state.item !== 'brace') g[+state.item] += state.pbonus;
  return state.pokerus ? g.map(v => v * 2) : g;
}
const koGains = (i: number, n: number) => gains(STAT.map((_, j) => j === i ? n : 0));
const gainText = (g: number[], sign = '+') => g.map((v, i) => v ? `${STAT_S[i]}${sign}${v}` : '').filter(Boolean).join(' ');
/** 上限（1 ステータス 252、合計 510）を守って加算し、加算できた合計を返す */
function apply(g: number[]) {
  const m = mon(); let room = MAX_TOTAL - total(m), added = 0;
  g.forEach((v, i) => { const can = Math.min(v, MAX_STAT - m.ev[i], room); if (can > 0) { m.ev[i] += can; room -= can; added += can; } });
  return added;
}
/** 目標到達までの匹数（いちばん早く届くステータス） */
function needFor(g: number[]): { i: number; n: number } | null {
  const m = mon();
  const cands = g.map((v, i) => ({ i, n: m.target[i] > m.ev[i] && v > 0 ? Math.ceil((m.target[i] - m.ev[i]) / v) : Infinity })).filter(c => c.n < Infinity);
  return cands.length ? cands.reduce((a, b) => b.n < a.n ? b : a) : null;
}
function addGains(g: number[]) {
  const want = g.reduce((a, b) => a + b, 0);
  pushHistory();
  const added = apply(g);
  if (!added) { history.pop(); toast('これ以上振れません（上限）'); return; }
  save(); render();
  toast(added < want ? `+${added}（上限で切り捨て）` : gainText(g));
}
function koEnemy(i: number) {
  const en = mon().enemies[i]; const p = en && byNo[en.no]; if (!p?.ev) return;
  const g = gains(p.ev), want = g.reduce((a, b) => a + b, 0);
  pushHistory();
  const added = apply(g); en.count++;
  save(); render(); flash(i);
  toast(!added ? `${p.name} ×${en.count}（努力値は上限）` : added < want ? `${p.name} ×${en.count}  +${added}（上限で切り捨て）` : `${p.name} ×${en.count}  ${gainText(g)}`);
}
function decEnemy(i: number) {
  const en = mon().enemies[i]; const p = en && byNo[en.no]; if (!p?.ev || en.count <= 0) return;
  const g = gains(p.ev);
  pushHistory();
  g.forEach((v, j) => { mon().ev[j] = Math.max(0, mon().ev[j] - v); }); en.count--;
  save(); render(); flash(i);
  toast(`${p.name} ×${en.count}  ${gainText(g, '−')}`);
}
function flash(i: number) {
  const el = document.querySelector(`.ev-enemy [data-ko="${i}"]`); if (!el) return;
  el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 150);
}

// ---------- 描画 ----------
const $ = (id: string) => document.getElementById(id);
const pill = (i: number, v: number) => `<span class="ev-pill" style="--pc:var(--ev${i})"><i></i>${STAT[i]}+${v}</span>`;
const pills = (ev: number[]) => ev.map((v, i) => v ? pill(i, v) : '').join('');

/** ページの骨組み。中身は bindEv → render が入れる */
export function vEv() {
  return `<div class="crumb"><a href="#/">ファンゲーム攻略</a> › <a href="#/vega/">ベガ</a> › 努力値カウンター</div>
  <div id="ev-app"><div id="ev-main"></div><div id="ev-sheets"></div><div class="ev-toast" id="ev-toast"></div></div>`;
}

function render() {
  const main = $('ev-main'); if (!main) return;
  const m = mon(), t = total(m);
  main.innerHTML = `
  <h1>努力値カウンター <span class="sub">たおす相手を登録して、クリックやキーで集計</span></h1>
  <div class="filters ev-top">
    <div class="frow">
      <span class="lab">育てる</span>
      <span class="ev-slots">${state.mons.map((x, i) => `<span class="chip${i === state.active ? ' on' : ''}"><button data-act="slot" data-i="${i}">${esc(x.name || '名前なし')}</button>${i === state.active ? `<button class="x" data-act="del" data-i="${i}" title="このポケモンを削除">×</button>` : ''}</span>`).join('')}<button class="btn" data-act="add">＋ 追加</button></span>
      <span class="count">${state.mons.length > 1 ? `${state.mons.length} 体` : ''}</span>
    </div>
    <div class="frow">
      <span class="lab">もちもの</span>
      <select id="ev-item"><option value="">なし</option><option value="brace"${state.item === 'brace' ? ' selected' : ''}>きょうせいギプス（×2）</option>${ITEM_LABEL.map((l, i) => `<option value="${i}"${state.item === String(i) ? ' selected' : ''}>${l}（${STAT[i]} +${state.pbonus}）</option>`).join('')}</select>
      <label class="ev-check"><input type="checkbox" id="ev-pokerus"${state.pokerus ? ' checked' : ''}> ポケルス（×2）</label>
      <span class="lab">パワー系</span><select id="ev-pbonus"><option value="4"${state.pbonus === 4 ? ' selected' : ''}>+4（〜USUM）</option><option value="8"${state.pbonus === 8 ? ' selected' : ''}>+8（剣盾〜）</option></select>
      <span class="count">
        <button class="btn" data-act="undo"${history.length ? '' : ' disabled'}>↶ もどす</button>
        <button class="btn${state.manual ? ' on' : ''}" data-act="manual" title="ステータスごとの手動ボタンを表示">手動</button>
        <button class="btn" data-act="menu">⋯</button>
      </span>
    </div>
    <div class="ev-autosave ${fileHandle ? (filePerm === 'granted' ? 'on' : 'warn') : ''}"><i></i>${autosaveText()}</div>
  </div>

  <div class="ev-summary">
    <input id="ev-name" class="ev-name" placeholder="育てるポケモンの名前" maxlength="20" autocomplete="off" value="${esc(m.name)}">
    <div class="ev-total"><span class="big">${t}<small> / ${MAX_TOTAL}</small></span><span class="rest">残り <b>${MAX_TOTAL - t}</b></span></div>
    <div class="ev-totalbar">${m.ev.map((v, i) => `<span style="width:${v / MAX_TOTAL * 100}%;background:var(--ev${i})"></span>`).join('')}</div>
    <div class="ev-legend">${m.ev.map((v, i) => v || m.target[i] ? `<span><i style="background:var(--ev${i})"></i>${STAT[i]} <b>${v}</b></span>` : '').join('') || '<span class="muted">努力値はまだ振られていません</span>'}</div>
  </div>

  <h2>たおす相手 <span class="cnt ev-keyhint">キー: 倒す ／ Shift+キー: −1 ／ Z: もどす</span><button class="btn ev-add" data-act="search">＋ 相手を追加</button></h2>
  <div class="ev-enemies">${m.enemies.length ? m.enemies.map((e, i) => enemyCard(e, i)).join('') : `<div class="ev-empty">倒す相手を登録すると、クリック 1 回で討伐数と努力値が加算されます。<button class="btn" data-act="search">＋ 相手を追加</button></div>`}</div>

  <h2>努力値 <span class="cnt">数値をクリックで直接入力</span></h2>
  <div class="ev-stats${state.manual ? ' manual' : ''}">${STAT.map((_, i) => statCard(i)).join('')}</div>`;
  const inp = main.querySelector<HTMLSelectElement>('#ev-item')!;
  inp.addEventListener('change', () => { state.item = inp.value; save(); render(); });
  main.querySelector<HTMLInputElement>('#ev-pokerus')!.addEventListener('change', e => { state.pokerus = (e.target as HTMLInputElement).checked; save(); render(); });
  main.querySelector<HTMLSelectElement>('#ev-pbonus')!.addEventListener('change', e => { state.pbonus = (e.target as HTMLSelectElement).value === '8' ? 8 : 4; save(); render(); });
  const name = main.querySelector<HTMLInputElement>('#ev-name')!;
  name.addEventListener('input', () => { mon().name = name.value; save(); });
  name.addEventListener('change', render);
}

function enemyCard(e: Enemy, i: number) {
  const p = byNo[e.no]; if (!p) return '';
  const g = p.ev ? gains(p.ev) : null, need = g ? needFor(g) : null;
  const m = mon();
  return `<div class="ev-enemy${p.ev ? '' : ' unknown'}">
    <button class="hit" data-ko="${i}"${p.ev ? '' : ' disabled'}>
      ${img(p)}
      <span class="body">
        <span class="ename">${KEY_LABELS[i] ? `<kbd>${KEY_LABELS[i]}</kbd>` : ''}${esc(p.name)}${tys(p.t, true)}</span>
        <span class="eyield">${p.ev ? pills(p.ev) + `<span class="arrow">→</span><b>${gainText(g!)}</b>` : '<span class="muted">努力値不明（wiki の記載が不正）</span>'}</span>
        <span class="eneed">${need ? `あと <b>${need.n}</b> 匹で ${STAT[need.i]} が目標に到達` : p.ev && m.target.some((t, j) => t > m.ev[j]) ? '目標のステータスには効きません' : ''}</span>
      </span>
    </button>
    <span class="side"><span class="cnt"><b>${e.count}</b><small>倒した</small></span><span class="side-btns"><button data-act="dec" data-i="${i}" title="1 匹分もどす"${e.count > 0 && p.ev ? '' : ' disabled'}>−1</button><button data-act="rm" data-i="${i}" title="一覧から外す">外す</button></span></span>
  </div>`;
}

function statCard(i: number) {
  const m = mon(), v = m.ev[i], tg = m.target[i], done = tg > 0 && v >= tg;
  return `<div class="ev-stat${done ? ' done' : ''}" style="--sc:var(--ev${i})">
    <div class="hd"><span class="nm">${STAT[i]}<span class="abbr">${STAT_S[i]}</span>${done ? '<span class="ok">✓ 達成</span>' : ''}</span>
      <span class="val"><button data-act="edit" data-i="${i}" title="数値を直接入力">${v}</button><span class="sep">/</span><button class="tgt" data-act="edit" data-i="${i}">${tg || '—'}</button></span></div>
    <div class="bar"><i style="width:${v / MAX_STAT * 100}%;background:var(--sc)"></i>${tg ? `<em style="left:${tg / MAX_STAT * 100}%"></em>` : ''}</div>
    ${tg > v ? `<div class="need">目標まで <b>${tg - v}</b>：${[1, 2, 3].map(n => `+${n} の相手なら <b>${Math.ceil((tg - v) / koGains(i, n)[i])}</b> 匹`).join('　')}</div>` : ''}
    <div class="btns">
      <button data-act="minus" data-i="${i}">−1</button>
      ${[1, 2, 3].map(n => `<button class="ko" data-act="ko" data-i="${i}" data-n="${n}"><b>+${n}</b><small>倒す→+${koGains(i, n)[i]}</small></button>`).join('')}
      <button data-act="feather" data-i="${i}"><b>+1</b><small>はね</small></button>
      <button data-act="drink" data-i="${i}"><b>+10</b><small>ドリンク</small></button>
    </div>
  </div>`;
}

let toastTimer: number | undefined;
function toast(msg: string) {
  const t = $('ev-toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1400);
}

// ---------- シート（検索・編集・メニュー・確認・テキスト入出力） ----------
const sheets = () => $('ev-sheets');
function closeSheet() { const s = sheets(); if (s) s.innerHTML = ''; }
const sheetOpen = () => !!sheets()?.firstChild;
function openSheet(cls: string, inner: string) {
  const s = sheets(); if (!s) return;
  s.innerHTML = `<div class="ev-sheet ${cls}" data-act="close-bg"><div class="in">${inner}</div></div>`;
}

let q = '', statFilter = -1, wildOnly = true;
function openSearch() {
  openSheet('search', `<h2>たおす相手を追加</h2>
    <input class="q" id="ev-q" placeholder="名前・タイプ・出現場所で検索（例: スフィア B7F）" autocomplete="off" value="${esc(q)}">
    <div class="frow" id="ev-filters"></div>
    <p class="muted" id="ev-rcount"></p>
    <div class="results" id="ev-results"></div>
    <div class="acts"><button class="btn pri" data-act="close">閉じる</button></div>`);
  const inp = $('ev-q') as HTMLInputElement;
  inp.addEventListener('input', () => { q = inp.value; renderResults(); });
  renderFilters(); renderResults();
  setTimeout(() => inp.focus(), 30);
}
function renderFilters() {
  const f = $('ev-filters'); if (!f) return;
  f.innerHTML = `<button class="chip${wildOnly ? ' on' : ''}" data-act="f-wild">野生で出る</button>` +
    STAT.map((s, i) => `<button class="chip${statFilter === i ? ' on' : ''}" data-act="f-stat" data-i="${i}"><i class="dot" style="background:var(--ev${i})"></i>${s}</button>`).join('');
}
function renderResults() {
  const r = $('ev-results'); if (!r) return;
  const terms = norm(q).length ? q.trim().split(/\s+/).map(norm).filter(Boolean) : [];
  const sel = new Set(mon().enemies.map(e => e.no));
  const list = P.filter(p => (!wildOnly || wild(p)) && (statFilter < 0 || (p.ev && p.ev[statFilter] > 0))
    && terms.every(t => norm(p.n + p.name + p.t.join('') + p.hab.join('')).includes(t)));
  $('ev-rcount')!.textContent = `${list.length} 匹`;
  r.innerHTML = list.slice(0, 80).map(p => `<button class="res${sel.has(p.n) ? ' sel' : ''}${p.ev ? '' : ' unk'}" data-act="toggle" data-no="${p.n}">
      ${img(p)}<span class="body"><span class="rn"><span class="no">${p.n}</span>${esc(p.name)}${tys(p.t, true)}</span><span class="rh">${esc(p.hab.join(' ') || '生息地の記載なし')}</span></span>
      <span class="ry">${p.ev ? pills(p.ev) : '<span class="ev-pill">不明</span>'}</span><span class="mark">✓</span></button>`).join('') || '<p class="muted">該当なし</p>';
}
function toggleEnemy(no: string) {
  const m = mon(), i = m.enemies.findIndex(e => e.no === no);
  pushHistory();
  if (i >= 0) { m.enemies.splice(i, 1); toast(`${byNo[no].name} を外しました`); } else { m.enemies.push({ no, count: 0 }); toast(`${byNo[no].name} を追加しました`); }
  save(); render(); renderResults();
}

let editIdx = 0;
function openEdit(i: number) {
  editIdx = i; const m = mon();
  openSheet('edit', `<h2>${STAT[i]} を編集</h2>
    <div class="row"><label>現在値</label><input type="number" id="ev-cur" min="0" max="252" inputmode="numeric" value="${m.ev[i]}"></div>
    <div class="row"><label>目標値</label><input type="number" id="ev-tgt" min="0" max="252" inputmode="numeric" value="${m.target[i]}"></div>
    <div class="frow">${PRESETS.map(n => `<button class="chip" data-act="preset" data-n="${n}">${n}</button>`).join('')}</div>
    <div class="acts"><button class="btn" data-act="close">キャンセル</button><button class="btn pri" data-act="edit-ok">決定</button></div>`);
  const c = $('ev-cur') as HTMLInputElement; c.focus(); c.select();
}
function editOk() {
  const m = mon(), cur = clamp(($('ev-cur') as HTMLInputElement).value), tgt = clamp(($('ev-tgt') as HTMLInputElement).value);
  const others = total(m) - m.ev[editIdx];
  pushHistory();
  m.ev[editIdx] = Math.min(cur, MAX_TOTAL - others); m.target[editIdx] = tgt;
  if (m.ev[editIdx] < cur) toast(`合計 ${MAX_TOTAL} を超えるため ${m.ev[editIdx]} にしました`);
  save(); render(); closeSheet();
}

function openMenu() {
  openSheet('menu', `<h2>メニュー</h2><div class="acts col">
    <button class="btn" data-act="rename">名前を変更</button>
    ${FS_OK ? `<button class="btn" data-act="autofile">${fileHandle ? `自動保存先のファイルを解除（${esc(fileName)}）` : '自動保存先のファイルを設定'}</button>` : ''}
    <button class="btn" data-act="save-one">このポケモンを別ファイルに書き出す</button>
    <button class="btn" data-act="save-all">すべてを別ファイルに書き出す</button>
    <button class="btn" data-act="load">ファイルから読み込む（追加）</button>
    <button class="btn" data-act="reset">このポケモンの努力値と討伐数を 0 にする</button>
    <button class="btn danger" data-act="del" data-i="${state.active}">このポケモンを削除</button>
    <button class="btn" data-act="close">閉じる</button></div>`);
}

// ブラウザ標準の confirm() は埋め込み環境で無効化されることがあるので、ページ内シートで確認する
let confirmResolve: ((v: boolean) => void) | null = null;
function ask(title: string, note: string, okLabel: string) {
  openSheet('confirm', `<h2>${esc(title)}</h2><p class="muted">${esc(note)}</p>
    <div class="acts"><button class="btn" data-act="close">キャンセル</button><button class="btn pri" data-act="confirm-ok">${esc(okLabel)}</button></div>`);
  return new Promise<boolean>(res => { confirmResolve = res; });
}
function answer(v: boolean) { closeSheet(); const r = confirmResolve; confirmResolve = null; r?.(v); }

async function deleteMon(i: number) {
  const m = state.mons[i]; if (!m) return;
  closeSheet();
  if (!await ask(`${m.name || 'このポケモン'} を削除しますか？`, '努力値・目標・たおす相手の一覧も消えます。もどすでは復元できません。', '削除する')) return;
  state.mons.splice(i, 1);
  if (!state.mons.length) state.mons.push(mkMon(''));
  state.active = Math.min(Math.max(0, i - 1), state.mons.length - 1);
  clearHistory(); save(); render(); toast('削除しました');
}
async function resetMon() {
  closeSheet();
  if (!await ask(`${mon().name || 'このポケモン'} の努力値と討伐数を 0 にしますか？`, 'たおす相手の一覧は残ります。「もどす」で 1 回だけ戻せます。', 'リセットする')) return;
  pushHistory(); mon().ev = zero(); mon().enemies.forEach(e => { e.count = 0; });
  save(); render(); toast('リセットしました');
}

// ---------- ファイル書き出し・読み込み ----------
function exportData(mons: Mon[]) {
  return JSON.stringify({ app: 'vega-ev', version: 1, exportedAt: new Date().toISOString(), updatedAt: state.updatedAt, item: state.item, pokerus: state.pokerus, pbonus: state.pbonus, active: state.active, mons }, null, 2);
}
function downloadFile(mons: Mon[]) {
  const d = new Date(), pad = (n: number) => String(n).padStart(2, '0');
  const base = mons.length === 1 ? (mons[0].name || 'pokemon').replace(/[\\/:*?"<>|\s]/g, '_') : 'all';
  const name = `ev-${base}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
  const url = URL.createObjectURL(new Blob([exportData(mons)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${name} を保存しました`);
}
function importText(text: string) {
  let data: unknown;
  try { data = JSON.parse(text); } catch { toast('JSON として読めませんでした'); return; }
  const mons = sanitize(data);
  if (!mons.length) { toast('ポケモンのデータが見つかりません'); return; }
  let added = 0, replaced = 0;
  for (const m of mons) { const i = state.mons.findIndex(x => x.id === m.id); if (i >= 0) { state.mons[i] = m; replaced++; } else { state.mons.push(m); added++; } }
  const d = data as Partial<State>;
  if (typeof d.item === 'string') state.item = d.item;
  if (typeof d.pokerus === 'boolean') state.pokerus = d.pokerus;
  if (d.pbonus === 4 || d.pbonus === 8) state.pbonus = d.pbonus;
  state.active = state.mons.length - 1; clearHistory(); save(); render();
  toast(`${added} 体を追加${replaced ? `、${replaced} 体を更新` : ''}しました`);
}
function pickFile() {
  const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
  inp.addEventListener('change', () => { const f = inp.files?.[0]; if (f) f.text().then(importText); });
  inp.click();
}

// ---------- 自動保存先ファイル（File System Access API、Chrome / Edge） ----------
interface FsHandle { name: string; getFile(): Promise<File>; createWritable(): Promise<{ write(d: string): Promise<void>; close(): Promise<void> }>; queryPermission(o: { mode: string }): Promise<string>; requestPermission(o: { mode: string }): Promise<string> }
type Picker = (o: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FsHandle>;
const FS_OK = typeof (window as unknown as { showSaveFilePicker?: Picker }).showSaveFilePicker === 'function' && typeof indexedDB !== 'undefined';
let fileHandle: FsHandle | null = null, fileName = '', filePerm = 'none', fileError = '';
let fileTimer: number | undefined;
function scheduleFileSave() { clearTimeout(fileTimer); fileTimer = setTimeout(writeFile, 600); }
async function writeFile() {
  if (!fileHandle || filePerm !== 'granted') return;
  try { const w = await fileHandle.createWritable(); await w.write(exportData(state.mons)); await w.close(); fileError = ''; }
  catch (e) { fileError = `ファイルへの保存に失敗（${(e as Error)?.name || 'error'}）`; }
  const el = document.querySelector('.ev-autosave'); if (el) el.innerHTML = `<i></i>${autosaveText()}`;
}
const autosaveText = () => `自動保存: この端末${fileHandle ? (filePerm === 'granted' ? ' + ' + esc(fileName) : ` <button class="btn" data-act="resume">${esc(fileName)} への自動保存を再開</button>`) : ''}${fileError ? ` <span class="warn">${esc(fileError)}</span>` : ''}`;
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => { const r = indexedDB.open('vega-ev-fs', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function idbGet(key: string): Promise<unknown> { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction('kv').objectStore('kv').get(key); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); }); }
async function idbSet(key: string, val: unknown) { const d = await idb(); return new Promise<void>((res, rej) => { const s = d.transaction('kv', 'readwrite').objectStore('kv'); const t = val === undefined ? s.delete(key) : s.put(val, key); t.onsuccess = () => res(); t.onerror = () => rej(t.error); }); }
async function useHandle(h: FsHandle) {
  fileHandle = h; fileName = h.name; filePerm = await h.queryPermission({ mode: 'readwrite' });
  if (filePerm !== 'granted') { render(); return; }
  // ファイルのほうが新しければ取り込む（別のブラウザで書いた分）
  try {
    const d = JSON.parse(await (await h.getFile()).text()) as Partial<State>;
    if ((d.updatedAt || 0) > state.updatedAt) { const mons = sanitize(d); if (mons.length) { state = { ...state, ...d, mons, active: Math.min(Number(d.active) || 0, mons.length - 1) } as State; clearHistory(); toast('ファイルの内容を読み込みました'); } }
  } catch { /* 空・壊れた JSON は上書きする */ }
  render(); writeFile();
}
async function chooseAutoFile() {
  closeSheet();
  try {
    const h = await (window as unknown as { showSaveFilePicker: Picker }).showSaveFilePicker({ suggestedName: 'vega-ev.json', types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
    await idbSet('auto', h); fileHandle = h; fileName = h.name; filePerm = 'granted';
    await writeFile(); render(); toast(`${h.name} に自動保存します`);
  } catch (e) { if ((e as Error)?.name !== 'AbortError') toast('設定できませんでした'); }
}
async function clearAutoFile() { closeSheet(); await idbSet('auto', undefined); fileHandle = null; fileName = ''; filePerm = 'none'; render(); toast('ファイルへの自動保存を解除しました'); }
async function resumeFile() {
  if (!fileHandle) return;
  try { filePerm = await fileHandle.requestPermission({ mode: 'readwrite' }); } catch { filePerm = 'denied'; }
  if (filePerm === 'granted') useHandle(fileHandle); else render();
}
let fileInit = false;
async function initFile() {
  if (fileInit || !FS_OK) return; fileInit = true;
  try { const h = await idbGet('auto'); if (h) await useHandle(h as FsHandle); } catch { /* 未設定 */ }
}

// ---------- イベント ----------
function onClick(e: Event) {
  const el = (e.target as Element).closest<HTMLElement>('[data-act],[data-ko]'); if (!el) return;
  if (el.dataset.ko !== undefined) return koEnemy(+el.dataset.ko);
  const act = el.dataset.act!, i = +(el.dataset.i ?? -1);
  if (act === 'close-bg') { if (e.target === el) confirmResolve ? answer(false) : closeSheet(); return; }
  switch (act) {
    case 'slot': state.active = i; clearHistory(); save(); render(); break;
    case 'add': state.mons.push(mkMon('')); state.active = state.mons.length - 1; clearHistory(); save(); render(); ($('ev-name') as HTMLInputElement).focus(); break;
    case 'del': deleteMon(i); break;
    case 'undo': undo(); break;
    case 'manual': state.manual = !state.manual; save(); render(); break;
    case 'menu': openMenu(); break;
    case 'search': openSearch(); break;
    case 'dec': decEnemy(i); break;
    case 'rm': pushHistory(); mon().enemies.splice(i, 1); save(); render(); break;
    case 'edit': openEdit(i); break;
    case 'minus': if (mon().ev[i] > 0) { pushHistory(); mon().ev[i]--; save(); render(); } break;
    case 'ko': addGains(koGains(i, +el.dataset.n!)); break;
    case 'feather': addGains(STAT.map((_, j) => j === i ? 1 : 0)); break;
    case 'drink': addGains(STAT.map((_, j) => j === i ? 10 : 0)); break;
    case 'close': confirmResolve ? answer(false) : closeSheet(); break;
    case 'confirm-ok': answer(true); break;
    case 'f-wild': wildOnly = !wildOnly; renderFilters(); renderResults(); break;
    case 'f-stat': statFilter = statFilter === i ? -1 : i; renderFilters(); renderResults(); break;
    case 'toggle': toggleEnemy(el.dataset.no!); break;
    case 'preset': ($('ev-tgt') as HTMLInputElement).value = el.dataset.n!; break;
    case 'edit-ok': editOk(); break;
    case 'rename': closeSheet(); { const n = $('ev-name') as HTMLInputElement; n.focus(); n.select(); } break;
    case 'autofile': fileHandle ? clearAutoFile() : chooseAutoFile(); break;
    case 'resume': resumeFile(); break;
    case 'save-one': closeSheet(); downloadFile([mon()]); break;
    case 'save-all': closeSheet(); downloadFile(state.mons); break;
    case 'load': closeSheet(); pickFile(); break;
    case 'reset': resetMon(); break;
  }
}
function onKey(e: KeyboardEvent) {
  if (!$('ev-app')) return;
  const t = e.target as HTMLElement;
  if (e.key === 'Escape' && sheetOpen()) { confirmResolve ? answer(false) : closeSheet(); return; }
  if (e.key === 'Enter' && $('ev-cur')) { e.preventDefault(); editOk(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  if (sheetOpen()) return;
  if (e.code === 'KeyZ') { e.preventDefault(); undo(); return; }
  const i = KEY_CODES.indexOf(e.code); if (i < 0 || i >= mon().enemies.length) return;
  e.preventDefault();
  if (e.shiftKey) decEnemy(i); else koEnemy(i);
}

let keyBound = false;
export function bindEv() {
  const app = $('ev-app'); if (!app) return;
  app.addEventListener('click', onClick);
  if (!keyBound) { keyBound = true; document.addEventListener('keydown', onKey); window.addEventListener('pagehide', () => { if (fileTimer) writeFile(); }); }
  render(); initFile();
}

// ハッシュルーティング: #/ はハブ、#/vega/<route>/... がベガのページ（接頭辞なしの旧 URL もベガとして扱う）
export type Query = Record<string, string>;
export interface Ctx { seg: string[]; q: Query }
export type View = (ctx: Ctx) => string;

export function parseHash(): Ctx {
  const h = location.hash.replace(/^#\/?/, '') || '';
  const [path, qs] = h.split('?');
  const seg = path.split('/').map(decodeURIComponent);
  const q: Query = {};
  (qs || '').split('&').forEach(kv => { if (!kv) return; const [k, v] = kv.split('='); q[k] = decodeURIComponent(v || ''); });
  return { seg, q };
}

/** 現在のクエリに patch をマージして base に遷移する（空の値は消す） */
export function setQuery(base: string, patch: Query) {
  const q: Query = { ...parseHash().q, ...patch };
  Object.keys(q).forEach(k => { if (!q[k]) delete q[k]; });
  location.hash = base + (Object.keys(q).length ? '?' + Object.entries(q).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&') : '');
}

/** 詳細ページのルートがどのナビ項目に属するか */
const NAV_OF: Record<string, string> = { p: 'list', m: 'moves', a: 'abilities', loc: 'map', g: 'guide' };

export function startRouter(opts: { hub: () => string; views: Record<string, View>; fallback: string; afterRender: () => void }) {
  const app = document.getElementById('app')!;
  let lastRoute = '';
  const route = () => {
    const { seg, q } = parseHash();
    let html: string;
    if (!seg[0]) {
      html = opts.hub();
      document.querySelectorAll<HTMLElement>('#nav a').forEach(a => a.classList.remove('cur'));
    } else {
      if (seg[0] === 'vega') seg.shift();
      const r = seg[0] || opts.fallback;
      document.querySelectorAll<HTMLElement>('#nav a').forEach(a => a.classList.toggle('cur', a.dataset.r === r || a.dataset.r === NAV_OF[r]));
      const v = Object.hasOwn(opts.views, r) ? opts.views[r] : opts.views[opts.fallback];
      html = v({ seg, q });
    }
    const r0 = seg[0] || opts.fallback, y = window.scrollY;
    app.innerHTML = html;
    // ポケモン詳細 → ポケモン詳細（進化系統など）の遷移ではスクロール位置を保つ
    if (lastRoute === 'p' && r0 === 'p') window.scrollTo(0, y); else window.scrollTo(0, 0);
    lastRoute = r0;
    opts.afterRender();
  };
  window.addEventListener('hashchange', route);
  route();
}

import './styles/base.css';
import './styles/header.css';
import './styles/components.css';
import './styles/pokemon.css';
import './styles/map.css';
import './styles/guide.css';
import './styles/ev.css';

import { startRouter } from './router';
import { initSearch } from './search';
import { bindMapHover } from './map/render';
import { bindZoom } from './figures';
import { vHub } from './views/hub';
import { vHome } from './views/home';
import { vList, bindList } from './views/list';
import { vPokemon, bindMoveTabs } from './views/pokemon';
import { vMoves, vMove, bindMoves } from './views/moves';
import { vAbilities } from './views/abilities';
import { vTypes } from './views/matrix';
import { vMap, bindStage } from './views/map';
import { vLoc } from './views/loc';
import { vGuideIndex, vGuide, bindWiki } from './views/guide';
import { vEv, bindEv } from './views/ev';

// [data-jump] のリンクはページ内の要素へスクロールし、一瞬ハイライトする（攻略チャートの目次など）
document.addEventListener('click', e => {
  const a = (e.target as Element).closest<HTMLElement>('[data-jump]');
  if (!a || a.closest('[data-toc]')) return;
  e.preventDefault();
  const t = document.getElementById(a.dataset.jump!);
  if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1200); }
});

initSearch();

startRouter({
  hub: vHub,
  fallback: 'home',
  views: {
    home: vHome,
    list: ({ q }) => vList(q),
    p: ({ seg }) => vPokemon(seg[1]),
    moves: ({ q }) => vMoves(q),
    m: ({ seg }) => vMove(seg[1]),
    abilities: vAbilities,
    a: ({ seg }) => vList({ a: seg[1] }),
    types: vTypes,
    egg: ({ seg }) => vList({ e: seg[1] }),
    map: ({ q }) => vMap(q),
    loc: ({ seg }) => vLoc(seg[1]),
    guide: vGuideIndex,
    g: ({ seg }) => vGuide(seg[1]),
    ev: vEv,
  },
  // 描画のたびに、そのページにある要素へイベントを付け直す（該当要素が無ければ何もしない）
  afterRender: () => {
    bindList();
    bindMoves();
    bindWiki();
    bindZoom();
    bindStage();
    bindMapHover();
    bindMoveTabs();
    bindEv();
  },
});

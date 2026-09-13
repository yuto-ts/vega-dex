// build.py が生成する data.js（グローバル変数 VEGA）の型と、そこから作る索引
import { STAT } from './typechart';

export interface EvoLink { name: string; n: string | null; cond: string }
export interface EggMove { m: string; c: string[] }

export interface Pokemon {
  n: string; name: string; pid: string;
  t: string[]; a: string[];
  s: number[]; ev: number[] | null;
  pre: EvoLink[]; evo: EvoLink[]; noevo: boolean; orig: boolean;
  hab: string[]; get: string[];
  egg: string[]; hatch: string; gender: string; catch: string; happy: string; bexp: string; exp: string;
  item50: string; item5: string;
  lv: [string, string][]; tm: [string, string][]; tutor: string[]; eggm: EggMove[];
  img?: string;
  /** 種族値合計（読み込み時に計算） */
  tot: number;
}

export interface Move {
  t: string; c: string; p: number | null; a: number | null; pp: number | null;
  tg: string; pr: string; e: string; src: string; chg?: string[];
}

/** [地形, ポケモン名, Lv, 出現率, 努力値] */
export type EncRow = [string, string, string, string, string];
export interface EncGroup { area: string; post: boolean; rows: EncRow[] }
export interface GuidePage { title: string; html: string }

export interface VegaData {
  img: Record<string, string>;
  trainer: Record<string, string>;
  floors: Record<string, [string, string][]>;
  pokemon: Pokemon[];
  moves: Record<string, Move>;
  tm: Record<string, string>;
  map: string;
  land: string;
  recs: Record<string, [string, string][]>;
  guide: Record<string, GuidePage>;
  enc: Record<string, EncGroup[]>;
  source: string;
  fetched: string;
}

declare global {
  const VEGA: VegaData;
}

export const V = VEGA;
export const P = VEGA.pokemon, M = VEGA.moves;
export const byNo: Record<string, Pokemon> = Object.fromEntries(P.map(p => [p.n, p]));
export const byName: Record<string, Pokemon> = Object.fromEntries(P.map(p => [p.name, p]));

// 順位（同値は同順位）
const rankOf = (vals: number[]): Record<number, number> =>
  Object.fromEntries([...new Set(vals)].sort((a, b) => b - a).map((v, r) => [v, r + 1]));
export const RANK = STAT.map((_, i) => rankOf(P.map(p => p.s[i])));
P.forEach(p => { p.tot = p.s.reduce((a, b) => a + b, 0); });
export const RANK_T = rankOf(P.map(p => p.tot));

// 技 → 覚えるポケモン の逆引き
export type LearnHow = 'lv' | 'tm' | 'tutor' | 'egg';
export type Learners = Record<LearnHow, [Pokemon, string][]>;
export const LEARN: Record<string, Learners> = {};
const addL = (m: string, p: Pokemon, how: LearnHow, x: string) =>
  (LEARN[m] ??= { lv: [], tm: [], tutor: [], egg: [] })[how].push([p, x]);
P.forEach(p => {
  p.lv.forEach(([l, m]) => addL(m, p, 'lv', l));
  p.tm.forEach(([n, m]) => addL(m, p, 'tm', n));
  p.tutor.forEach(m => addL(m, p, 'tutor', ''));
  p.eggm.forEach(e => addL(e.m, p, 'egg', e.c.join(' / ')));
});
export const learnCount = (m: string) => LEARN[m] ? Object.values(LEARN[m]).reduce((a, b) => a + b.length, 0) : 0;

const groupBy = (key: (p: Pokemon) => string[]) => {
  const out: Record<string, Pokemon[]> = {};
  P.forEach(p => key(p).forEach(k => (out[k] ??= []).push(p)));
  return out;
};
export const ABIL = groupBy(p => p.a);
export const EGGG = groupBy(p => p.egg);

/** 分布データのポケモン名（「アンノーンA」などのフォーム名を含む）から図鑑のポケモンを引く */
export const encPokemon = (name: string): Pokemon | null =>
  byName[name] || (name.startsWith('アンノーン') ? byName['アンノーン'] : null);

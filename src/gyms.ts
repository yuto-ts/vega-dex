// ジム（攻略ページ id）と町の対応
import { V } from './data';

export const GYMS = ['40', '41', '42', '43', '44', '45', '46', '47'];
export const GYM_CITY: Record<string, string> = { '40': 'アヤメシティ', '41': 'ミルシティ', '42': 'シオウシティ', '43': 'ヒスイシティ', '44': 'オウニシティ', '45': 'カラスバシティ', '46': 'ラピスラシティ', '47': 'ニューアイランド' };
export const CITY_GYM: Record<string, string> = Object.fromEntries(Object.entries(GYM_CITY).map(([p, c]) => [c, p]));

/** ジム攻略ページ冒頭の「ラベル：値」を取り出す */
const gymField = (pid: string, label: string) => V.guide[pid].html.match(new RegExp(`${label}</span>：([^<\\n]+)`))?.[1]?.trim() || '';
export const gymLeaderOf = (pid: string) => gymField(pid, 'ジムリーダー');
export const gymTypeOf = (pid: string) => gymField(pid, '主なタイプ');
export const gymNo = (pid: string) => GYMS.indexOf(pid) + 1;
export const gymBadge = (pid: string) => `<span class="gymno">${gymNo(pid)}</span>`;

type Lang = 'zh' | 'en';

/** Default player names for the start screen, one list per language. */
export const PLAYER_NAMES: Record<Lang, readonly string[]> = {
  zh: [
    '亞瑟', '桂妮薇', '蘭斯洛', '梅林', '高文', '崔斯坦', '伊索德', '珀西瓦',
    '白楊騎士', '灰狼男爵', '橡木伯爵', '銀杉女爵', '黑麥領主', '鹿角公爵',
    '紅隼侯爵', '霧谷子爵', '金穗夫人', '石橋爵士', '北境守望者', '林地遊俠',
    '鐵匠之子', '磨坊主人', '葡萄園主', '城堡總管', '流浪吟遊詩人', '修道院長',
    '小鎮商人', '老礦工', '海港船長', '王室書記', '晨星騎士', '麥田女王',
  ],
  en: [
    'Arthur', 'Guinevere', 'Lancelot', 'Merlin', 'Gawain', 'Tristan', 'Isolde', 'Percival',
    'Eleanor', 'Godfrey', 'Matilda', 'Roland', 'Beatrice', 'Edmund', 'Rowena', 'Aldric',
    'Baron Greywolf', 'Lady Ashford', 'Sir Oakheart', 'Countess Elm', 'Duke Stagmoor',
    'Marquess Kestrel', 'The Miller', 'The Smith', 'Harbor Captain', 'Wandering Bard',
    'Abbess Hilda', 'Royal Scribe', 'Old Miner', 'Morningstar', 'Lady Wheatfield', 'Sir Bramble',
  ],
};

/** A random name in `language`, different from `current` when possible. */
export function randomPlayerName(language: Lang, current?: string): string {
  const names = PLAYER_NAMES[language].filter((name) => name !== current);
  return names[Math.floor(Math.random() * names.length)];
}

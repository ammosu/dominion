import { Decision } from '../types/game';
import { CARD_DATA, getCardName } from './cardData';

type Lang = 'en' | 'zh';

const ERRORS_ZH: Record<string, string> = {
  'Cannot do that in the current phase': '目前階段不能這樣做',
  'It is not your turn to act': '還沒輪到你行動',
  'Card is not in your hand': '手牌中沒有這張卡',
  'Not enough actions': '沒有行動次數了',
  'Not enough buys': '沒有購買次數了',
  'Not enough coins': '金幣不足',
  'Supply pile is empty': '供應堆已空',
  'That card is not in the Supply': '這張卡不在本局供應區',
  'Invalid target for this card': '這張卡的目標無效',
  'Invalid choice': '選擇無效',
  'A choice must be made first': '請先完成目前的選擇',
  'There is nothing to choose': '目前沒有需要選擇的事項',
  'Cannot play Treasures after buying': '購買後就不能再打出寶物牌',
  'The game is over': '遊戲已結束',
};

export function translateError(message: string, lang: Lang): string {
  if (lang === 'en') return message;
  return ERRORS_ZH[message] ?? message;
}

// Longest names first so "Council Room" is replaced before shorter overlaps.
const CARD_IDS_BY_NAME_LENGTH = Object.keys(CARD_DATA).sort(
  (a, b) => CARD_DATA[b].name.en.length - CARD_DATA[a].name.en.length,
);

const LOG_PHRASES_ZH: [RegExp, string][] = [
  [/^Game started!$/, '遊戲開始！'],
  [/^Game over!$/, '遊戲結束！'],
  [/^Winner: (.+)$/, '勝利者：$1'],
  [/^(.+): (-?\d+) points$/, '$1：$2 分'],
  [/^(.+)'s turn$/, '—— $1 的回合 ——'],
  [/ plays all treasures for \+(\d+) coin\(s\)$/, ' 打出全部寶物，+$1 金幣'],
  [/ plays (.+) for \+(\d+) coin\(s\)$/, ' 打出 $1，+$2 金幣'],
  [/ plays (.+) twice$/, ' 執行 $1 兩次'],
  [/ plays (.+)$/, ' 打出 $1'],
  [/ draws up to (\d+) cards$/, ' 抽牌直到手牌 $1 張'],
  [/ draws (\d+) card\(s\)$/, ' 抽了 $1 張牌'],
  [/ gains no Curse \(pile empty\)$/, ' 沒有獲得詛咒（已用完）'],
  [/ has nothing to gain$/, ' 沒有可獲得的牌'],
  [/ gains (.+) to hand$/, ' 獲得 $1 到手牌'],
  [/ gains (.+) onto deck$/, ' 獲得 $1 放到牌庫頂'],
  [/ gains (.+)$/, ' 獲得 $1'],
  [/ buys (.+)$/, ' 購買 $1'],
  [/ reveals Moat and is unaffected$/, ' 展示護城河，不受攻擊影響'],
  [/ reveals a hand with no Victory cards: (.*)$/, ' 展示手牌（沒有勝利牌）：$1'],
  [/ reveals (.+)$/, ' 展示 $1'],
  [/ discards (.+)$/, ' 棄掉 $1'],
  [/ trashes (.+)$/, ' 移除 $1'],
  [/ puts (.+) from discard onto their deck$/, ' 將棄牌堆中的 $1 放到牌庫頂'],
  [/ puts (.+) onto their deck$/, ' 將 $1 放到牌庫頂'],
  [/ sets aside (.+)$/, ' 將 $1 放在一旁'],
  [/ ends Action phase$/, ' 結束行動階段'],
  [/ ends turn$/, ' 結束回合'],
];

/**
 * The log without bookkeeping lines: phase/turn ends (the next turn header
 * says as much) and the "gains" that merely repeats the "buys" before it.
 * Returns the kept entries with their original indices.
 */
export function condenseLog(log: string[]): { entry: string; index: number }[] {
  return log
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry, index }) => {
      if (/ ends (Action phase|turn)$/.test(entry)) return false;
      const gain = entry.match(/^(.+) gains (.+)$/);
      return !(gain && index > 0 && log[index - 1] === `${gain[1]} buys ${gain[2]}`);
    });
}

export function translateLogEntry(entry: string, lang: Lang): string {
  if (lang === 'en') return entry;

  let translated = entry.replace(/^\[AI\] /, '🤖 ');
  for (const [pattern, replacement] of LOG_PHRASES_ZH) {
    if (pattern.test(translated)) {
      translated = translated.replace(pattern, replacement);
      break;
    }
  }
  for (const id of CARD_IDS_BY_NAME_LENGTH) {
    const { en, zh } = CARD_DATA[id].name;
    translated = translated.replace(new RegExp(`\\b${en}\\b`, 'g'), zh);
  }
  return translated.replace(/, /g, '、');
}

/** The prompt shown for a pending decision. */
export function decisionPrompt(decision: Decision, lang: Lang): string {
  const source = getCardName(decision.source, lang);
  const zh = lang === 'zh';
  const { purpose, min, max } = decision;
  switch (purpose.kind) {
    case 'DiscardToDraw':
      return zh ? `${source}：棄掉任意張手牌，再抽等量的牌` : `${source}: discard any number of cards, then draw that many`;
    case 'TrashFromHand':
      return zh ? `${source}：從手牌移除至多 ${max} 張牌` : `${source}: trash up to ${max} cards from your hand`;
    case 'TopdeckFromDiscard':
      return zh ? `${source}：可以從棄牌堆選一張放到牌庫頂` : `${source}: you may put a card from your discard pile onto your deck`;
    case 'PlayDiscarded':
      return zh ? `${source}：要打出被棄掉的這張行動牌嗎？` : `${source}: play the discarded Action card?`;
    case 'Gain': {
      const where = {
        Discard: { zh: '', en: '' },
        Hand: { zh: '到手牌', en: ' to your hand' },
        DeckTop: { zh: '到牌庫頂', en: ' onto your deck' },
      }[purpose.destination];
      return zh
        ? `${source}：獲得一張費用至多 ${purpose.max_cost} 的牌${where.zh}`
        : `${source}: gain a card costing up to ${purpose.max_cost}${where.en}`;
    }
    case 'TopdeckVictory':
      return zh ? `${source} 攻擊：選一張勝利牌放到牌庫頂` : `${source} attack: put a Victory card onto your deck`;
    case 'DiscardDownTo':
      return zh
        ? `${source} 攻擊：棄掉 ${min} 張牌，手牌剩 ${purpose.keep} 張`
        : `${source} attack: discard ${min} card(s), down to ${purpose.keep}`;
    case 'TrashCopper':
      return zh ? `${source}：要移除一張銅幣換取 +3 金幣嗎？` : `${source}: trash a Copper for +3 coins?`;
    case 'DiscardPerEmptyPile':
      return zh ? `${source}：每有一堆空供應堆就棄一張牌（共 ${min} 張）` : `${source}: discard ${min} card(s), one per empty Supply pile`;
    case 'TrashToRemodel':
      return zh ? `${source}：選一張手牌移除` : `${source}: choose a card to trash`;
    case 'TrashTreasureToMine':
      return zh ? `${source}：可以移除一張寶物牌來升級` : `${source}: you may trash a Treasure to upgrade it`;
    case 'PlayTwice':
      return zh ? `${source}：選一張行動牌執行兩次` : `${source}: choose an Action card to play twice`;
    case 'TrashRevealedTreasure':
      return zh ? `${source} 攻擊：選擇要被移除的寶物牌` : `${source} attack: choose which Treasure is trashed`;
    case 'SetAside':
      return zh ? `${source}：要跳過這張行動牌（放在一旁）嗎？` : `${source}: skip this Action card (set it aside)?`;
    case 'SentryTrash':
      return zh ? `${source}：牌庫頂的牌中，選擇要移除的` : `${source}: choose which of the top cards to trash`;
    case 'SentryDiscard':
      return zh ? `${source}：選擇要棄掉的，其餘放回牌庫頂` : `${source}: choose which to discard; the rest go back on top`;
    case 'SentryTopCard':
      return zh ? `${source}：選擇要放在最上面的牌` : `${source}: choose the card to put on top`;
    case 'TopdeckFromHand':
      return zh ? `${source}：選一張手牌放到牌庫頂` : `${source}: put a card from your hand onto your deck`;
  }
}

/** Confirm-button text for a multi-card decision with `count` cards selected: says what will happen. */
export function decisionConfirmLabel(decision: Decision, count: number, lang: Lang): string {
  const zh = lang === 'zh';
  if (count === 0) {
    switch (decision.purpose.kind) {
      case 'DiscardToDraw':
        return zh ? '不棄牌，繼續' : 'Discard nothing';
      case 'TrashFromHand':
      case 'SentryTrash':
        return zh ? '不移除，繼續' : 'Trash nothing';
      case 'SentryDiscard':
        return zh ? '全部放回牌庫頂' : 'Put all back';
      default:
        return zh ? '略過' : 'Skip';
    }
  }
  switch (decision.purpose.kind) {
    case 'DiscardToDraw':
      return zh ? `棄 ${count} 張並抽 ${count} 張` : `Discard ${count}, draw ${count}`;
    case 'DiscardDownTo':
    case 'DiscardPerEmptyPile':
    case 'SentryDiscard':
      return zh ? `棄掉 ${count} 張` : `Discard ${count}`;
    case 'TrashFromHand':
    case 'SentryTrash':
      return zh ? `移除 ${count} 張` : `Trash ${count}`;
    default:
      return zh ? `確認（${count} 張）` : `Confirm (${count})`;
  }
}

/** Yes/no style decisions offer a single card that may be chosen or not. */
export function isYesNoDecision(decision: Decision): boolean {
  return decision.options.length === 1 && decision.min === 0 && decision.max === 1;
}

import { useEffect, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { MiniCard } from '../../fx/miniCard';
import styles from './Tutorial.module.css';

type Lang = 'zh' | 'en';

const SEEN_KEY = 'dominion.tutorialSeen';

/** True until the player has opened the tutorial once (remembered across visits). */
export function tutorialUnseen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === null;
  } catch {
    return false;
  }
}

interface Step {
  icon: string;
  title: Record<Lang, string>;
  lines: Record<Lang, string[]>;
  /** Cards shown on the page, with an optional caption under each. */
  cards: { card: string; caption?: Record<Lang, string> }[];
}

const STEPS: Step[] = [
  {
    icon: '👑',
    title: { zh: '目標：擁有最多勝利點數', en: 'Goal: the most victory points' },
    lines: {
      zh: [
        '你和對手各自經營一副牌，用金幣買進更好的卡，讓牌組越變越強。',
        '遊戲結束時，牌組裡勝利點數最多的人獲勝。',
      ],
      en: [
        'You and your opponent each build a deck, buying better cards so it grows stronger.',
        'When the game ends, whoever has the most victory points in their deck wins.',
      ],
    },
    cards: [
      { card: 'Estate', caption: { zh: '1 分', en: '1 VP' } },
      { card: 'Duchy', caption: { zh: '3 分', en: '3 VP' } },
      { card: 'Province', caption: { zh: '6 分', en: '6 VP' } },
      { card: 'Curse', caption: { zh: '−1 分', en: '−1 VP' } },
    ],
  },
  {
    icon: '🂠',
    title: { zh: '你的牌組', en: 'Your deck' },
    lines: {
      zh: [
        '每人從 7 張銅幣與 3 張莊園開始，每回合從牌庫抽 5 張成為手牌。',
        '用過的牌與新買的牌都進棄牌堆；牌庫抽完時，就把棄牌堆洗成新的牌庫。',
      ],
      en: [
        'Everyone starts with 7 Coppers and 3 Estates and draws a hand of 5 cards each turn.',
        'Used and newly bought cards go to the discard pile; when the deck runs out, the discard pile is shuffled into a new deck.',
      ],
    },
    cards: [
      { card: 'Copper', caption: { zh: '× 7', en: '× 7' } },
      { card: 'Estate', caption: { zh: '× 3', en: '× 3' } },
    ],
  },
  {
    icon: '⚔️',
    title: { zh: '回合 ①：行動階段', en: 'Turn ①: Action phase' },
    lines: {
      zh: [
        '你有 1 次行動，可以打出一張行動卡（手牌中發光的卡）。',
        '有些卡會給你更多行動，例如村莊 +2 行動，就能接著再打其他行動卡。',
        '沒有行動卡可打時，按「進入購買階段」。',
      ],
      en: [
        'You have 1 Action: play one Action card (the glowing cards in your hand).',
        'Some cards give more Actions — Village gives +2, so you can keep playing.',
        'With nothing left to play, press “To Buy phase”.',
      ],
    },
    cards: [
      { card: 'Village', caption: { zh: '+1 卡 +2 行動', en: '+1 Card +2 Actions' } },
      { card: 'Smithy', caption: { zh: '+3 卡', en: '+3 Cards' } },
      { card: 'Militia', caption: { zh: '+2 金幣・攻擊', en: '+2 Coins, Attack' } },
    ],
  },
  {
    icon: '💰',
    title: { zh: '回合 ②：購買階段', en: 'Turn ②: Buy phase' },
    lines: {
      zh: [
        '打出寶物卡來得到金幣，按「打出全部寶物」最快。',
        '然後點發光的供應堆買一張卡（預設 1 次購買），買到的卡會先進棄牌堆。',
      ],
      en: [
        'Play Treasures for coins — “Play All Treasures” is quickest.',
        'Then click a glowing Supply pile to buy a card (1 Buy by default); it goes to your discard pile.',
      ],
    },
    cards: [
      { card: 'Copper', caption: { zh: '1 金幣', en: '1 coin' } },
      { card: 'Silver', caption: { zh: '2 金幣・費用 3', en: '2 coins, costs 3' } },
      { card: 'Gold', caption: { zh: '3 金幣・費用 6', en: '3 coins, costs 6' } },
    ],
  },
  {
    icon: '🧹',
    title: { zh: '回合 ③：清理', en: 'Turn ③: Clean-up' },
    lines: {
      zh: [
        '按「結束回合」後，打出的牌和剩下的手牌全部進棄牌堆，再抽 5 張新手牌。',
        '接著換對手的回合，畫面會重播對手的動作；點一下畫面可以跳過。',
      ],
      en: [
        'After “End Turn”, your played cards and the rest of your hand are discarded and you draw 5 new cards.',
        'Then the opponent takes a turn and you watch a replay of it; tap the table to skip.',
      ],
    },
    cards: [],
  },
  {
    icon: '🏁',
    title: { zh: '遊戲結束與小技巧', en: 'Game end and tips' },
    lines: {
      zh: [
        '行省賣完，或任意 3 堆供應堆賣完時，在那個回合結束後遊戲結束。',
        '前期多買銀幣、金幣和好用的行動卡；有 8 金幣就買行省。',
        '發光的按鈕是建議的下一步；滑過或長按卡片可以看說明。',
      ],
      en: [
        'The game ends after the turn in which the Provinces, or any 3 Supply piles, run out.',
        'Early on, buy Silver, Gold and good Actions; with 8 coins, buy a Province.',
        'A glowing button is the suggested next step; hover or press-and-hold a card to read it.',
      ],
    },
    cards: [
      { card: 'Province', caption: { zh: '費用 8', en: 'Costs 8' } },
    ],
  },
];

const CARD_HEIGHT = 112;
const CARD_WIDTH = Math.round(CARD_HEIGHT * 0.72);

/** A short step-by-step introduction to the rules and the interface. */
export function Tutorial() {
  const open = useUIStore((state) => state.showRulesModal);
  const setOpen = useUIStore((state) => state.setShowRulesModal);
  const language = useUIStore((state) => state.language);
  const artStyle = useUIStore((state) => state.artStyle);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Private mode etc.: the hint just shows again next time.
    }
  }, [open]);

  const go = (to: number) => {
    if (to < 0 || to >= STEPS.length) return;
    setDirection(to > index ? 1 : -1);
    setIndex(to);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open) return null;
  const zh = language === 'zh';
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)} data-testid="tutorial">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={() => setOpen(false)} title={zh ? '關閉' : 'Close'}>
          ✕
        </button>

        <div key={index} className={`${styles.page} ${direction > 0 ? styles.fromRight : styles.fromLeft}`}>
          <div className={styles.icon}>{step.icon}</div>
          <h2 className={styles.title}>{step.title[language]}</h2>
          {step.cards.length > 0 && (
            <div className={styles.cards}>
              {step.cards.map(({ card, caption }, i) => (
                <figure key={card} className={styles.cardSlot} style={{ animationDelay: `${120 + i * 90}ms`, minWidth: CARD_WIDTH }}>
                  <div className={styles.cardBox} style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
                    <MiniCard card={card} rect={{ x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT }} lang={language} style={artStyle} />
                  </div>
                  {caption && <figcaption className={styles.caption}>{caption[language]}</figcaption>}
                </figure>
              ))}
            </div>
          )}
          {step.cards.length === 0 && (
            <div className={styles.flow}>
              {(zh ? ['行動', '購買', '清理'] : ['Action', 'Buy', 'Clean-up']).map((label, i) => (
                <span key={label} className={styles.flowStep} style={{ animationDelay: `${120 + i * 160}ms` }}>
                  {label}
                </span>
              ))}
            </div>
          )}
          <ul className={styles.lines}>
            {step.lines[language].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div className={styles.nav}>
          <button className={styles.navButton} onClick={() => go(index - 1)} disabled={index === 0}>
            {zh ? '← 上一步' : '← Back'}
          </button>
          <div className={styles.dots}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
                onClick={() => go(i)}
                aria-label={`${i + 1}`}
              />
            ))}
          </div>
          {last ? (
            <button className={`${styles.navButton} ${styles.primary}`} onClick={() => setOpen(false)} data-testid="tutorial-done">
              {zh ? '開始玩！' : 'Got it!'}
            </button>
          ) : (
            <button className={`${styles.navButton} ${styles.primary}`} onClick={() => go(index + 1)} data-testid="tutorial-next">
              {zh ? '下一步 →' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

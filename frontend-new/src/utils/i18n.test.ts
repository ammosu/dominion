import { describe, expect, it } from 'vitest';
import { decisionPrompt, translateError, translateLogEntry } from './i18n';
import { calculateVictoryPoints, CARD_DATA, KINGDOM_PRESETS } from './cardData';

describe('log translation', () => {
  it('translates multi-word card names and phrases', () => {
    expect(translateLogEntry('[AI] Bot plays Council Room', 'zh')).toBe('🤖 Bot 打出 議事廳');
    expect(translateLogEntry('Alice discards Estate, Copper', 'zh')).toBe('Alice 棄掉 莊園、銅幣');
    expect(translateLogEntry('Alice gains Gold to hand', 'zh')).toBe('Alice 獲得 黃金 到手牌');
    expect(translateLogEntry("Bot's turn", 'zh')).toBe('—— Bot 的回合 ——');
  });

  it('leaves English untouched', () => {
    expect(translateLogEntry('Alice plays Throne Room', 'en')).toBe('Alice plays Throne Room');
  });
});

describe('errors and prompts', () => {
  it('translates backend errors', () => {
    expect(translateError('Not enough coins', 'zh')).toBe('金幣不足');
    expect(translateError('Something new', 'zh')).toBe('Something new');
  });

  it('describes a Militia discard', () => {
    const prompt = decisionPrompt(
      { player: 0, source: 'Militia', purpose: { kind: 'DiscardDownTo', keep: 3 }, options: [], min: 2, max: 2 },
      'zh',
    );
    expect(prompt).toContain('棄掉 2 張牌');
  });
});

describe('card data', () => {
  it('has every card used by the recommended kingdoms', () => {
    KINGDOM_PRESETS.forEach(({ cards }) => {
      expect(cards).toHaveLength(10);
      cards.forEach((card) => expect(CARD_DATA[card]).toBeDefined());
    });
  });

  it('scores Gardens by deck size', () => {
    const deck = [...Array(18).fill('Copper'), 'Gardens', 'Estate'];
    expect(calculateVictoryPoints(deck)).toBe(3);
  });
});

import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { CARD_DATA } from '../../utils/cardData';
import styles from './PhaseInstructions.module.css';

const TREASURES = ['Copper', 'Silver', 'Gold'];

export function PhaseInstructions() {
  const gameState = useGameStore((state) => state.gameState);
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const language = useUIStore((state) => state.language);

  if (!gameState || !currentPlayer) return null;

  // Don't show instructions during AI turn
  if (currentPlayer.is_ai) {
    return (
      <div className={styles.instructions}>
        {language === 'zh' ? '🤖 AI 正在思考...' : '🤖 AI is thinking...'}
      </div>
    );
  }

  const getInstruction = (): string => {
    const hand = currentPlayer.hand;
    const actionCards = hand.filter(
      (c) => CARD_DATA[c]?.type === 'action'
    );
    const treasureCards = hand.filter((c) => TREASURES.includes(c));

    switch (gameState.phase) {
      case 'Action': {
        if (currentPlayer.actions === 0) {
          return language === 'zh'
            ? '⚡ 沒有行動次數 → 點擊右下角「結束行動階段」進入購買階段'
            : '⚡ No actions left → Click "End Action Phase" to enter Buy phase';
        }
        if (actionCards.length === 0) {
          return language === 'zh'
            ? '📋 手牌中沒有行動卡 → 點擊右下角「結束行動階段」'
            : '📋 No action cards in hand → Click "End Action Phase"';
        }
        return language === 'zh'
          ? `⚔️ 行動階段：點擊手牌中的行動卡來打出（剩餘 ${currentPlayer.actions} 次行動）`
          : `⚔️ Action Phase: Click action cards in your hand to play (${currentPlayer.actions} action(s) left)`;
      }

      case 'Buy': {
        if (treasureCards.length > 0) {
          return language === 'zh'
            ? `💰 先打出寶物牌獲得金幣（右下角「打出全部寶物」），再點擊上方供應區購買卡片`
            : `💰 Play treasures first ("Play All Treasures" button), then click supply cards to buy`;
        }
        if (currentPlayer.coins > 0 && currentPlayer.buys > 0) {
          return language === 'zh'
            ? `🛒 你有 ${currentPlayer.coins} 金幣和 ${currentPlayer.buys} 次購買 → 點擊上方供應區的卡片購買`
            : `🛒 You have ${currentPlayer.coins} coin(s) and ${currentPlayer.buys} buy(s) → Click supply cards to buy`;
        }
        return language === 'zh'
          ? '✅ 購買完成？點擊右下角「結束購買階段」'
          : '✅ Done buying? Click "End Buy Phase"';
      }

      case 'Cleanup':
        return language === 'zh'
          ? '⏳ 清理中... 棄掉手牌並抽新牌'
          : '⏳ Cleanup... Discarding hand and drawing new cards';
    }
  };

  return (
    <div className={styles.instructions} data-testid="phase-instructions">
      {getInstruction()}
    </div>
  );
}

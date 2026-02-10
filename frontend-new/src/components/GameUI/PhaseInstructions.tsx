import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import styles from './PhaseInstructions.module.css';

export function PhaseInstructions() {
  const gameState = useGameStore((state) => state.gameState);
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const language = useUIStore((state) => state.language);

  if (!gameState || !currentPlayer) return null;

  const instructions = {
    Action: {
      zh: '💡 點擊手牌中的行動卡來打出 | 沒有行動卡或不想打？點擊「結束行動階段」',
      en: '💡 Click action cards in your hand to play | No actions or done? Click "End Action Phase"',
    },
    Buy: {
      zh: '💡 點擊上方供應區的卡牌來購買 | 完成購買？點擊「結束購買階段」',
      en: '💡 Click cards in the supply area (top) to buy | Done buying? Click "End Buy Phase"',
    },
    Cleanup: {
      zh: '⏳ 清理中... 棄掉手牌並抽新牌',
      en: '⏳ Cleanup... Discarding hand and drawing new cards',
    },
  };

  return (
    <div className={styles.instructions}>
      {instructions[gameState.phase][language]}
    </div>
  );
}

import { useEffect, useState, type CSSProperties } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useFxStore } from '../../fx/fxStore';
import { useUIStore } from '../../store/uiStore';
import { wsService } from '../../services/websocket';
import { getCardArtPath, getCardCost, getCardFrameStyle, getCardName, isPixelated } from '../../utils/cardData';
import { decisionConfirmLabel, decisionPrompt, isYesNoDecision } from '../../utils/i18n';
import { useCardPreview } from './useCardPreview';
import styles from './DecisionModal.module.css';

/**
 * Renders whatever decision the server is waiting on from this player.
 * Every card choice in the game (own cards and opponents' attacks) goes
 * through here and is answered with a single `Resolve` message.
 */
export function DecisionModal() {
  // Answering waits until the moves that led here (e.g. an attack) have been shown.
  const replaying = useFxStore((state) => state.busy);
  const decision = useGameStore((state) => (replaying ? null : state.myDecision));
  const language = useUIStore((state) => state.language);
  const setHoveredCard = useUIStore((state) => state.setHoveredCard);
  const artStyle = useUIStore((state) => state.artStyle);
  const [selected, setSelected] = useState<number[]>([]);
  const [minimized, setMinimized] = useState(false);
  const { previewProps, endedLongPress } = useCardPreview();

  // A new decision (even an identical-looking one) starts with a fresh selection.
  useEffect(() => {
    setSelected([]);
    setMinimized(false);
  }, [decision]);

  // Yes/no choices are answered inline in the StatusBar.
  if (!decision || isYesNoDecision(decision)) return null;

  const zh = language === 'zh';
  const prompt = decisionPrompt(decision, language);
  const send = (cards: string[]) => {
    setHoveredCard(null);
    wsService.send({ type: 'Resolve', cards });
  };

  if (minimized) {
    return (
      <div className={styles.peekBar}>
        <span>{prompt}</span>
        <button className={styles.confirmButton} onClick={() => setMinimized(false)}>
          {zh ? '返回選擇' : 'Back to choice'}
        </button>
      </div>
    );
  }

  const singleRequired = decision.min === 1 && decision.max === 1;
  // "You may pick one" (Mine, Throne Room, Harbinger): a tap picks, ✕ skips.
  const singleOptional = decision.min === 0 && decision.max === 1;
  const pickOnTap = singleRequired || singleOptional;

  const toggle = (index: number) => {
    if (pickOnTap) {
      send([decision.options[index]]);
      return;
    }
    if (selected.includes(index)) {
      setSelected(selected.filter((i) => i !== index));
    } else if (selected.length < decision.max) {
      setSelected([...selected, index]);
    }
  };

  const countHint = (() => {
    if (singleRequired) return null;
    if (singleOptional) return zh ? '點選一張，或按 ✕ 略過' : 'Tap a card, or ✕ to skip';
    if (decision.min === decision.max) {
      return zh ? `請選擇 ${decision.min} 張` : `Choose exactly ${decision.min}`;
    }
    return zh
      ? `可選 ${decision.min}–${decision.max} 張`
      : `Choose ${decision.min}–${decision.max}`;
  })();

  const canConfirm = selected.length >= decision.min && selected.length <= decision.max;

  return (
    <div className={styles.overlay} data-testid="decision-modal">
      <div className={styles.modal}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>{prompt}</h2>
          <button className={styles.peekButton} onClick={() => setMinimized(true)} title={zh ? '查看桌面' : 'View table'}>
            {zh ? '查看桌面' : 'View table'}
          </button>
          {singleOptional && (
            <button
              className={styles.closeButton}
              onClick={() => send([])}
              title={zh ? '略過' : 'Skip'}
              aria-label={zh ? '略過' : 'Skip'}
              data-testid="decision-skip"
            >
              ✕
            </button>
          )}
        </div>
        {countHint && <div className={styles.subtitle}>{countHint}</div>}

        <div className={styles.cardGrid}>
          {decision.options.map((cardName, index) => {
            const frame = getCardFrameStyle(cardName);
            const artworkPath = getCardArtPath(cardName, artStyle);
            return (
              <div
                key={`${cardName}-${index}`}
                className={`${styles.card} ${selected.includes(index) ? styles.selected : ''}`}
                onClick={() => !endedLongPress() && toggle(index)}
                {...previewProps(cardName)}
                style={{ '--frame': frame.color } as CSSProperties}
                data-testid={`decision-card-${cardName}-${index}`}
              >
                <div className={styles.cardName}>{getCardName(cardName, language)}</div>
                <div
                  className={styles.cardArt}
                  style={
                    artworkPath
                      ? {
                          backgroundImage: `url("${artworkPath}")`,
                          imageRendering: isPixelated(artStyle) ? 'pixelated' : undefined,
                        }
                      : undefined
                  }
                />
                <div className={styles.cardLabel}>{frame.label[language]}</div>
                <div className={styles.cardCost}>{getCardCost(cardName)}</div>
              </div>
            );
          })}
        </div>

        <div className={styles.actions}>
          {!pickOnTap && (
            <button
              className={styles.confirmButton}
              onClick={() => send(selected.map((i) => decision.options[i]))}
              disabled={!canConfirm}
              data-testid="decision-confirm"
            >
              {decisionConfirmLabel(decision, selected.length, language)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

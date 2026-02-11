import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { getCardName, getCardCost, CARD_DATA } from '../../utils/cardData';
import styles from './CardSelectionModal.module.css';

export function CardSelectionModal() {
  const modal = useUIStore((state) => state.cardSelectionModal);
  const closeModal = useUIStore((state) => state.closeCardSelectionModal);
  const language = useUIStore((state) => state.language);

  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<number>(1);
  const [trashCard, setTrashCard] = useState<string | null>(null);

  if (!modal) return null;

  const handleCardClick = (cardName: string) => {
    if (modal.mode === 'trash-and-gain') {
      if (step === 1) {
        setTrashCard(cardName);
        setStep(2);
      } else {
        if (modal.onTwoStep && trashCard) {
          modal.onTwoStep(trashCard, cardName);
        }
        resetAndClose();
      }
      return;
    }

    // For select-hand / select-supply modes: toggle selection
    const idx = selected.indexOf(cardName);
    if (idx >= 0) {
      setSelected(selected.filter((_, i) => i !== idx));
    } else if (selected.length < modal.maxSelect) {
      setSelected([...selected, cardName]);
    }
  };

  const handleConfirm = () => {
    modal.onConfirm(selected);
    resetAndClose();
  };

  const handleCancel = () => {
    if (modal.mode === 'trash-and-gain' && step === 2) {
      setStep(1);
      setTrashCard(null);
      return;
    }
    resetAndClose();
  };

  const resetAndClose = () => {
    setSelected([]);
    setStep(1);
    setTrashCard(null);
    closeModal();
  };

  const getTitle = () => {
    if (modal.mode === 'trash-and-gain') {
      if (step === 1) {
        return modal.title[language];
      }
      const maxCost = trashCard ? getCardCost(trashCard) + (modal.maxGainCostOver ?? 2) : 99;
      return language === 'zh'
        ? `選擇要獲得的牌（不超過 ${maxCost} 金幣）`
        : `Select a card to gain (up to ${maxCost} cost)`;
    }
    return modal.title[language];
  };

  const getAvailableCards = (): string[] => {
    if (modal.mode === 'trash-and-gain' && step === 2 && trashCard) {
      const maxCost = getCardCost(trashCard) + (modal.maxGainCostOver ?? 2);
      const supply = modal.supplyCards || [];
      return supply.filter((card) => getCardCost(card) <= maxCost);
    }
    return modal.cards;
  };

  const cards = getAvailableCards();
  const canConfirm = modal.mode !== 'trash-and-gain' && selected.length >= modal.minSelect;

  const getCardTypeClass = (cardName: string): string => {
    const data = CARD_DATA[cardName];
    if (!data) return '';
    switch (data.type) {
      case 'treasure': return styles.treasure;
      case 'victory': return styles.victory;
      case 'action': return styles.action;
      case 'curse': return styles.curse;
      default: return '';
    }
  };

  return (
    <div className={styles.overlay} data-testid="card-selection-modal">
      <div className={styles.modal}>
        <h2 className={styles.title}>{getTitle()}</h2>

        {modal.mode === 'trash-and-gain' && step === 2 && trashCard && (
          <div className={styles.trashInfo}>
            {language === 'zh'
              ? `移除: ${getCardName(trashCard, 'zh')} (${getCardCost(trashCard)} 金幣)`
              : `Trashing: ${trashCard} (cost ${getCardCost(trashCard)})`}
          </div>
        )}

        {cards.length === 0 ? (
          <div className={styles.emptyMessage}>
            {language === 'zh' ? '沒有可選的牌' : 'No cards available'}
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {cards.map((cardName, index) => (
              <div
                key={`${cardName}-${index}`}
                className={`${styles.card} ${getCardTypeClass(cardName)} ${
                  selected.includes(cardName) ? styles.selected : ''
                }`}
                onClick={() => handleCardClick(cardName)}
                data-testid={`modal-card-${cardName}`}
              >
                <div className={styles.cardName}>{getCardName(cardName, language)}</div>
                <div className={styles.cardCost}>{getCardCost(cardName)}</div>
                {CARD_DATA[cardName]?.tooltip && (
                  <div className={styles.cardDesc}>
                    {CARD_DATA[cardName].tooltip![language]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={handleCancel}
            data-testid="modal-cancel"
          >
            {modal.mode === 'trash-and-gain' && step === 2
              ? (language === 'zh' ? '返回' : 'Back')
              : (language === 'zh' ? '取消' : 'Cancel')
            }
          </button>
          {modal.mode !== 'trash-and-gain' && (
            <button
              className={styles.confirmButton}
              onClick={handleConfirm}
              disabled={!canConfirm}
              data-testid="modal-confirm"
            >
              {language === 'zh' ? '確認' : 'Confirm'}
              {modal.maxSelect > 1 && ` (${selected.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

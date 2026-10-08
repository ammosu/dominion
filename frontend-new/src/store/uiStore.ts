import { create } from 'zustand';
import { DEFAULT_ART_STYLE, isArtStyle, type ArtStyle } from '../utils/cardData';

const ART_STYLE_KEY = 'dominion.artStyle';
const savedArtStyle = (() => {
  try {
    const saved = localStorage.getItem(ART_STYLE_KEY);
    return isArtStyle(saved) ? saved : DEFAULT_ART_STYLE;
  } catch {
    return DEFAULT_ART_STYLE;
  }
})();

interface UIStore {
  showRulesModal: boolean;
  setShowRulesModal: (show: boolean) => void;

  showConfirmModal: boolean;
  confirmModalData: {
    title: string;
    message: string;
    onConfirm: () => void;
  } | null;
  openConfirmModal: (data: UIStore['confirmModalData']) => void;
  closeConfirmModal: () => void;

  hoveredCard: string | null;
  setHoveredCard: (card: string | null) => void;

  /** Supply card opened by a tap (touch screens): details plus a Buy button. */
  inspectedCard: string | null;
  setInspectedCard: (card: string | null) => void;

  language: 'zh' | 'en';
  setLanguage: (lang: 'zh' | 'en') => void;

  /** Card artwork set; remembered across visits. */
  artStyle: ArtStyle;
  setArtStyle: (style: ArtStyle) => void;

  toast: { message: string; type: 'error' | 'success' | 'info' } | null;
  showToast: (message: string, type: 'error' | 'success' | 'info') => void;
}

export const useUIStore = create<UIStore>((set) => ({
  showRulesModal: false,
  setShowRulesModal: (show) => set({ showRulesModal: show }),

  showConfirmModal: false,
  confirmModalData: null,
  openConfirmModal: (data) => set({ showConfirmModal: true, confirmModalData: data }),
  closeConfirmModal: () => set({ showConfirmModal: false, confirmModalData: null }),

  hoveredCard: null,
  setHoveredCard: (card) => set({ hoveredCard: card }),

  inspectedCard: null,
  setInspectedCard: (card) => set({ inspectedCard: card, hoveredCard: null }),

  language: 'zh',
  setLanguage: (lang) => set({ language: lang }),

  artStyle: savedArtStyle,
  setArtStyle: (style) => {
    try {
      localStorage.setItem(ART_STYLE_KEY, style);
    } catch {
      // Private mode etc.: the choice just isn't remembered.
    }
    set({ artStyle: style });
  },

  toast: null,
  showToast: (message, type) => set({ toast: { message, type } }),
}));

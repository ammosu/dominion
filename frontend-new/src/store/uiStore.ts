import { create } from 'zustand';

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

  language: 'zh' | 'en';
  setLanguage: (lang: 'zh' | 'en') => void;

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

  language: 'zh',
  setLanguage: (lang) => set({ language: lang }),

  toast: null,
  showToast: (message, type) => set({ toast: { message, type } }),
}));

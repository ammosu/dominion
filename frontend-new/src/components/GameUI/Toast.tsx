import { useEffect, useState, type CSSProperties } from 'react';
import { useUIStore } from '../../store/uiStore';
import type { Rect } from '../../game/tableLayout';
import styles from './Toast.module.css';

/**
 * Short feedback message. During a game it sits just above the status bar
 * (`anchor`), next to the controls that caused it, leaving both player
 * panels visible; without a table it is centered at the top of the screen.
 */
export function Toast({ anchor }: { anchor?: Rect }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'error' | 'success' | 'info'>('info');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useUIStore.subscribe((state, prevState) => {
      if (state.toast && state.toast !== prevState.toast) {
        setMessage(state.toast.message);
        setType(state.toast.type);
        setVisible(true);

        // Auto-hide after 3 seconds (counted from the latest message)
        clearTimeout(timer);
        timer = setTimeout(() => setVisible(false), 3000);
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  if (!visible) return null;

  const position: CSSProperties | undefined = anchor && {
    left: anchor.x + anchor.width / 2,
    top: anchor.y - 8,
    maxWidth: Math.min(anchor.width, 420),
  };

  return (
    <div
      className={`${styles.toast} ${anchor ? styles.anchored : styles.floating} ${styles[type]}`}
      style={position}
      role={type === 'error' ? 'alert' : 'status'}
      data-testid="toast"
    >
      {type === 'error' && '❌ '}
      {type === 'success' && '✅ '}
      {type === 'info' && 'ℹ️ '}
      {message}
    </div>
  );
}

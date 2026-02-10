import { useEffect, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import styles from './Toast.module.css';

export function Toast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'error' | 'success' | 'info'>('info');

  useEffect(() => {
    const unsubscribe = useUIStore.subscribe((state, prevState) => {
      if (state.toast && state.toast !== prevState.toast) {
        setMessage(state.toast.message);
        setType(state.toast.type);
        setVisible(true);

        // Auto-hide after 3 seconds
        setTimeout(() => {
          setVisible(false);
        }, 3000);
      }
    });

    return unsubscribe;
  }, []);

  if (!visible) return null;

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      {type === 'error' && '❌ '}
      {type === 'success' && '✅ '}
      {type === 'info' && 'ℹ️ '}
      {message}
    </div>
  );
}

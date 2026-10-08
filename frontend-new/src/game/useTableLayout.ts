import { useEffect, useState, type RefObject } from 'react';
import { computeTableLayout, type TableLayout } from './tableLayout';

/** Table geometry for React overlays, recomputed whenever the table resizes. */
export function useTableLayout(ref: RefObject<HTMLElement | null>): TableLayout | null {
  const [layout, setLayout] = useState<TableLayout | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setLayout(computeTableLayout(width, height));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return layout;
}

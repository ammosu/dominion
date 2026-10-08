import type { CSSProperties } from 'react';
import { getCardArtPath, getCardFrameStyle, getCardName, isPixelated, type ArtStyle } from '../utils/cardData';
import type { Rect } from '../game/tableLayout';
import { CARD_BACK_URL } from './art';
import styles from './MiniCard.module.css';

type Lang = 'zh' | 'en';

function artStyle(card: string, style: ArtStyle): CSSProperties {
  const path = getCardArtPath(card, style);
  return path ? { backgroundImage: `url("${path}")`, imageRendering: isPixelated(style) ? 'pixelated' : undefined } : {};
}

/** A small card face at `rect` (relative to the table). */
export function MiniCard({ card, rect, lang, style, className, ...rest }: {
  card: string;
  rect: Rect;
  lang: Lang;
  style: ArtStyle;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`${styles.mini} ${className ?? ''}`}
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, '--frame': getCardFrameStyle(card).color, '--h': `${rect.height}px` } as CSSProperties}
      {...rest}
    >
      <div className={styles.name}>{getCardName(card, lang)}</div>
      <div className={styles.art} style={artStyle(card, style)} />
    </div>
  );
}

/** The same card as a detached DOM element, for flying ghosts; `card` null is face-down. */
export function createMiniCard(card: string | null, width: number, height: number, lang: Lang, style: ArtStyle): HTMLDivElement {
  const el = document.createElement('div');
  el.className = card ? styles.mini : `${styles.mini} ${styles.back}`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.setProperty('--h', `${height}px`);
  if (card) {
    el.style.setProperty('--frame', getCardFrameStyle(card).color);
    const name = document.createElement('div');
    name.className = styles.name;
    name.textContent = getCardName(card, lang);
    const art = document.createElement('div');
    art.className = styles.art;
    Object.assign(art.style, artStyle(card, style));
    el.append(name, art);
  } else {
    el.style.backgroundImage = `url("${CARD_BACK_URL}")`;
  }
  return el;
}

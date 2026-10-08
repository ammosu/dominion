import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { wsService } from './services/websocket';
import { useGameStore } from './store/gameStore';

// Dev-only handle for browser automation (Phaser hand cards are not DOM elements).
if (import.meta.env.DEV) {
  (window as any).__dominion = { wsService, useGameStore };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

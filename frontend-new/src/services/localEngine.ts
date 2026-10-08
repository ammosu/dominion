import { ClientMessage, ServerMessage } from '../types/websocket';

type MessageHandler = (message: ServerMessage) => void;
type WasmModule = typeof import('dominion-wasm');

/**
 * Plays against the AI entirely in the browser: the Rust engine compiled to
 * WebAssembly (crates/wasm) speaks the same JSON protocol as the server, so
 * this is a drop-in replacement for the WebSocket connection (used by the
 * static GitHub Pages build).
 */
export class LocalEngineService {
  private handlers: MessageHandler[] = [];
  private game: InstanceType<WasmModule['WasmGame']> | null = null;

  /** Accepts the same `...?difficulty=&kingdom=&name=` URL as the server. */
  async connect(url?: string) {
    const params = new URL(url ?? '/ws', window.location.href).searchParams;
    const wasm = await import('dominion-wasm');
    await wasm.default();
    this.game?.free();
    this.game = new wasm.WasmGame(
      params.get('difficulty') ?? 'medium',
      params.get('kingdom') ?? 'first-game',
      params.get('name') ?? 'Alice',
    );
    this.emit(this.game.start());
  }

  send(message: ClientMessage) {
    if (!this.game) {
      console.error('Game engine is not loaded');
      return;
    }
    const reply = this.game.send(JSON.stringify(message));
    // Deliver asynchronously, like a network reply.
    setTimeout(() => this.emit(reply), 0);
  }

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  disconnect() {
    this.game?.free();
    this.game = null;
  }

  private emit(json: string) {
    const message: ServerMessage = JSON.parse(json);
    this.handlers.forEach((handler) => handler(message));
  }
}

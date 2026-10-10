// Built by `wasm-pack build crates/wasm --target web` into src/wasm/ and
// aliased in vite.config.ts; declared here so type-checking works without it.
declare module 'dominion-wasm' {
  export default function init(): Promise<unknown>;
  export class WasmGame {
    constructor(difficulty: string, kingdom: string, name: string, opponent: string);
    start(): string;
    send(message: string): string;
    free(): void;
  }
}

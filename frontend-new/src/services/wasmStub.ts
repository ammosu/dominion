// Stand-in for 'dominion-wasm' when the WebAssembly package has not been
// built (server builds never load it).
export default function init(): Promise<never> {
  return Promise.reject(new Error('Build crates/wasm with wasm-pack to use VITE_ENGINE=wasm'));
}

export class WasmGame {
  constructor() {
    throw new Error('dominion-wasm is not built');
  }
}

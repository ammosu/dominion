/// <reference types="vite/client" />
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { [key: string]: string };
  export default classes;
}

interface ImportMetaEnv {
  /** 'wasm' runs the game engine in the browser (static hosting). */
  readonly VITE_ENGINE?: string;
}

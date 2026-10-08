/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_BAIDU_TRANSLATE_APP_ID?: string;
  readonly VITE_BAIDU_TRANSLATE_SECRET_KEY?: string;
  readonly VITE_BAIDU_TRANSLATE_LARGE_MODEL_API_KEY?: string;
  readonly VITE_BAIDU_TRANSLATE_LARGE_MODEL_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  // The API's origin when it isn't served from the web app's own domain.
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

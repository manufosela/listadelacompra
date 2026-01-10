import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  location: 'readonly',
  history: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  Headers: 'readonly',
  FormData: 'readonly',
  Blob: 'readonly',
  File: 'readonly',
  FileReader: 'readonly',
  Image: 'readonly',
  CustomEvent: 'readonly',
  Event: 'readonly',
  EventTarget: 'readonly',
  HTMLElement: 'readonly',
  customElements: 'readonly',
  getComputedStyle: 'readonly',
  matchMedia: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly',
  atob: 'readonly',
  btoa: 'readonly',
  crypto: 'readonly',
  performance: 'readonly',
  IntersectionObserver: 'readonly',
  ResizeObserver: 'readonly',
  MutationObserver: 'readonly',
  DOMParser: 'readonly',
  DOMException: 'readonly',
  Node: 'readonly',
  NodeList: 'readonly',
  Element: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  caches: 'readonly',
  CSS: 'readonly',
  CSSStyleDeclaration: 'readonly',
  MediaQueryList: 'readonly',
  Notification: 'readonly',
  screen: 'readonly',
  ImageData: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly'
};

const nodeGlobals = {
  process: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  module: 'readonly',
  require: 'readonly',
  exports: 'readonly',
  global: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly'
};

const appGlobals = {
  APP_VERSION: 'readonly',
  BUILD_HASH: 'readonly',
  CACHE_BUSTER: 'readonly'
};

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/js/vendor/**',
      'public/js/firebase-config.js',
      'firebase-data/**',
      'playwright-report/**',
      'test-results/**'
    ]
  },
  ...astro.configs['flat/recommended'],
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
        ...appGlobals
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        ...appGlobals
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  prettier
];

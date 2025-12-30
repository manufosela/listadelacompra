# Fase 1: Setup Inicial

## Objetivo

Configurar el proyecto base con Astro, pnpm, conventional commits, y Firebase.

---

## Paso 1.1: Crear repositorio y proyecto base

### Comandos iniciales

```bash
# Crear proyecto Astro
pnpm create astro@latest homecart -- --template minimal --no-typescript

cd homecart

# Instalar dependencias principales
pnpm add firebase lit

# Instalar dependencias de desarrollo
pnpm add -D vitest @vitest/ui playwright @playwright/test
pnpm add -D @commitlint/cli @commitlint/config-conventional husky
pnpm add -D eslint eslint-plugin-astro
pnpm add -D prettier eslint-config-prettier

# Inicializar git
git init

# Configurar husky para conventional commits
pnpm exec husky install
pnpm exec husky add .husky/commit-msg 'pnpm exec commitlint --edit ${1}'

# Primer commit
git add .
git commit -m "chore: initial project setup with Astro and pnpm"
```

---

## Paso 1.2: Configurar Commitlint

### Crear `commitlint.config.js`

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nueva funcionalidad
        'fix',      // Corrección de bug
        'docs',     // Documentación
        'style',    // Formateo
        'refactor', // Refactorización
        'test',     // Tests
        'chore',    // Mantenimiento
        'perf',     // Performance
        'ci'        // CI/CD
      ]
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 72]
  }
};
```

### Crear `.husky/commit-msg`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm exec commitlint --edit ${1}
```

---

## Paso 1.3: Configurar ESLint y Prettier

### Crear `.eslintrc.cjs`

```javascript
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:astro/recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  },
  overrides: [
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser'
    }
  ]
};
```

### Crear `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-astro"],
  "overrides": [
    {
      "files": "*.astro",
      "options": {
        "parser": "astro"
      }
    }
  ]
}
```

### Crear `.prettierignore`

```
dist
node_modules
.astro
pnpm-lock.yaml
```

---

## Paso 1.4: Configurar Firebase

### Instalar Firebase CLI globalmente

```bash
pnpm add -g firebase-tools
```

### Inicializar Firebase

```bash
firebase login
firebase init
```

Seleccionar durante el wizard:
- ✅ Firestore
- ✅ Hosting
- ✅ Storage
- ✅ Emulators (opcional, recomendado para desarrollo)

Configuración de Hosting:
- Public directory: `dist`
- Single-page app: `No`
- Automatic builds: `No`

### Crear `firebase.json`

```json
{
  "firestore": {
    "rules": "firebase/firestore.rules",
    "indexes": "firebase/firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  },
  "storage": {
    "rules": "firebase/storage.rules"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "hosting": {
      "port": 5000
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

---

## Paso 1.5: Variables de entorno

### Crear `.env.example`

```env
# Firebase Configuration
PUBLIC_FIREBASE_API_KEY=your-api-key
PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your-project-id
PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# OpenAI (server-side only, no PUBLIC_ prefix)
OPENAI_API_KEY=sk-your-openai-key
```

### Crear `.env` (no commitear)

Copiar `.env.example` y rellenar con valores reales.

### Añadir a `.gitignore`

```gitignore
# Environment
.env
.env.local
.env.*.local

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log
ui-debug.log

# Build
dist/
.astro/

# Dependencies
node_modules/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
playwright-report/
test-results/
```

---

## Paso 1.6: Configurar Astro

### Actualizar `astro.config.mjs`

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://your-project.web.app',
  
  vite: {
    build: {
      rollupOptions: {
        output: {
          // No procesar los componentes Lit en public/
          manualChunks: undefined
        }
      }
    },
    optimizeDeps: {
      exclude: ['lit']
    }
  },

  // Configuración para API routes
  server: {
    port: 4321,
    host: true
  }
});
```

### Crear `jsconfig.json` (aliases de imports)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@layouts/*": ["src/layouts/*"],
      "@public/*": ["public/*"]
    }
  },
  "include": ["src/**/*", "public/**/*"]
}
```

---

## Paso 1.7: Scripts de package.json

### Actualizar `package.json`

```json
{
  "name": "homecart",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "generate:config": "node scripts/generate-firebase-config.js",
    "dev": "pnpm generate:config && astro dev",
    "build": "pnpm generate:config && astro build",
    "preview": "astro preview",
    "start": "pnpm dev",
    
    "lint": "eslint src public --ext .js,.astro --ignore-pattern 'public/js/firebase-config.js'",
    "lint:fix": "eslint src public --ext .js,.astro --fix --ignore-pattern 'public/js/firebase-config.js'",
    "format": "prettier --write \"src/**/*.{astro,js,css}\" \"public/**/*.{js,css}\" --ignore-path .gitignore",
    
    "test": "pnpm test:unit && pnpm test:e2e",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:unit:ui": "vitest --ui",
    "test:unit:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    
    "firebase:emulators": "firebase emulators:start",
    "firebase:deploy": "firebase deploy",
    "deploy": "pnpm build && firebase deploy --only hosting",
    
    "prepare": "husky install"
  },
  "dependencies": {
    "astro": "^4.0.0",
    "dotenv": "^16.3.0",
    "firebase": "^10.7.0",
    "lit": "^3.1.0"
  },
  "devDependencies": {
    "@commitlint/cli": "^18.4.0",
    "@commitlint/config-conventional": "^18.4.0",
    "@playwright/test": "^1.40.0",
    "@vitest/ui": "^1.0.0",
    "eslint": "^8.55.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-astro": "^0.31.0",
    "husky": "^8.0.0",
    "playwright": "^1.40.0",
    "prettier": "^3.1.0",
    "prettier-plugin-astro": "^0.12.0",
    "vitest": "^1.0.0"
  },
  "packageManager": "pnpm@8.12.0"
}
```

---

## Paso 1.8: Crear estructura de carpetas

```bash
# Crear estructura de directorios
mkdir -p public/{components,js,css,assets}
mkdir -p src/{components,layouts,pages/app}
mkdir -p src/pages/app/{lists,products,stats,purchases,settings}
mkdir -p tests/{unit/{components,services},e2e}
mkdir -p firebase
mkdir -p scripts

# Crear archivos placeholder
touch public/css/{reset.css,variables.css,global.css,components.css}
touch public/js/{auth.js,db.js,household.js,realtime-sync.js,openai-service.js,event-bus.js}
touch firebase/{firestore.rules,storage.rules,firestore.indexes.json}

# NOTA: firebase-config.js NO se crea manualmente, se genera automáticamente
```

---

## Paso 1.9: Crear Event Bus

El Event Bus permite la comunicación desacoplada entre componentes Lit.

### Crear `public/js/event-bus.js`

```javascript
/**
 * Event Bus para comunicación entre componentes Lit
 * Los componentes se registran al crearse y se desregistran al destruirse.
 * Si un evento se emite antes de que el receptor esté listo, se encola.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
    this.readyComponents = new Set();
    this.pendingRequests = [];
  }

  /**
   * Registra un componente como listo para recibir eventos
   * @param {string} componentId - ID único del componente
   */
  registerComponent(componentId) {
    this.readyComponents.add(componentId);
    this.emit('component:ready', { componentId });
    this._flushPendingFor(componentId);
  }

  /**
   * Desregistra un componente
   * @param {string} componentId - ID único del componente
   */
  unregisterComponent(componentId) {
    this.readyComponents.delete(componentId);
  }

  /**
   * Verifica si un componente está listo
   * @param {string} componentId - ID único del componente
   * @returns {boolean}
   */
  isReady(componentId) {
    return this.readyComponents.has(componentId);
  }

  /**
   * Suscribe un callback a un evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función a ejecutar
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Desuscribe un callback de un evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función a remover
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    }
  }

  /**
   * Emite un evento a todos los suscriptores
   * @param {string} event - Nombre del evento
   * @param {Object} payload - Datos del evento
   */
  emit(event, payload = {}) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(payload));
  }

  /**
   * Emite un evento, encolándolo si el receptor no está listo
   * @param {string} event - Nombre del evento
   * @param {Object} payload - Datos del evento (debe incluir senderId)
   * @param {string|null} targetComponentId - ID del componente destino (opcional)
   */
  request(event, payload, targetComponentId = null) {
    if (targetComponentId && !this.isReady(targetComponentId)) {
      this.pendingRequests.push({ event, payload, targetComponentId });
      return;
    }
    this.emit(event, payload);
  }

  /**
   * Procesa eventos encolados para un componente recién registrado
   * @param {string} componentId - ID del componente
   * @private
   */
  _flushPendingFor(componentId) {
    const pending = this.pendingRequests.filter(r => r.targetComponentId === componentId);
    this.pendingRequests = this.pendingRequests.filter(r => r.targetComponentId !== componentId);
    pending.forEach(r => this.emit(r.event, r.payload));
  }

  /**
   * Limpia todos los listeners y componentes (para tests)
   */
  reset() {
    this.listeners.clear();
    this.readyComponents.clear();
    this.pendingRequests = [];
  }
}

// Singleton exportado
export const eventBus = new EventBus();
```

---

## Paso 1.10: Generador de Firebase Config

El fichero `firebase-config.js` se genera automáticamente desde `.env`. NUNCA se edita manualmente.

### Crear `scripts/generate-firebase-config.js`

```javascript
/**
 * Genera public/js/firebase-config.js desde variables de entorno
 * Ejecutar: node scripts/generate-firebase-config.js
 */
import { writeFileSync, existsSync } from 'fs';
import { config } from 'dotenv';

// Cargar .env
config();

// Validar que existen las variables necesarias
const requiredVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

// Variables opcionales
const optionalVars = [
  'FIREBASE_DATABASE_URL',
  'FIREBASE_MEASUREMENT_ID',
  'FIREBASE_DATABASE_ID'  // Para usar DB Firestore alternativa (ej: 'test')
];

const missing = requiredVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('❌ Faltan variables de entorno:', missing.join(', '));
  console.error('   Copia .env.example a .env y configura los valores');
  process.exit(1);
}

// Detectar si estamos en desarrollo
const isDev = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';
const databaseId = process.env.FIREBASE_DATABASE_ID || '(default)';

// Construir config con campos opcionales
const configLines = [
  `  apiKey: "${process.env.FIREBASE_API_KEY}",`,
  `  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",`,
  process.env.FIREBASE_DATABASE_URL ? `  databaseURL: "${process.env.FIREBASE_DATABASE_URL}",` : null,
  `  projectId: "${process.env.FIREBASE_PROJECT_ID}",`,
  `  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",`,
  `  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",`,
  `  appId: "${process.env.FIREBASE_APP_ID}"`,
  process.env.FIREBASE_MEASUREMENT_ID ? `  measurementId: "${process.env.FIREBASE_MEASUREMENT_ID}"` : null
].filter(Boolean).join('\n');

// Generar contenido del fichero
const fileContent = `// =====================================================
// AUTO-GENERATED - NO EDITAR MANUALMENTE
// Generado por: pnpm run generate:config
// Fecha: ${new Date().toISOString()}
// Entorno: ${process.env.NODE_ENV || 'development'}
// Database: ${databaseId}
// =====================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator, initializeFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getStorage, connectStorageEmulator } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import { getFunctions, connectFunctionsEmulator } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';

const firebaseConfig = {
${configLines}
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Usar base de datos específica si se indica (para tests)
const DATABASE_ID = '${databaseId}';
export const db = DATABASE_ID === '(default)' 
  ? getFirestore(app) 
  : initializeFirestore(app, {}, DATABASE_ID);

export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west1');

// Info de entorno
export const ENV = {
  isTest: ${isTest},
  isDev: ${isDev},
  databaseId: '${databaseId}'
};

// Conectar a emuladores en desarrollo (no en test con DB real)
if (location.hostname === 'localhost' && !${isTest}) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('🔧 Firebase conectado a emuladores locales');
}

${isTest ? "console.log('🧪 Modo TEST - usando DB:', DATABASE_ID);" : ''}
`;

// Escribir fichero
writeFileSync('public/js/firebase-config.js', fileContent);
console.log('✅ public/js/firebase-config.js generado correctamente');
```

### Crear `.env.example`

```bash
# Firebase Configuration
# Obtener de Firebase Console > Project Settings > General
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project.firebasedatabase.app
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123
FIREBASE_MEASUREMENT_ID=G-XXXXXXX

# Environment
NODE_ENV=development

# Test User (para E2E tests)
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=testpassword
```

### Crear `.env` (NO commitear)

```bash
# Firebase Configuration - PRODUCCIÓN
FIREBASE_API_KEY=AIzaSyApNSGSj0VLx8B6PRnXz-Pidc3UJp-A4to
FIREBASE_AUTH_DOMAIN=lista-de-mi-compra.firebaseapp.com
FIREBASE_DATABASE_URL=https://lista-de-mi-compra-default-rtdb.europe-west1.firebasedatabase.app
FIREBASE_PROJECT_ID=lista-de-mi-compra
FIREBASE_STORAGE_BUCKET=lista-de-mi-compra.appspot.com
FIREBASE_MESSAGING_SENDER_ID=71548511732
FIREBASE_APP_ID=1:71548511732:web:997c7ab6350c8004ec05a1
FIREBASE_MEASUREMENT_ID=G-EHZG1WVF7Z

# Environment
NODE_ENV=development

# Test User (para E2E tests)
TEST_USER_EMAIL=testuser@fosela.com
TEST_USER_PASSWORD=testuser
```

### Crear `.env.test` (para tests E2E)

```bash
# Firebase Configuration - Mismo proyecto, DB separada
FIREBASE_API_KEY=AIzaSyApNSGSj0VLx8B6PRnXz-Pidc3UJp-A4to
FIREBASE_AUTH_DOMAIN=lista-de-mi-compra.firebaseapp.com
FIREBASE_DATABASE_URL=https://lista-de-mi-compra-default-rtdb.europe-west1.firebasedatabase.app
FIREBASE_PROJECT_ID=lista-de-mi-compra
FIREBASE_STORAGE_BUCKET=lista-de-mi-compra.appspot.com
FIREBASE_MESSAGING_SENDER_ID=71548511732
FIREBASE_APP_ID=1:71548511732:web:997c7ab6350c8004ec05a1
FIREBASE_MEASUREMENT_ID=G-EHZG1WVF7Z

# Base de datos Firestore para tests (no la default)
FIREBASE_DATABASE_ID=test

NODE_ENV=test

# Test User
TEST_USER_EMAIL=testuser@fosela.com
TEST_USER_PASSWORD=testuser
```

### Crear base de datos de test en Firebase Console

1. Ve a Firebase Console > Firestore Database
2. Click en "..." (menú) junto al nombre de la DB
3. "Create database" → Nombre: `test`
4. Seleccionar región: `europe-west1`
5. Empezar en modo test (reglas abiertas para desarrollo)

Esto crea una DB Firestore separada en el mismo proyecto.

### Actualizar `.gitignore`

```bash
# Dependencias
node_modules/

# Build
dist/

# Entorno
.env
.env.local
.env.*.local

# Firebase config generado (NUNCA commitear)
public/js/firebase-config.js

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Tests
coverage/
playwright-report/
test-results/

# Logs
*.log
npm-debug.log*
```

---

## Paso 1.11: Crear layouts base

### Crear `src/layouts/BaseLayout.astro`

```astro
---
interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Gestiona tus listas de la compra en familia' } = Astro.props;
---

<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title} | HomeCart</title>
    
    <!-- CSS -->
    <link rel="stylesheet" href="/css/reset.css" />
    <link rel="stylesheet" href="/css/variables.css" />
    <link rel="stylesheet" href="/css/global.css" />
    <link rel="stylesheet" href="/css/components.css" />
    
    <!-- Firebase -->
    <script type="module" src="/js/firebase-config.js"></script>
  </head>
  <body>
    <slot />
  </body>
</html>
```

### Crear `src/pages/index.astro`

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Inicio">
  <main class="landing">
    <h1>HomeCart</h1>
    <p>Tu lista de la compra familiar, sincronizada en tiempo real.</p>
    <a href="/login" class="btn btn-primary">Comenzar</a>
  </main>
</BaseLayout>

<style>
  .landing {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-xl);
  }
  
  h1 {
    font-size: 3rem;
    margin-bottom: var(--space-md);
  }
  
  p {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-xl);
  }
</style>
```

---

## Paso 1.10: Commit inicial completo

```bash
git add .
git commit -m "chore: complete project setup with Astro, pnpm, Firebase config"
```

---

## ✅ Checklist de la Fase 1

- [ ] Proyecto Astro creado con pnpm
- [ ] Dependencias instaladas (firebase, lit, vitest, playwright)
- [ ] Husky + Commitlint configurados
- [ ] ESLint + Prettier configurados
- [ ] Firebase inicializado
- [ ] Variables de entorno configuradas
- [ ] Estructura de carpetas creada
- [ ] Layout base funcionando
- [ ] Scripts de package.json listos
- [ ] Primer commit realizado

---

## 🔗 Siguiente Fase

→ [02-autenticacion.md](./02-autenticacion.md)

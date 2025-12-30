# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Normas del Proyecto

### Principios de Desarrollo
- Seguir **SOLID**, **YAGNI**, **DRY** y **KISS**
- Código limpio, cero acoplamiento
- **Sin fallbacks**: las cosas funcionan o no funcionan y se gestiona el error
- **Sin TypeScript bajo ninguna circunstancia** - Solo Vanilla ES Modules

### Idioma
- **Comentarios y documentación**: en español
- **Variables, funciones y archivos**: en inglés

### Accesibilidad
La accesibilidad es un requisito primordial: alts, roles, ARIA, navegación con teclado.

### Commits
Conventional commits obligatorio (commitlint configurado):
```
<type>(<scope>): <description>
```
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`

## Descripción del Proyecto

HomeCart (lista-de-mi-compra) es una aplicación colaborativa de listas de la compra construida con Astro (output estático) y Firebase. Usa componentes web Lit para interactividad client-side.

## Comandos

```bash
# Desarrollo
pnpm dev                  # Inicia servidor dev (auto-genera firebase config)
pnpm build                # Build producción (genera config + bundle Lit + Astro build)

# Testing
pnpm test                 # Ejecuta todos los tests (unit + e2e)
pnpm test:unit            # Solo tests unitarios (Vitest)
pnpm test:unit:watch      # Tests unitarios en modo watch
pnpm test:e2e             # Tests E2E (Playwright)
pnpm test:e2e:ui          # Tests E2E con UI

# Calidad de código
pnpm lint                 # Ejecuta ESLint
pnpm lint:fix             # Corrige errores de ESLint
pnpm format               # Formatea con Prettier

# Firebase
pnpm firebase:emulators   # Inicia emuladores Firebase
pnpm deploy               # Build y deploy a Firebase Hosting
```

## Arquitectura

### Frontend
- **Páginas Astro** (`src/pages/`): HTML estático con file-based routing
  - `src/pages/app/` - Páginas autenticadas usando `AppLayout.astro`
  - `src/pages/login.astro`, `src/pages/index.astro` - Páginas públicas
- **Componentes Lit** (`public/components/hc-*.js`): Componentes interactivos client-side con prefijo `hc-`
  - Importar Lit desde bundle: `import { LitElement, html, css } from '/js/vendor/lit.bundle.js'`
- **Layouts**: `BaseLayout.astro` (base) → `AppLayout.astro` (con AuthGuard, Header, Navigation)

### Servicios Client-Side (`public/js/`)
- `firebase-config.js` - **AUTO-GENERADO, NUNCA EDITAR MANUALMENTE**
- `auth.js` - Helpers de autenticación
- `db.js` - Operaciones CRUD Firestore (contiene `PRODUCT_CATEGORIES` y `UNITS`)
- `group.js` - Gestión de grupos
- `event-bus.js` - Comunicación entre componentes
- `realtime-sync.js` - Suscripciones real-time Firestore

### Event Bus
Los componentes Lit se comunican mediante Event Bus:
- Al crearse, cada componente se registra con `eventBus.registerComponent(this._componentId)`
- En `disconnectedCallback`, desregistrar con `eventBus.unregisterComponent()`
- Payload siempre incluye `senderId` del emisor
- Si el receptor no está listo, el evento se encola automáticamente

### Firebase Backend
- **Firestore**: Datos en `users/{uid}/lists/{listId}/items` y `groups/{groupId}/products|purchases|priceHistory`
- **Cloud Functions** (`functions/index.js`): `processTicket` (OpenAI Vision), `savePurchase`
- **Security Rules** (`firebase/firestore.rules`): Control de acceso basado en grupos con roles member/admin

### CSS
- CSS vanilla con custom properties (sin frameworks)
- Variables definidas en `public/css/variables.css`
- Soporte dark mode via `prefers-color-scheme`

## Configuración de Entorno

Copiar `.env.example` a `.env` con los valores de Firebase. Variables requeridas:
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`

Para tests E2E, configurar `TEST_USER_EMAIL` y `TEST_USER_PASSWORD` en `.env.test`.

**IMPORTANTE**: `public/js/firebase-config.js` se genera automáticamente desde `.env`. Los scripts `dev` y `build` regeneran la config.

## Testing

- **Tests unitarios** (`tests/unit/`): Vitest con jsdom
- **Tests E2E** (`tests/e2e/`): Playwright (Chromium y Mobile Chrome)
- Setup en `tests/setup.js`

## Patrones Clave

- Imports de Firestore usan CDN: `https://www.gstatic.com/firebasejs/10.7.0/firebase-*.js`
- Solo Lit para componentes interactivos, sin frameworks adicionales
- Los componentes son autosuficientes y desacoplados

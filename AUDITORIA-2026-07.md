# Auditoría general — MyHomeCart (HCT-TSK-0009)

**Fecha:** 2026-07-11 · **Versión auditada:** 1.7.1 (`build 7a951d30`) · **Alcance:** arquitectura y calidad de código, seguridad (Firebase rules + Cloud Functions), dependencias y usabilidad móvil. Revisión estática del repo + inspección de la app en producción emulando móvil (390×844).

> Nota: la queja de usabilidad («engorroso y confuso en móvil») se refiere a **esta** app, no al prototipo `lista-de-mi-compra` de 2021 (que era un experimento muerto). MyHomeCart es la app real desplegada en `lista-de-mi-compra.web.app`.

---

## Resumen ejecutivo

MyHomeCart es una app **funcional y razonablemente completa** (listas colaborativas, grupos con roles, gastos compartidos, escaneo de tickets con IA, historial de precios), con buenas prácticas en varios frentes: gestión correcta de secretos (la API key de OpenAI va por `secrets`, nunca hardcodeada; `.env` jamás se commiteó), limpieza de ciclo de vida en los componentes Lit con suscripciones, y validación de auth+pertenencia en las Cloud Functions.

Pero arrastra tres problemas de fondo que conviene atajar antes de seguir añadiendo features:

1. **Seguridad**: al ser SSG puro, *toda* la seguridad recae en las reglas de Firestore/Storage y en las Functions — y ahí hay agujeros reales de control de acceso entre grupos (IDOR en tickets de Storage), riesgo de abuso de coste de OpenAI, y XSS almacenado explotable contra otros usuarios. No hay App Check.
2. **Arquitectura**: deuda estructural severa — un God component de 4.229 líneas, ~75% de duplicación entre las páginas de crear/editar lista, lógica de negocio en `<script>` inline gigantes, y **tests unitarios que no prueban el código real** (reimplementan los helpers dentro del propio test → cobertura falsa, 0% real en los servicios core).
3. **UX móvil (la queja del propietario)**: la causa concreta es identificable — bottom-nav de 8 secciones con texto de 10px duplicada en la home, la lista de la compra se abre **como tabla horizontal** que se recorta en móvil, checkboxes de 20px por debajo del mínimo táctil, doble modo «Comprar/Editar» para una sola tarea, y **cero capacidad offline** pese a ser PWA (inservible con mala cobertura en el súper, que es el caso de uso declarado).

Recomendación de prioridad: **(A)** parchear ya los 4 hallazgos de seguridad de acción inmediata; **(B)** una tanda de quick-wins de UX móvil de bajo riesgo; luego **(C)** planificar el rediseño del flujo de compra y la refactorización del God component como epics propias.

---

## 1. Seguridad

Verificados contra el código los tres primeros a mano. La superficie real es 100% reglas + Functions (SSG = sin protección de servidor).

### 🔴 Acción inmediata

| # | Severidad | Hallazgo | Ubicación |
|---|-----------|----------|-----------|
| S1 | Alto | **IDOR en tickets de Storage**: `read` y `delete` solo exigen `isAuthenticated()`, no pertenencia al grupo. Cualquier usuario con cuenta Google puede leer/borrar imágenes de recibos (datos financieros) de *cualquier* grupo enumerando el path. | `firebase/storage.rules:66-78` |
| S2 | Alto | **Abuso de coste de OpenAI**: `processTicket` es `invoker:'public'`, `cors:true`, sin App Check, sin rate-limit y sin límite de tamaño de imagen. Un miembro (cualquiera puede crear grupo) puede invocarla en bucle → gasto ilimitado de gpt-4o (denegación de cartera). | `functions/index.js:107-127` |
| S3 | Alto | **XSS almacenado cross-account** en el banner de invitaciones: `groupName`/`invitedByName` se inyectan por `innerHTML` sin escapar. Un atacante invita a la víctima con `groupName = <img src=x onerror=...>` y ejecuta código en su sesión al abrir la home. Existe `escapeHtml` en `modal.js:245` pero no se usa aquí. | `src/pages/app/index.astro:67-78` |
| S4 | Alto | **Upload arbitrario** en `group-icons`: `write` solo exige `isAuthenticated()`, sin `isValidImage()` ni pertenencia. Cualquiera sube ficheros de cualquier tipo/tamaño a nombres arbitrarios (abuso de almacenamiento, contenido malicioso servido desde el dominio). | `firebase/storage.rules:46-52` |

### 🟠 Corto plazo

| # | Severidad | Hallazgo | Ubicación |
|---|-----------|----------|-----------|
| S5 | Medio | **Sin App Check en ninguna capa** — con la config pública (embebida en el bundle) + un token de auth, se puede pegar directo contra Firestore/Storage/Functions saltándose la app. Amplifica S1/S2/S8. | (todo el proyecto) |
| S6 | Medio | **XSS intra-grupo sistémico**: patrón `innerHTML` sin escapar con nombres de lista/producto/categoría/tienda en múltiples páginas. Un miembro malicioso ejecuta código en los demás. | `tickets/index.astro:236-256`, `products/index.astro:156`, `lists/index.astro:678`, `lists/edit.astro:410-563`, `groups/manage.astro:56-76` |
| S7 | Medio | `list-icons` y `product-images` escribibles por cualquier autenticado sin comprobar ownership → defacement/suplantación. Lectura pública (`if true`). | `firebase/storage.rules:36-42, 56-62` |
| S8 | Medio | Docs `users/{uid}` legibles por cualquier autenticado → enumeración de emails y pertenencias a grupos (PII). | `firebase/firestore.rules:76-78` |
| S9 | Medio | **Sin cabeceras de seguridad** en Hosting (falta CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`). Sin CSP, los XSS S3/S6 no tienen mitigación; sin frame-ancestors, hay clickjacking. | `firebase.json` (headers) |
| S10 | Medio | CORS de Storage con `origin:["*"]` y `responseHeader:["*"]` → hotlinking/exfiltración desde cualquier origen. | `firebase/cors.json` |
| S11 | Medio | Escrituras en Firestore dentro del grupo sin validar forma/tipos/tamaño de `request.resource.data` (sin `hasOnly()`). Alimenta S6. | `firebase/firestore.rules:168-234` |

### 🔵 Fondo / notas

| # | Severidad | Hallazgo |
|---|-----------|----------|
| S12 | Bajo | `get()` costosos en reglas (helpers de pertenencia y checks por item) → coste facturado por operación; evaluar denormalizar o custom claims. |
| S13 | Bajo | `AuthGuard` es solo client-side (SSG) → el HTML de `/app/*` es público. No es fuga (los datos vienen de Firestore con reglas), pero no incrustar nada sensible en el HTML. |
| S14 | Bajo | Login Google sin restricción de dominio/allowlist → auto-registro mundial habilita S2/S3. Si el uso es familiar, restringir. |
| S15 | Bajo | `invitedBy` no se valida contra `auth.uid` en `create` → suplantación del invitador (alimenta S3). `firestore.rules:52-55` |
| S16 | Bajo | Email del propietario en `CLAUDE.md:57-62` y credenciales de test en `.env.test` (trackeado, pero solo valores de emulador). Sacar el email de la doc. |
| — | Info | La `FIREBASE_API_KEY` del `.env` **no** es un secreto (identificador público por diseño). No es vulnerabilidad. Conviene restringir la key por HTTP referrer en Google Cloud Console. |

---

## 2. Arquitectura y calidad de código

### 🔴 Crítico

| # | Hallazgo | Ubicación |
|---|----------|-----------|
| A1 | **Bug productivo con coste**: `const assignedTo = data.assignedTo` referencia `data`, que no existe en ese scope (es `request.data`) → `ReferenceError` en cada `processTicket`, *después* de haber llamado y pagado a OpenAI. **Verificado en el código.** | `functions/index.js:162` |
| A2 | **Tests que no prueban nada real**: los 57 casos unitarios reimplementan los helpers dentro del propio test y no importan un solo módulo de `public/js/`. Cobertura real de `auth/db/group/event-bus/realtime-sync` = **0%**. | `tests/unit/*.test.js` |
| A3 | **God component**: `hc-shopping-list.js` = 4.229 LOC, >120 métodos, mezcla categorías + checklists + drag&drop + suscripciones + catálogo + tickets. Viola SRP severamente. | `public/components/hc-shopping-list.js` |

### 🟠 Alto

| # | Hallazgo | Ubicación |
|---|----------|-----------|
| A4 | **Doble modelo de datos incoherente**: el matching de tickets lee de `users/{uid}/lists/.../items` (campo `name`), pero el resto de la app usa `groups/{gid}/shoppingLists/.../items` (campo `productName`) → los tickets nunca casan items. | `functions/index.js:165-171`, `db.js:394-408` vs `realtime-sync.js:115-121` |
| A5 | **Versión de Firebase incoherente y repetida 33 veces**: `package.json` declara `firebase ^12.7.0` pero el runtime importa `firebasejs/10.7.0` por CDN en 33 sitios. La dependencia npm no se usa en runtime; la versión está hardcodeada por todas partes (DRY). | `db.js:21`, `auth.js:23`, `firebase-config.js:9-13`, … |
| A6 | **~75% de duplicación** entre `lists/new.astro` (1577 LOC) y `lists/edit.astro` (1622 LOC): ~1029 líneas comunes copypasteadas. | `src/pages/app/lists/{new,edit}.astro` |
| A7 | **Lógica de negocio en `<script>` inline gigantes** dentro de páginas Astro (edit ~711, lists/index ~673, new ~604, products ~541, groups/manage ~433 líneas de script), contra la norma «módulos ES». | varias `src/pages/app/**` |
| A8 | Segundo componente desmesurado: `hc-list-item.js` = 1.441 LOC (render + edición + checklist + asignación). | `public/components/hc-list-item.js` |

### 🟡 Medio / 🔵 Bajo (selección)

| # | Hallazgo |
|---|----------|
| A9 | `eventBus.emit` itera callbacks sin try/catch: un listener que lance rompe la notificación al resto. `event-bus.js:69-72` |
| A10 | Doble implementación divergente de normalización/fuzzy matching cliente vs servidor (umbrales distintos). `db.js:122` vs `functions/index.js:238` |
| A11 | N+1 de lecturas en `savePurchase` (un `where().get()` por item en bucle). `functions/index.js:347` |
| A12 | 84 fallbacks silenciosos `|| default`; varios enmascaran datos obligatorios ausentes (contra la norma «sin fallbacks silenciosos»). |
| A13 | Callbacks de error de suscripción con doble semántica: `console.error` + `callback([], error)` → lista vacía indistinguible de «sin datos». `realtime-sync.js:68-71` |
| A14 | `processTicket` con `savePurchase` sin escritura atómica: si el batch falla queda la compra sin items. `functions/index.js:319/393` |
| A15 | 9 usos de `alert()`/`confirm()` nativos, incoherente con el `modal.js`/`toast.js` propios (y con el estándar de UI del entorno). |
| A16 | Código muerto probable: migraciones sobre el modelo legacy `users/{uid}/lists` (`db.js:379`); `UNITS` con entrada duplicada (`db.js:89/93`); import muerto `setLogLevel` (`firebase-config.js:11`); `firestore-debug.log` huérfano en el working tree. |

**Métricas:** 11 componentes `hc-*` (9.693 LOC) · 17 servicios `public/js` (~4.654 LOC) · 21 ficheros `src/` (~11.559 LOC) · `functions/index.js` 582 LOC · 57 tests unit (cobertura real 0% en core) + 7 e2e.

---

## 3. Dependencias

| Paquete | Actual | Última | Nota |
|---------|--------|--------|------|
| astro | 5.16.6 | 7.0.7 | **2 majors por detrás** |
| eslint | 9.39.2 | 10.7.0 | 1 major |
| firebase (npm) | 12.7.0 | 12.16.0 | menor — pero el runtime usa CDN 10.7.0 (ver A5) |
| lit | 3.3.2 | 3.3.3 | patch |
| @commitlint/* | 20.x | 21.x | 1 major |
| playwright, vitest, prettier, dotenv | varias menores | | |

No hay dependencias abandonadas ni vulnerabilidades de supply-chain evidentes; el desfase mayor es Astro 5→7.

---

## 4. UX móvil (la queja principal)

Mapa: `BaseLayout → AppLayout (AuthGuard + Header + Navigation + main + footer)`. 13 rutas. **8 destinos de primer nivel** en la nav.

### Los 5 problemas más graves

1. **Bottom-nav de 8 secciones con texto de 10px, duplicada en la home.** `Navigation.astro:7-16` mete 8 destinos en `space-around` con labels `0.625rem`; la home los repite en 8 tiles con labels `~9px` (`app/index.astro:283`). Ocho blancos de ~45px en ~360px de ancho, ilegibles de un vistazo, y la tarea real (una lista) pesa lo mismo que Balances/Categorías/Ajustes. **Causa directa del «engorroso y confuso».**
2. **La lista se muestra como TABLA por defecto en móvil.** `hc-shopping-list.js:1719` fija `viewMode='table'`; las columnas que no caben (p. ej. el `select` de asignación de 100px) se **recortan** porque el contenedor tiene `overflow-x:hidden` (`AppLayout.astro:38`). Una tabla horizontal es lo contrario de «una mano en el súper».
3. **Touch target del checkbox < 44px** — la acción central. Checkbox de tabla 20×20px (`hc-shopping-list.js:792`), de tarjeta 22px, sub-checks 16-18px. Incumple WCAG 2.5.5 / ergonomía móvil.
4. **Doble modelo mental «Comprar» vs «Editar» para añadir un ítem.** En modo compra el quick-add fuerza `quantity:1, category:null`; para cantidad/unidad/categoría hay que cambiar a «Editar» (formulario de ≥5 controles). Se añade y luego hay que reeditar.
5. **Cero offline pese a ser PWA.** `firebase-config.js:33` usa `initializeFirestore` **sin** `persistentLocalCache`; **no hay service worker** (las dos referencias a `serviceWorker` en el código lo *desregistran*). Hay `manifest.json` (instalable) pero sin fallback offline. Rompe el caso de uso declarado (súper con mala cobertura).

### Adicionales

- **[Alto] Dark mode roto para la lista**: el toggle manual pone `.dark` en `<html>` con paleta cálida, pero los componentes Lit reaccionan a `prefers-color-scheme` con colores slate/azules hardcodeados → el toggle no tematiza la lista, y cuando aplica, los tonos fríos contradicen la marca cálida. `hc-shopping-list.js:282-321`
- **[Media-Alta] Gastos compartidos mezclados en el flujo core**: 6 de 8 entradas de nav son administrativas; crear cada lista obliga a elegir `expenseType` (común/dividir), metiendo fricción contable en la tarea básica. `lists/new.astro:70-94`
- **[Media]** Marcar comprado sin feedback ni undo (solo `line-through`); barra de 6 controles icon-only sin label; contraste pastel insuficiente (`--color-text-tertiary` ≈ 2.3:1, falla AA); recarga agresiva por `visibilitychange` puede recargar en mitad de la compra; checkboxes de tabla sin rol/tabindex/teclado; loading = texto plano con layout shift.
- **[Baja]** Emojis planos como iconografía (el design context pide iconos ilustrados); drag&drop de categorías con HTML5 DnD (no fiable en touch).

### Quick wins vs estructural

**Quick wins (bajo riesgo):** forzar `viewMode='list'` en móvil; subir touch targets a ≥44px; toast con «Deshacer» al marcar; corregir contraste de `--color-text-tertiary` y subir labels de nav a ≥12px; dar rol/teclado a los checkbox de tabla; unificar dark mode (que Lit lea `.dark`/variables en vez de `prefers-color-scheme`); ocultar drag&drop en móvil; suavizar la recarga por `visibilitychange`.

**Estructural:** reducir la bottom-nav a 4-5 destinos (mover Productos/Categorías/Grupos a «Más»/Ajustes) y quitar la duplicación de la home; **modo compra a pantalla completa** (lista grande agrupada por pasillo, checkbox generoso, sin tabla); fusionar «Comprar/Editar» con cantidad inline; **offline real** (`persistentLocalCache` + service worker que cachee el shell); sacar `expenseType` del alta básica de lista.

---

## 5. Plan de acción recomendado

1. **Sprint de seguridad (urgente)** — S1, S2, S3, S4 primero; luego S5-S11. Varios son cambios de reglas desplegables sin tocar la app. Crear bugs individuales en Planning Game.
2. **Fix rápido A1** (una línea, `request.data.assignedTo`) — el escaneo de tickets está roto en producción ahora mismo.
3. **Tanda de quick-wins de UX móvil** — la lista de arriba; alto impacto percibido, bajo riesgo.
4. **Epic de rediseño del flujo de compra** — ya existe `HCT-PCS-0002 [REDISEÑO UI]`; encajar aquí el modo compra a pantalla completa, la reducción de nav y el offline.
5. **Epic de refactor** — arreglar los tests para que prueben código real (A2), trocear el God component (A3), unificar el modelo de datos de tickets (A4) y deduplicar new/edit (A6). Bloquea la salud a largo plazo.

# TODO - MyHomeCart

Tareas pendientes y features planificadas para desarrollo futuro.

---

## Sesión actual (04/01/2026) - Mejoras UX y Tickets

### Implementado hoy ✅

1. **Persistencia de preferencias por lista** ✅
   - Guardado en localStorage: `showCompleted`, `groupByCategory`, `viewMode`, `filterByAssignee`
   - Clave: `prefs:${listId}`
   - Archivo modificado: `public/components/hc-shopping-list.js`

2. **Editar ticket (fecha, tienda, total)** ✅
   - Modal de edición con formulario
   - Función `updateTicket` añadida en `public/js/tickets.js`
   - Archivo modificado: `src/pages/app/tickets/index.astro`

3. **Guardar imagen del ticket en Storage** ✅
   - Subir a `groups/{groupId}/tickets/{ticketId}.jpg`
   - Modificado: `public/components/hc-ticket-scanner.js`
   - La `imageUrl` se pasa a `saveTicketToHistory` y se guarda
   - Añadido botón "Ver imagen" y badge de imagen en página tickets

4. **Campos metadatos de listas** ✅
   - `createdBy` ya existía en `createList`
   - `updatedBy` añadido en `updateList` y en `hc-shopping-list.js`
   - Creadas funciones `archiveList` y `restoreList` en `public/js/lists.js`

5. **Categorías colapsables** ✅
   - Implementado en rama `feature/categories-collapsible` (mergeada)
   - `<details><summary>` para categorías agrupadas
   - Botones 'Colapsar todas' / 'Expandir todas'
   - Estado persistido en localStorage por lista
   - Al borrar categoría: limpia `categoryId` de items afectados

6. **Drag & Drop para ordenar categorías** ✅
   - HTML5 Drag API nativo (sin bibliotecas)
   - Handle de arrastre (⋮⋮) visible en hover
   - Indicadores visuales de zona de drop
   - Orden persistido en localStorage por lista
   - Vista tabla también respeta el orden

### Pendiente (próxima sesión)

7. **SEO - Assets gráficos** (MANUAL - herramientas online)
   - Convertir `og-image.svg` → `og-image.png` (1200x630)
   - Crear iconos: 192x192, 512x512, 180x180 (apple), 32x32, 16x16

---

## Mejoras Sistema de Tickets (PENDIENTE)

### Problema actual

El sistema de tickets tiene varios problemas de usabilidad y precisión:

1. **Matching de productos deficiente**
   - Lista: "Puerros, 2 manojos" → Ticket: "PUERRO CRF BIO 750GR"
   - No reconoce que son el mismo producto, lo añade como nuevo
   - Necesita fuzzy matching inteligente (normalización, sinónimos, variantes)

2. **Añade items no deseados**
   - Detecta líneas como "Promoción 3x2", "Dto. socio", etc. como productos
   - Necesita filtrar líneas que no son productos reales

3. **No detecta el total correctamente**
   - El OCR falla en detectar el importe total del ticket
   - Hay que mejorar el prompt o la lógica de extracción

4. **Flujo de confirmación inexistente**
   - Actualmente añade todo directamente sin confirmar
   - El usuario no puede revisar ni corregir antes de guardar

### Solución propuesta

#### Modal de revisión pre-guardado
Antes de añadir items a la lista, mostrar un modal con:
- Lista de productos detectados en el ticket
- Para cada producto detectado:
  - Selector para asociar con item existente de la lista
  - Opción "Añadir como nuevo"
  - Opción "Ignorar" (para promociones, descuentos, etc.)
- Campo para el total (editable si no se detectó bien)
- Campo para la fecha (editable)
- Campo para la tienda (editable)

#### Mejoras en el matching
- Normalizar nombres (quitar acentos, mayúsculas, espacios extra)
- Ignorar cantidades/pesos del ticket al comparar ("750GR", "1L", etc.)
- Usar raíz de palabras ("PUERRO" ≈ "Puerros")
- Mostrar score de coincidencia al usuario

#### Filtrado de líneas no-producto
Filtrar automáticamente líneas que contengan:
- "PROMOCION", "DTO", "DESCUENTO", "OFERTA"
- "SUBTOTAL", "IVA", "TOTAL"
- "TARJETA", "EFECTIVO", "CAMBIO"
- Líneas muy cortas o solo números

### Archivos a modificar

- `functions/index.js` - Mejorar prompt OCR, añadir filtrado
- `public/components/hc-ticket-scanner.js` - Añadir modal de revisión
- `public/components/hc-shopping-list.js` - Recibir items revisados del modal
- Posible nuevo archivo: `public/js/ticket-matcher.js` - Lógica de matching

### Modelo de datos del modal

```javascript
// Resultado del OCR
{
  detectedItems: [
    {
      name: "PUERRO CRF BIO 750GR",
      price: 2.49,
      suggestedMatch: "itemId123",  // ID del item de la lista que más se parece
      matchScore: 0.75,  // Puntuación de coincidencia (0-1)
      userAction: "match" | "new" | "ignore"  // Decisión del usuario
    }
  ],
  total: 45.60,
  date: "2026-01-04",
  store: "CARREFOUR"
}
```

### Contexto técnico verificado

**Storage Rules** (`firebase/storage.rules`):
- Ya existe ruta `groups/{groupId}/tickets/{ticketId}` con permisos

**Modelo de categorías** (`public/js/categories.js`):
- Items usan campo `category` (ID de categoría)
- NO hay migración pendiente - modelo ya correcto

**Enlace a Categorías en navegación**:
- YA EXISTE en `src/components/Navigation.astro` (línea 13)

---

## Sesión anterior (02/01/2026) - Sistema de Tickets

### Implementado hoy ✅

- [x] Cloud Function `processTicket` con OpenAI Vision (gpt-4o)
- [x] Soporte para PDF (conversión a imagen con pdf.js)
- [x] Prompt optimizado para tickets españoles (fecha DD/MM/YYYY, palabras clave TOTAL/IMPORTE)
- [x] Guardar tickets en historial: `users/{uid}/lists/{listId}/tickets/{ticketId}`
- [x] Página `/app/tickets` - listado de tickets con eliminación
- [x] Modal personalizado para confirmar eliminación (no alert/confirm nativos)
- [x] Cálculo automático de total sumando items si OCR no lo detecta
- [x] Reglas Firestore para subcolección tickets
- [x] Fix: navegación View Transitions (list.astro redirigía a /app desde otras páginas)

### Pendiente próxima sesión

#### 1. Editar fecha del ticket
La IA no siempre detecta la fecha correctamente. Necesito poder editarla manualmente.

**Implementación:**
- Añadir botón editar en ticket card
- Modal para editar fecha, tienda, total
- Función updateTicket en Firestore

**Archivos:**
- `src/pages/app/tickets/index.astro`
- `public/js/tickets.js` (añadir updateTicket)

#### 2. Guardar imagen del ticket en Storage
Actualmente la imagen NO se guarda. Solo se procesa y se descarta.

**Estado actual:**
- `imageUrl` siempre es `null` en el documento
- La imagen se envía como base64 a la Cloud Function y se pierde

**Implementación:**
- Subir imagen a Storage: `users/{uid}/tickets/{ticketId}.jpg`
- Guardar URL en documento del ticket
- Añadir botón "Ver ticket" en la página de tickets

**Archivos:**
- `public/components/hc-ticket-scanner.js` - subir a Storage
- `public/js/tickets.js` - pasar imageUrl a saveTicketToHistory
- `src/pages/app/tickets/index.astro` - mostrar imagen

#### 3. Mejorar detección de fecha OCR
El prompt ya está optimizado pero sigue fallando en algunos tickets.

**Archivo:** `functions/index.js` (líneas 28-61)

**Posibles mejoras:**
- Añadir más formatos: "02 ENE 2026", "2-1-26"
- Buscar cerca de palabras: FECHA, DIA, F.VENTA

### Contexto técnico

**Estructura Firestore:**
```
users/{uid}/lists/{listId}/tickets/{ticketId}
  - store: string
  - date: string (YYYY-MM-DD)
  - total: number
  - itemCount: number
  - imageUrl: string | null  <-- Actualmente siempre null
  - groupId: string
  - processedAt: timestamp
```

**Cloud Function:**
- Region: europe-west1
- Config: `invoker: 'public'`, `secrets: ['OPENAI_API_KEY']`
- Modelo: gpt-4o
- Coste: ~$0.003-0.01 por ticket

**Archivos del sistema de tickets:**
- `src/pages/app/tickets/index.astro` - Listado
- `public/components/hc-ticket-scanner.js` - Componente Lit
- `public/components/hc-shopping-list.js` - Integración y guardado
- `public/js/tickets.js` - Servicios
- `functions/index.js` - Cloud Function

---

## Sesión anterior (01/01/2026) - Sistema de Categorías ✅ COMPLETADO

### Gestión de Categorías por Tipo de Lista ✅

Se ha implementado un sistema flexible de categorías independiente por tipo de lista:
- **Listas de compra**: categorías globales por defecto (14 categorías con emoji) + custom por grupo
- **Listas generales**: sin categorías por defecto, solo custom por grupo (con colores)

**Archivos creados:**
- `public/js/categories.js`: Servicio de categorías con CRUD y helpers
- `public/components/hc-categories-manager.js`: Componente Lit para gestionar categorías
- `src/pages/app/categories.astro`: Página de gestión de categorías

**Archivos modificados:**
- `public/components/hc-shopping-list.js`:
  - Selector de categoría en formulario de creación y edición
  - Formulario inline para crear nuevas categorías
  - Carga dinámica de categorías desde Firestore
- `firebase/firestore.rules`:
  - Añadida colección `groups/{groupId}/categories` con permisos

**Modelo de datos:**
```javascript
// groups/{groupId}/categories/{categoryId}
{
  name: "Camping",
  icon: "⛺",         // Solo para listas de compra
  bgColor: "#DCFCE7",
  textColor: "#16A34A",
  listType: "shopping" | "agnostic",
  order: 1,
  createdAt: timestamp,
  createdBy: "uid"
}
```

**Características:**
- [x] Categorías por defecto para shopping (no editables/borrables)
- [x] Categorías custom por grupo
- [x] Selector de categoría al crear/editar items
- [x] Opción "+ Nueva categoría" inline
- [x] Selector de colores para categorías
- [x] Dark mode completo
- [x] Página `/app/categories` con tabs por tipo de lista

**Pendiente:**
- [ ] Script de migración de items con categorías antiguas
- [ ] Añadir enlace a categorías en navegación o ajustes

---

## Sesión anterior - Sublistas v2 ✅ COMPLETADO

### Sublistas con details/summary ✅

Se ha rediseñado la UI de sublistas para usar `<details><summary>` nativo.

**Cambios realizados:**
- Al crear item: checkbox "Es sublista" que permite definir subelementos antes de crear
- Items normales: checkbox tradicional
- Sublistas: `<details><summary>` expandible con subelementos dentro
- Indicador de progreso (0/3, 2/3, etc.) con colores según estado
- Modal de edición permite convertir items normales en sublistas

**Archivos modificados:**
- `public/components/hc-shopping-list.js`:
  - Checkbox "Es sublista" en formulario de creación
  - Builder de subelementos al crear
  - Modal de edición con opción de convertir a sublista
  - Dark mode completo para todos los elementos
- `public/components/hc-list-item.js`:
  - Render diferenciado: checkbox vs details/summary
  - Estilos CSS para `.item-checklist`, `summary`, `details`
  - Dark mode completo para items y sublistas

**Verificado:**
- [x] Estilos en dark mode
- [x] Edición de sublistas existentes
- [x] Conversión de item normal a sublista
- [x] Sincronización real-time

---

### Tests E2E automatizados ✅

Configuración completa de tests E2E con emuladores de Firebase.

**Nuevo flujo:**
```bash
pnpm test:e2e
```

Este comando:
1. Arranca emuladores de Firebase automáticamente
2. Espera a que estén listos
3. Siembra datos de prueba (usuario, listas, items)
4. Ejecuta tests con Playwright
5. Apaga emuladores al terminar

**Archivos creados:**
- `.env.test` - Configuración para emuladores
- `scripts/run-e2e-tests.js` - Script principal que orquesta todo
- `scripts/seed-test-data.js` - Siembra datos de prueba
- `scripts/start-test-server.js` - Arranca servidor con config test
- `tests/global-setup.js` - Setup de Playwright

**Dependencias añadidas:**
- `firebase-admin` - Para sembrar datos en emuladores

---

### Otras mejoras ✅

- Eliminado rewrite `/api/**` no usado en `firebase.json`
- Actualizado formato de hooks husky para v10

---

## Arquitectura de Listas

### Principios fundamentales

Las listas son **únicas e independientes** (NO recurrentes). Cada lista representa una compra o evento específico.

### Metadatos de lista

Cada lista debe incluir:
- `createdAt`: Fecha de creación
- `createdBy`: UID del creador
- `updatedAt`: Última modificación
- `updatedBy`: UID de quién hizo la última modificación
- `archivedAt`: Fecha de archivado (null si está activa)
- `archivedBy`: UID de quién archivó

**Estado actual:** Solo tiene `createdAt` y `updatedAt`.

**Pendiente:**
- [ ] Añadir campos `createdBy`, `updatedBy`, `archivedAt`, `archivedBy` al modelo
- [ ] Actualizar `updatedBy` en cada modificación de items
- [ ] Registrar `archivedAt` y `archivedBy` al archivar

### Historial de listas

- [ ] Vista histórica de todas las listas (activas + archivadas)
- [ ] Filtros: por fecha, por estado (activa/archivada), por tipo
- [ ] Ordenación: fecha creación, última modificación, nombre
- [ ] Búsqueda por nombre de lista

### Tickets asociados a lista

Cada lista puede tener **múltiples tickets** asociados (compras parciales).

**Estado actual:** Ya implementado en `users/{uid}/lists/{listId}/tickets/{ticketId}`

**Pendiente:**
- [ ] Mostrar resumen de tickets en cabecera de lista (total tickets, suma totales)
- [ ] Vincular items marcados con el ticket que los compró

---

## Creación de listas desde Productos

### Dos flujos de creación

#### Flujo 1: Añadir productos manualmente a lista
- [ ] Al escribir nombre de producto, buscar en productos existentes
- [ ] Mostrar sugerencias con autocompletado (fuzzy matching)
- [ ] Si el producto NO existe, crearlo automáticamente en `groups/{groupId}/products`
- [ ] Usar datos del producto existente (categoría, unidad) si existe

#### Flujo 2: Seleccionar desde vista de Productos
- [ ] En `/app/products`, añadir modo selección
- [ ] Checkbox para marcar productos a añadir
- [ ] Botón "Añadir a lista" → selector de lista destino (o crear nueva)
- [ ] Crear items en la lista con los productos seleccionados

### Vista de Productos (`/app/products`)

- [ ] Tabla de productos ordenable:
  - Por nombre (A-Z, Z-A)
  - Por categoría
- [ ] Indicador visual de orden actual
- [ ] Mantener orden en localStorage

---

## Categorías en listas

### Ordenación de categorías con Drag & Drop ✅ COMPLETADO

- [x] Las categorías agrupadas pueden reordenarse arrastrando
- [x] Guardar orden personalizado por lista (localStorage)
- [x] Usar HTML5 Drag API nativo (sin bibliotecas externas)

### Categorías colapsables (summary/details) ✅ COMPLETADO

- [x] Cada categoría agrupada usa `<details><summary>` nativo
- [x] Estado expandido/colapsado persistido
- [x] Botón "Colapsar todas" / "Expandir todas"
- [x] Mostrar contador de items por categoría en el summary
- [x] Chevron indicador de estado (rotación CSS)

**Archivos modificados:**
- `public/components/hc-shopping-list.js` - render de categorías agrupadas
- `public/components/hc-categories-manager.js` - limpieza de categoryId al borrar

---

## Pendiente Inmediato

### Persistencia de preferencias de usuario

Las selecciones del usuario deben recordarse entre sesiones y recargas de página.

**Estado actual:**
- Las opciones como "Mostrar completados", "Agrupar por categoría", vista tabla/lista, etc. se resetean al recargar
- Solo `listsViewMode` se guarda en localStorage

**Requisitos:**
- [ ] Guardar estado de filtros y opciones en localStorage (por lista o global según contexto)
- [ ] Opciones a persistir en `hc-shopping-list`:
  - `showCompleted` - Mostrar/ocultar completados
  - `groupByCategory` - Agrupar por categoría
  - `viewMode` - Vista lista/tabla
  - `filterByAssignee` - Filtro por asignado
- [ ] Opciones a persistir en páginas:
  - Tab activo (mis listas / archivadas / compartidas)
  - Modo de vista (grid/list)
- [ ] Restaurar preferencias al cargar componente/página
- [ ] Considerar guardar preferencias por lista vs globales

**Implementación sugerida:**
```javascript
// Clave: `prefs:${listId}` o `prefs:global`
const prefs = {
  showCompleted: false,
  groupByCategory: true,
  viewMode: 'list',
  filterByAssignee: ''
};
localStorage.setItem(`prefs:${listId}`, JSON.stringify(prefs));
```

**Archivos a modificar:**
- `public/components/hc-shopping-list.js`
- `src/pages/app/lists/index.astro`

---

### Modo claro/oscuro ✅ COMPLETADO

- [x] Asegurar que el cambio de tema funciona correctamente en toda la aplicación
- [x] Usar preferencia del sistema (`prefers-color-scheme`) como valor por defecto
- [x] Permitir al usuario sobrescribir la preferencia del sistema manualmente
- [x] Persistir la preferencia del usuario en `localStorage`
- [x] Escuchar cambios en la preferencia del sistema y actualizar si no hay preferencia manual
- [x] Dark mode en componentes Lit (usando `@media (prefers-color-scheme: dark)` en Shadow DOM)

### SEO - Assets gráficos

- [ ] Convertir `public/og-image.svg` a `public/og-image.png` (1200x630px)
- [ ] Crear `public/icon-192.png` (192x192px) desde favicon.svg
- [ ] Crear `public/icon-512.png` (512x512px) desde favicon.svg
- [ ] Crear `public/apple-touch-icon.png` (180x180px)
- [ ] Crear `public/favicon-32x32.png` (32x32px)
- [ ] Crear `public/favicon-16x16.png` (16x16px)
- [ ] (Opcional) Crear screenshots para manifest.json:
  - `public/screenshot-wide.png` (1280x720px)
  - `public/screenshot-mobile.png` (390x844px)

---

## Bugs Críticos

### ~~Sincronización en tiempo real de listas compartidas~~ ✅ RESUELTO

**Estado:** No reproducible. La sincronización funciona correctamente.

**Verificación realizada:**
- [x] Se verificó que `hc-shopping-list.js` usa `onSnapshot` correctamente
- [x] Se verificó que el `ownerId` se pasa correctamente desde la URL
- [x] Se probó con dos usuarios y los cambios se sincronizan en tiempo real

**Mejoras aplicadas:**
- Eliminadas suscripciones duplicadas en `hc-shopping-list.js`
- Corregido warning de meta tag `apple-mobile-web-app-capable`

---

## Features Planificadas

### 1. Sublistas / Checklists en elementos ✅ IMPLEMENTADO

**Contexto:** Un elemento de una lista general (ej: "Neceser" en lista de viajes) puede necesitar una sublista de cosas a comprobar/meter.

**Requisitos:**
- [x] Reemplazar/extender campo "Notas" por sublista con checkboxes
- [x] Cada elemento de la sublista es un checkbox simple (texto + checked)
- [x] Estados visuales del elemento padre:
  - ☐ Sin marcar: ningún checkbox de sublista marcado
  - ☐ Parcial (rayita horizontal naranja): algunos checkboxes marcados
  - ☑ Completado: todos los checkboxes de la sublista marcados
- [x] UI para añadir/eliminar elementos de la sublista
- [x] Persistir sublista en Firestore como array de objetos `{ text: string, checked: boolean }`

**Implementación:**
- `hc-list-item.js`: Renderiza sublista expandible con toggle, checkboxes individuales
- `hc-shopping-list.js`: Manejadores para toggle/add/remove de items de sublista
- Solo disponible en listas agnósticas (no en listas de compra)
- El estado checked del item padre se auto-calcula según la sublista

**Modelo de datos:**
```javascript
// items/{itemId}
{
  name: "Neceser",
  checked: false,  // auto-calculado según sublista
  partiallyChecked: false,  // true si algunos pero no todos
  checklist: [
    { text: "Cepillo de dientes", checked: true },
    { text: "Pasta de dientes", checked: false },
    { text: "Desodorante", checked: true }
  ]
}
```

---

### 2. Gestión de Categorías por Tipo de Lista ✅ IMPLEMENTADO

**Contexto:** Las categorías actuales están hardcodeadas. Se necesita un sistema flexible donde:
- Listas de compra: categorías típicas de supermercado (lácteos, carnes, etc.) con emoji
- Listas generales: categorías libres definidas por el usuario con color de fondo/texto

**Requisitos:**

#### Almacenamiento
- [x] Categorías por grupo (no por usuario individual)
- [x] Listas de compra: categorías globales por defecto + personalizadas del grupo
- [x] Listas generales: sin categorías por defecto, se crean según necesidad
- [x] Categorías referenciadas por ID (para soportar renombrado)

#### Categorías por defecto (listas de compra)
- [x] Crear colección `defaultCategories/shopping` con categorías típicas:
  - 🥛 Lácteos, 🥩 Carnes, 🐟 Pescados, 🥬 Verduras, 🍎 Frutas
  - 🍞 Panadería, 🥫 Despensa, 🧊 Congelados, 🧴 Limpieza, 🧼 Higiene
  - 🐕 Mascotas, 🍺 Bebidas, 📦 Otros
  - *Nota: Implementado como constante en `categories.js`, no en Firestore*
- [x] Categorías por defecto: NO borrables, NO editables (excepto colores)

#### Categorías personalizadas
- [x] Crear categorías custom por grupo: `groups/{groupId}/categories/{categoryId}`
- [x] Campos: `name`, `icon` (emoji, solo shopping), `bgColor`, `textColor`, `listType`, `isDefault`, `order`
- [x] Poder editar nombre, colores
- [x] Poder borrar (solo las custom)
- [x] Al borrar categoría: quitar categoryId de todos los items que la usen

#### Apariencia
- [x] Listas de compra: emoji + nombre
- [x] Listas generales: badge con color de fondo + texto (sin emoji)
- [x] Selector de color en edición de categoría

#### UI - Sección Categorías (`/app/categories`)
- [x] Crear página `/app/categories`
- [x] Tabs: "Listas de Compra" | "Listas Generales"
- [x] Mostrar categorías por defecto (con candado visual)
- [x] Mostrar categorías custom del grupo (editables/borrables)
- [x] Botón "+ Nueva categoría"
- [x] Modal/inline para crear/editar: nombre, emoji (si shopping), colores
- [x] Confirmar antes de borrar (mostrar cuántos items afectados)

#### UI - Selector en creación de item
- [x] Dropdown con categorías disponibles según tipo de lista
- [x] Opción "+ Nueva categoría" al final del dropdown
- [x] Al seleccionar "+ Nueva categoría":
  - Expandir inline un mini-form (nombre, color)
  - O abrir modal rápido
  - Crear categoría y seleccionarla automáticamente

#### Extensibilidad
- [x] Estructura preparada para nuevos tipos de lista en el futuro
- [x] Categorías por defecto definidas por `listType`

**Modelo de datos:**
```javascript
// defaultCategories/{listType}/items/{categoryId}
// Ej: defaultCategories/shopping/items/lacteos
{
  id: "lacteos",
  name: "Lácteos",
  icon: "🥛",
  bgColor: "#E3F2FD",
  textColor: "#1565C0",
  order: 1,
  isDefault: true
}

// groups/{groupId}/categories/{categoryId}
{
  id: "autoGeneratedId",
  name: "Camping",
  icon: null,  // null para listas generales
  bgColor: "#E8F5E9",
  textColor: "#2E7D32",
  listType: "agnostic",  // "shopping" | "agnostic"
  isDefault: false,
  order: 100,
  createdAt: timestamp,
  createdBy: "uid"
}

// items con categoría
{
  name: "Leche",
  categoryId: "lacteos",  // referencia por ID
  // ...otros campos
}
```

**Migración:**
- [ ] Script para migrar items con `category: "string"` a `categoryId: "id"`
- [ ] Crear categorías en defaultCategories si no existen

---

### 3. Imágenes/Logos personalizados para listas

**Contexto:** Permitir subir logos (ej: supermercados) al crear listas en lugar de solo emojis.

**Requisitos:**
- [ ] Añadir opción de subir imagen al crear/editar lista
- [ ] Guardar imagen en Firebase Storage (`/list-icons/{userId}/{filename}`)
- [ ] Limitar tamaño máximo: 100KB
- [ ] Limitar tipos de archivo: PNG, JPG, SVG, WebP
- [ ] Redimensionar automáticamente a máximo 128x128px
- [ ] Marcar imagen como pública o privada
- [ ] Añadir nombre/etiqueta a la imagen
- [ ] Crear galería de imágenes compartidas (públicas)
- [ ] En selector de icono de lista:
  - Tab 1: Emojis (actual)
  - Tab 2: Mis imágenes
  - Tab 3: Galería pública

**Modelo de datos:**
```javascript
// users/{uid}/listIcons/{iconId}
{
  name: "Mercadona",
  url: "https://storage.../icon.png",
  isPublic: true,
  createdAt: timestamp
}

// Galería pública: publicListIcons/{iconId}
{
  name: "Mercadona",
  url: "https://storage.../icon.png",
  uploadedBy: uid,
  usageCount: 42
}
```

---

### 4. Sincronización de Productos

**Objetivo:** Los productos son la fuente de verdad. Las listas referencian productos existentes o crean nuevos automáticamente.

**Requisitos:**

#### Fase 1: Migración inicial
- [ ] Script para extraer productos únicos de listas existentes
- [ ] Normalizar nombres y fusionar duplicados
- [ ] Poblar `groups/{groupId}/products`

#### Fase 2: Autocompletado en listas
- [ ] Al escribir nombre en lista, buscar en productos del grupo
- [ ] Sugerencias con fuzzy matching ("Filetes de pollo" ≈ "filetes pollo")
- [ ] Ordenar sugerencias por frecuencia de uso
- [ ] Si no existe, crear producto automáticamente al añadir a lista

#### Fase 3: Vista de Productos mejorada
- [ ] Tabla ordenable por nombre (A-Z) y categoría
- [ ] Modo selección: checkbox para marcar productos
- [ ] Acción "Añadir a lista" con selector de lista destino
- [ ] Búsqueda/filtro rápido

**Ver también:** Sección "Creación de listas desde Productos" más arriba.

**Algoritmo de normalización:**
```javascript
function normalizeProductName(name) {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}
```

---

### 5. Rediseño sección Tickets

**Problema actual:** La sección tickets permite subir tickets directamente, pero debería estar asociado a una lista.

**Nuevo flujo:**

#### Sección Tickets (`/app/tickets`)
- [ ] Cambiar a solo visualización de tickets subidos
- [ ] Mostrar lista de tickets con:
  - Imagen miniatura
  - Lista asociada
  - Fecha
  - Total (si procesado)
- [ ] Filtrar por lista, fecha, estado de procesamiento
- [ ] Ver detalle de ticket con productos detectados

#### Subida de ticket (desde lista de compra)
- [ ] Añadir botón "Subir ticket" en vista de lista de compra
- [ ] Al subir:
  1. Guardar imagen en Storage
  2. Asociar a la lista actual
  3. Llamar a Cloud Function para procesar con IA
  4. IA compara productos del ticket vs productos de la lista
  5. Marcar automáticamente productos comprados
  6. Detectar precios y cantidades
  7. Calcular totales y diferencias

**Modelo de datos:**
```javascript
// users/{uid}/lists/{listId}/tickets/{ticketId}
{
  imageUrl: "https://storage.../ticket.jpg",
  uploadedAt: timestamp,
  processedAt: timestamp | null,
  status: "pending" | "processing" | "completed" | "error",
  detectedItems: [
    { name: "Leche", price: 1.20, quantity: 2, matchedItemId: "item123" }
  ],
  total: 45.60,
  listId: "list123"
}
```

---

### 6. Mejoras en Balance y Estadísticas

**Contexto:** Balance debe ser el centro de cálculos y estadísticas, no solo visualización.

**Requisitos:**

#### Cálculos por lista
- [ ] Seleccionar una lista de compra
- [ ] Ver desglose de gastos por:
  - Producto
  - Categoría
  - Miembro (quién compró qué)
- [ ] Reparto de gastos entre miembros del grupo
- [ ] Mostrar quién debe a quién

#### Estadísticas globales
- [ ] Gasto mensual total
- [ ] Gasto por categoría (gráfico)
- [ ] Comparativa mes a mes
- [ ] Precio medio por producto a lo largo del tiempo
- [ ] Productos más comprados
- [ ] Tendencias de precios

#### Cálculos de reparto
- [ ] Seleccionar lista con múltiples compradores
- [ ] Definir tipo de reparto:
  - Igualitario (dividir entre todos)
  - Por consumo (quién consume qué)
  - Personalizado (porcentajes)
- [ ] Calcular deudas: "Juan debe 15€ a María"
- [ ] Historial de pagos/liquidaciones

**Modelo de datos adicional:**
```javascript
// groups/{groupId}/settlements/{settlementId}
{
  listId: "list123",
  createdAt: timestamp,
  participants: ["uid1", "uid2", "uid3"],
  totalAmount: 150.00,
  splitType: "equal" | "consumption" | "custom",
  debts: [
    { from: "uid1", to: "uid2", amount: 25.00, settled: false }
  ]
}
```

---

## Prioridad sugerida

1. ~~**Alta** - Sublistas/checklists~~ ✅ COMPLETADO
2. ~~**Alta** - Gestión de categorías~~ ✅ IMPLEMENTADO
3. **Alta** - Arquitectura de listas (metadatos, historial)
4. **Alta** - Sincronización de productos + autocompletado
5. **Alta** - Creación de listas desde Productos
6. ~~**Media** - Categorías colapsables y ordenables (D&D)~~ ✅
7. **Media** - Vista de productos ordenable
8. **Media** - Mejoras tickets (resumen en lista)
9. **Media** - Mejoras Balance (estadísticas)
10. **Baja** - Imágenes/logos para listas

---

## Notas técnicas

- Todas las features deben seguir el patrón SSG de Astro
- Usar Lit components para interactividad
- Mantener compatibilidad con View Transitions
- Actualizar Firestore Rules según se añadan colecciones
- Tests E2E para flujos críticos

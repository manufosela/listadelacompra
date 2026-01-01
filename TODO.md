# TODO - MyHomeCart

Tareas pendientes y features planificadas para desarrollo futuro.

---

## Sesión actual (01/01/2026) - Sublistas v2 ✅ COMPLETADO

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

## Pendiente Inmediato

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

### 2. Imágenes/Logos personalizados para listas

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

### 3. Sincronización de Productos (Bug Fix + Feature)

**Problema actual:** Los productos añadidos en listas de compra no se guardan en la sección Productos del grupo.

**Requisitos:**

#### Fase 1: Migración inicial
- [ ] Crear script/función para extraer todos los productos únicos de listas existentes
- [ ] Añadir productos extraídos a `groups/{groupId}/products`
- [ ] Normalizar nombres (lowercase, trim, etc.)
- [ ] Detectar y fusionar duplicados similares

#### Fase 2: Sincronización automática
- [ ] Al añadir producto a lista de compra:
  - Buscar si existe en productos del grupo
  - Si no existe, crear nuevo producto
  - Si existe, usar datos existentes (categoría, unidad, etc.)
- [ ] Implementar autocompletado/sugerencias al escribir nombre de producto
- [ ] Fuzzy matching para detectar variantes: "Filetes de pollo" ≈ "filetes pollo"
- [ ] Mostrar sugerencias ordenadas por frecuencia de uso

**Algoritmo de normalización:**
```javascript
function normalizeProductName(name) {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/\s+/g, ' '); // espacios múltiples a uno
}

function calculateSimilarity(a, b) {
  // Levenshtein distance o similar
}
```

---

### 4. Rediseño sección Tickets

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

### 5. Mejoras en Balance y Estadísticas

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

1. **Alta** - Bug de productos (afecta UX actual)
2. **Alta** - Sublistas/checklists (feature muy solicitada)
3. **Media** - Rediseño tickets (mejora flujo)
4. **Media** - Mejoras Balance (valor añadido)
5. **Baja** - Imágenes/logos (nice to have)

---

## Notas técnicas

- Todas las features deben seguir el patrón SSG de Astro
- Usar Lit components para interactividad
- Mantener compatibilidad con View Transitions
- Actualizar Firestore Rules según se añadan colecciones
- Tests E2E para flujos críticos

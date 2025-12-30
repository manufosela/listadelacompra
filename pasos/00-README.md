# HomeCart - App de Lista de la Compra Familiar

## 📋 Índice de Fases

Este proyecto está dividido en 12 fases para su implementación incremental.

| Fase | Fichero | Descripción |
|------|---------|-------------|
| 00 | `00-README.md` | Este índice + contexto general |
| 01 | `01-setup-inicial.md` | Setup del proyecto, pnpm, commits, Firebase |
| 02 | `02-autenticacion.md` | Firebase Auth, Google Sign-in, perfiles |
| 03 | `03-multi-hogar.md` | Sistema de casas, invitaciones, roles |
| 04 | `04-listas-compra.md` | Listas en tiempo real, items, sync |
| 05 | `05-catalogo-productos.md` | CRUD productos, categorías, búsqueda |
| 06 | `06-tickets-ia.md` | OpenAI Vision, procesamiento tickets |
| 07 | `07-estadisticas.md` | Precios históricos, analytics, gráficos |
| 08 | `08-componentes-astro.md` | Header, Footer, Navigation estáticos |
| 09 | `09-estilos-css.md` | Variables CSS, componentes, dark mode |
| 10 | `10-testing.md` | Vitest unitarios, Playwright E2E |
| 11 | `11-ci-cd.md` | GitHub Actions, deploy Firebase |
| 12 | `12-firestore-rules.md` | Seguridad Firestore y Storage |

---

## 📋 Normas del Proyecto

### Principios
- Seguimos **SOLID** (si es posible), **YAGNI**, **DRY** y **KISS**
- Cero acoplamiento, código limpio, tests
- Comentarios en español, documentación en español
- Variables, funciones y archivos en inglés
- Sin fallbacks, las cosas o funcionan o no funcionan y se gestiona.

### Tecnología
- Solo Lit para componentes, sin frameworks adicionales
- Los componentes Lit se comunican mediante **Event Bus**:
  - Componentes emiten eventos para solicitar/enviar datos
  - Al crearse, cada componente se registra como "listo"
  - Si el receptor no está listo, el evento se encola
  - Payload siempre incluye `senderId` del emisor
  - Puede especificarse `targetId` del receptor
  - Los componentes son autosuficientes y desacoplados
  - La accesibilidad es un requisito primordial: alts, roles, ARIA, navegación con teclado, etc

### Configuración
- Fichero `.env` con datos críticos (NO se sube a git)
- `firebase-config.js` se **genera automáticamente** desde `.env`
- NUNCA editar `firebase-config.js` manualmente
- Los scripts `dev` y `build` regeneran la config

---

## 🎯 Contexto del Proyecto

### Stack Tecnológico

- **Framework**: Astro 4.x (SSG, porque se despliega en firebase hosting)
- **Componentes interactivos**: Lit 3.x (Web Components)
- **Backend/Auth/DB**: Firebase (Auth, Firestore, Storage, Hosting)
- **Estilos**: CSS Vanilla (custom properties, no frameworks)
- **JavaScript**: Vanilla ES Modules. SIN TYPESCRIPT BAJO NINGUNA CIRCUNSTANCIA
- **IA**: OpenAI API (GPT-4 Vision para tickets)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Package Manager**: pnpm
- **CI/CD**: GitHub Actions → Firebase Hosting

### Arquitectura de Datos (Firestore)

```
/users/{userId}
  - email: string
  - displayName: string
  - photoURL: string
  - createdAt: timestamp
  - householdIds: string[]

/households/{householdId}
  - name: string
  - createdBy: userId
  - createdAt: timestamp
  - members: Map<userId, { role: 'admin' | 'member', joinedAt: timestamp }>
  - inviteCodes: Map<code, { createdAt, expiresAt, createdBy }>

/households/{householdId}/products/{productId}
  - name: string
  - brand: string | null
  - category: string
  - defaultUnit: string
  - createdAt: timestamp
  - lastPurchasedAt: timestamp
  - purchaseCount: number

/households/{householdId}/shoppingLists/{listId}
  - name: string
  - store: string
  - scheduledDate: timestamp
  - status: 'pending' | 'shopping' | 'completed'
  - createdBy: userId
  - createdAt: timestamp
  - completedAt: timestamp | null
  - isRecurring: boolean
  - recurringPattern: { frequency: 'weekly' | 'biweekly' | 'monthly', dayOfWeek?: number }

/households/{householdId}/shoppingLists/{listId}/items/{itemId}
  - productId: string
  - productName: string
  - quantity: number
  - unit: string
  - checked: boolean
  - checkedBy: userId | null
  - checkedAt: timestamp | null
  - addedBy: userId
  - notes: string

/households/{householdId}/purchases/{purchaseId}
  - listId: string | null
  - store: string
  - date: timestamp
  - totalAmount: number
  - ticketImageUrl: string | null
  - processedByAI: boolean
  - createdBy: userId

/households/{householdId}/purchases/{purchaseId}/items/{itemId}
  - productId: string
  - productName: string
  - brand: string
  - quantity: number
  - unit: string
  - unitPrice: number
  - totalPrice: number

/households/{householdId}/priceHistory/{productId}/entries/{entryId}
  - store: string
  - brand: string
  - price: number
  - unit: string
  - date: timestamp
  - purchaseId: string
```

### Estructura del Proyecto

```
homecart/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── public/
│   ├── components/           # Lit components (client-side)
│   │   ├── hc-shopping-list.js
│   │   ├── hc-list-item.js
│   │   ├── hc-product-search.js
│   │   ├── hc-price-chart.js
│   │   ├── hc-ticket-scanner.js
│   │   ├── hc-household-selector.js
│   │   ├── hc-member-manager.js
│   │   ├── hc-recurring-config.js
│   │   └── hc-stats-dashboard.js
│   ├── js/
│   │   ├── firebase-config.js
│   │   ├── auth.js
│   │   ├── db.js
│   │   ├── realtime-sync.js
│   │   └── openai-service.js
│   ├── css/
│   │   ├── reset.css
│   │   ├── variables.css
│   │   ├── global.css
│   │   └── components.css
│   └── assets/
├── src/
│   ├── components/           # Componentes Astro (estáticos)
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Navigation.astro
│   │   └── AuthGuard.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── AppLayout.astro
│   │   └── AuthLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── login.astro
│   │   └── app/
│   │       ├── index.astro
│   │       ├── lists/
│   │       ├── products/
│   │       ├── stats/
│   │       ├── purchases/
│   │       └── settings/
│   └── layouts/
├── functions/
│   ├── index.js
│   └── package.json
├── tests/
│   ├── unit/
│   └── e2e/
├── firebase/
│   ├── firestore.rules
│   ├── storage.rules
│   └── firestore.indexes.json
├── astro.config.mjs
├── vitest.config.js
├── playwright.config.js
├── jsconfig.json
├── pnpm-lock.yaml
├── package.json
└── README.md
```

---

## 🗓️ Plan de Sprints Recomendado

| Sprint | Fases | Objetivo |
|--------|-------|----------|
| 1 | 01-02 | Setup + Autenticación |
| 2 | 03-04 | Multi-hogar + Listas |
| 3 | 05 | Catálogo de productos |
| 4 | 06 | Tickets con IA |
| 5 | 07 | Estadísticas |
| 6 | 08-09 | UI/UX Polish |
| 7 | 10-11 | Testing + CI/CD |
| 8 | 12 | Seguridad + Review |

---

## 📝 Conventional Commits

Todos los commits deben seguir el estándar:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types permitidos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Documentación
- `style`: Formateo (no afecta código)
- `refactor`: Refactorización
- `test`: Tests
- `chore`: Tareas de mantenimiento
- `perf`: Mejoras de rendimiento
- `ci`: Cambios en CI/CD

**Ejemplos:**
```bash
git commit -m "feat(auth): implement Google sign-in with Firebase"
git commit -m "fix(lists): resolve realtime sync race condition"
git commit -m "test(e2e): add shopping list flow tests"
```

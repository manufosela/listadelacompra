# Fase 10: Testing

## Objetivo

Configurar y escribir tests unitarios con Vitest y tests E2E con Playwright, todo en JavaScript.

---

## Paso 10.1: Configurar Vitest

### Crear `vitest.config.js`

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['public/js/**/*.js'],
      exclude: ['node_modules', 'tests']
    }
  }
});
```

### Crear `tests/setup.js`

```javascript
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock Firebase
vi.mock('./public/js/firebase-config.js', () => ({
  db: {},
  auth: {},
  storage: {},
  functions: {}
}));

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## Paso 10.2: Tests Unitarios - Household Service

### Crear `tests/unit/household.test.js`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Household Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getCurrentHouseholdId', () => {
    it('should return null when no household is set', () => {
      localStorage.getItem = vi.fn().mockReturnValue(null);
      
      const getCurrentHouseholdId = () => localStorage.getItem('hc_current_household');
      
      expect(getCurrentHouseholdId()).toBeNull();
    });

    it('should return household ID when set', () => {
      localStorage.getItem = vi.fn().mockReturnValue('household-123');
      
      const getCurrentHouseholdId = () => localStorage.getItem('hc_current_household');
      
      expect(getCurrentHouseholdId()).toBe('household-123');
    });
  });

  describe('setCurrentHousehold', () => {
    it('should save household ID to localStorage', () => {
      const setCurrentHousehold = (id) => {
        localStorage.setItem('hc_current_household', id);
        window.dispatchEvent(new CustomEvent('household-changed', { detail: { householdId: id } }));
      };

      setCurrentHousehold('household-456');

      expect(localStorage.setItem).toHaveBeenCalledWith('hc_current_household', 'household-456');
    });
  });

  describe('generateInviteCode', () => {
    it('should generate a 6 character code', () => {
      const generateInviteCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
      };

      const code = generateInviteCode();
      
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should not contain ambiguous characters', () => {
      const generateInviteCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
      };

      for (let i = 0; i < 100; i++) {
        const code = generateInviteCode();
        expect(code).not.toContain('0');
        expect(code).not.toContain('O');
        expect(code).not.toContain('I');
        expect(code).not.toContain('1');
        expect(code).not.toContain('L');
      }
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin users', () => {
      const mockHousehold = {
        members: {
          'user-123': { role: 'admin' }
        }
      };

      const isAdmin = (household, userId) => {
        return household?.members[userId]?.role === 'admin';
      };

      expect(isAdmin(mockHousehold, 'user-123')).toBe(true);
    });

    it('should return false for member users', () => {
      const mockHousehold = {
        members: {
          'user-123': { role: 'member' }
        }
      };

      const isAdmin = (household, userId) => {
        return household?.members[userId]?.role === 'admin';
      };

      expect(isAdmin(mockHousehold, 'user-123')).toBe(false);
    });

    it('should return false for non-members', () => {
      const mockHousehold = {
        members: {}
      };

      const isAdmin = (household, userId) => {
        return household?.members[userId]?.role === 'admin';
      };

      expect(isAdmin(mockHousehold, 'user-123')).toBe(false);
    });
  });
});
```

---

## Paso 10.3: Tests Unitarios - Products

### Crear `tests/unit/products.test.js`

```javascript
import { describe, it, expect } from 'vitest';

describe('Product Categories', () => {
  const PRODUCT_CATEGORIES = [
    { id: 'frutas', name: 'Frutas', icon: '🍎' },
    { id: 'verduras', name: 'Verduras', icon: '🥬' },
    { id: 'carnes', name: 'Carnes', icon: '🥩' },
    { id: 'otros', name: 'Otros', icon: '📦' }
  ];

  it('should have unique IDs', () => {
    const ids = PRODUCT_CATEGORIES.map(c => c.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids).toHaveLength(uniqueIds.length);
  });

  it('should have "otros" as fallback category', () => {
    const otros = PRODUCT_CATEGORIES.find(c => c.id === 'otros');
    expect(otros).toBeDefined();
  });
});

describe('inferCategory', () => {
  const inferCategory = (productName) => {
    const name = productName.toLowerCase();
    
    const categoryKeywords = {
      'frutas': ['manzana', 'naranja', 'plátano'],
      'verduras': ['lechuga', 'tomate', 'cebolla'],
      'carnes': ['pollo', 'ternera', 'cerdo'],
      'lacteos': ['leche', 'yogur', 'queso'],
      'bebidas': ['agua', 'zumo', 'refresco']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => name.includes(kw))) {
        return category;
      }
    }

    return 'otros';
  };

  it('should detect fruit products', () => {
    expect(inferCategory('Manzana Golden')).toBe('frutas');
    expect(inferCategory('Naranja de zumo')).toBe('frutas');
  });

  it('should detect vegetable products', () => {
    expect(inferCategory('Tomate pera')).toBe('verduras');
    expect(inferCategory('Lechuga iceberg')).toBe('verduras');
  });

  it('should detect meat products', () => {
    expect(inferCategory('Pechuga de pollo')).toBe('carnes');
    expect(inferCategory('Filete de ternera')).toBe('carnes');
  });

  it('should detect dairy products', () => {
    expect(inferCategory('Leche entera')).toBe('lacteos');
    expect(inferCategory('Yogur natural')).toBe('lacteos');
  });

  it('should return "otros" for unknown products', () => {
    expect(inferCategory('Producto desconocido')).toBe('otros');
    expect(inferCategory('XYZ123')).toBe('otros');
  });

  it('should be case insensitive', () => {
    expect(inferCategory('MANZANA')).toBe('frutas');
    expect(inferCategory('Manzana')).toBe('frutas');
    expect(inferCategory('manzana')).toBe('frutas');
  });
});
```

---

## Paso 10.4: Configurar Playwright

### Crear `playwright.config.js`

```javascript
import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Cargar .env.test para tests E2E
config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    }
  ],

  webServer: {
    command: 'pnpm dev:test',  // Usa .env.test
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
```

---

## Paso 10.5: Helper de Autenticación para Tests

### Crear `tests/e2e/helpers/auth.js`

```javascript
/**
 * Helper para autenticación en tests E2E
 * Usa las credenciales de .env.test
 */

// Credenciales del usuario de test
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'testuser@fosela.com',
  password: process.env.TEST_USER_PASSWORD || 'testuser'
};

/**
 * Hace login con email/password en la página de login
 * @param {import('@playwright/test').Page} page
 */
export async function loginWithTestUser(page) {
  await page.goto('/login');
  
  // Click en "Iniciar sesión con email"
  await page.click('[data-testid="email-login-toggle"]');
  
  // Rellenar formulario
  await page.fill('[data-testid="email-input"]', TEST_USER.email);
  await page.fill('[data-testid="password-input"]', TEST_USER.password);
  
  // Enviar
  await page.click('[data-testid="login-submit"]');
  
  // Esperar redirección a /app
  await page.waitForURL('/app/**', { timeout: 10000 });
}

/**
 * Hace logout
 * @param {import('@playwright/test').Page} page
 */
export async function logout(page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('/login');
}

/**
 * Verifica si el usuario está autenticado
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn(page) {
  try {
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
```

---

## Paso 10.6: Tests E2E

### Crear `tests/e2e/auth.spec.js`

```javascript
import { test, expect } from '@playwright/test';
import { loginWithTestUser, logout, isLoggedIn } from './helpers/auth.js';

test.describe('Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL('/login');
  });

  test('should show login options', async ({ page }) => {
    await page.goto('/login');
    
    // Google button
    const googleButton = page.locator('[data-testid="google-signin-btn"]');
    await expect(googleButton).toBeVisible();
    
    // Email login toggle
    const emailToggle = page.locator('[data-testid="email-login-toggle"]');
    await expect(emailToggle).toBeVisible();
  });

  test('should login with email/password', async ({ page }) => {
    await loginWithTestUser(page);
    
    // Verificar que estamos en /app
    await expect(page).toHaveURL(/\/app/);
    
    // Verificar que se muestra el menú de usuario
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Primero login
    await loginWithTestUser(page);
    
    // Luego logout
    await logout(page);
    
    // Verificar redirección a login
    await expect(page).toHaveURL('/login');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.click('[data-testid="email-login-toggle"]');
    
    await page.fill('[data-testid="email-input"]', 'invalid@email.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');
    
    // Verificar mensaje de error
    const errorMessage = page.locator('[data-testid="login-error"]');
    await expect(errorMessage).toBeVisible();
  });
});
```

### Crear `tests/e2e/lists.spec.js`

```javascript
import { test, expect } from '@playwright/test';
import { loginWithTestUser } from './helpers/auth.js';

test.describe('Shopping Lists', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page);
  });

  test('should display lists page', async ({ page }) => {
    await page.goto('/app/lists');
    
    const heading = page.locator('h1');
    await expect(heading).toContainText('Listas');
  });

  test('should create a new list', async ({ page }) => {
    await page.goto('/app/lists');
    
    // Click en crear lista
    await page.click('[data-testid="create-list-btn"]');
    
    // Rellenar nombre
    await page.fill('[data-testid="list-name-input"]', 'Lista de Test E2E');
    
    // Guardar
    await page.click('[data-testid="save-list-btn"]');
    
    // Verificar que aparece en la lista
    const listItem = page.locator('text=Lista de Test E2E');
    await expect(listItem).toBeVisible();
  });

  test('should add item to list', async ({ page }) => {
    await page.goto('/app/lists');
    
    // Abrir primera lista (o la de test)
    await page.click('[data-testid="list-card"]');
    
    // Añadir item
    await page.fill('[data-testid="product-search"]', 'Leche');
    await page.click('[data-testid="add-item-btn"]');
    
    // Verificar que se añadió
    const item = page.locator('[data-testid="list-item"]', { hasText: 'Leche' });
    await expect(item).toBeVisible();
  });
});
```

### Crear `tests/e2e/navigation.spec.js`

```javascript
import { test, expect } from '@playwright/test';
import { loginWithTestUser } from './helpers/auth.js';

test.describe('Navigation - Public', () => {
  test('landing page has link to login', async ({ page }) => {
    await page.goto('/');
    
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    
    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });

  test('login page is responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    const loginCard = page.locator('.login-card');
    await expect(loginCard).toBeVisible();
  });

  test('landing page should be accessible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('HomeCart');
  });
});

test.describe('Navigation - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page);
  });

  test('should navigate between sections', async ({ page }) => {
    // Ir a listas
    await page.click('[data-testid="nav-lists"]');
    await expect(page).toHaveURL('/app/lists');
    
    // Ir a productos
    await page.click('[data-testid="nav-products"]');
    await expect(page).toHaveURL('/app/products');
    
    // Ir a estadísticas
    await page.click('[data-testid="nav-stats"]');
    await expect(page).toHaveURL('/app/stats');
  });

  test('should show mobile navigation on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/app');
    
    // Verificar que existe la navegación móvil
    const mobileNav = page.locator('[data-testid="mobile-nav"]');
    await expect(mobileNav).toBeVisible();
  });
});
```

---

## Paso 10.7: Scripts de Test

### Añadir a `package.json`

```json
{
  "scripts": {
    "generate:config": "node scripts/generate-firebase-config.js",
    "generate:config:test": "cp .env.test .env && node scripts/generate-firebase-config.js",
    
    "dev": "pnpm generate:config && astro dev",
    "dev:test": "pnpm generate:config:test && astro dev",
    
    "test": "pnpm test:unit && pnpm test:e2e",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:unit:ui": "vitest --ui",
    "test:unit:coverage": "vitest run --coverage",
    
    "test:e2e": "pnpm generate:config:test && playwright test",
    "test:e2e:ui": "pnpm generate:config:test && playwright test --ui",
    "test:e2e:debug": "pnpm generate:config:test && playwright test --debug",
    "test:e2e:headed": "pnpm generate:config:test && playwright test --headed"
  }
}
```

### Flujo de tests E2E

```
1. pnpm test:e2e
   ↓
2. Copia .env.test → .env
   ↓
3. Genera firebase-config.js con DB "test"
   ↓
4. Inicia servidor de desarrollo
   ↓
5. Ejecuta tests con usuario testuser@fosela.com
   ↓
6. Tests escriben en Firestore DB "test" (no producción)
```

---

## ✅ Checklist Fase 10

- [ ] Vitest configurado con jsdom
- [ ] Setup file con mocks
- [ ] Tests unitarios household service
- [ ] Tests unitarios products/categories
- [ ] Playwright configurado con .env.test
- [ ] Helper de autenticación para E2E
- [ ] Tests E2E auth flow con login real
- [ ] Tests E2E navigation
- [ ] Tests E2E listas de compra
- [ ] Base de datos Firestore "test" separada
- [ ] Scripts de test en package.json
- [ ] Coverage reporting

---

## 🔗 Siguiente: [11-ci-cd.md](./11-ci-cd.md)

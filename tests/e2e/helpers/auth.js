/**
 * Helper para autenticación en tests E2E
 */

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
  await page.click('.user-button');
  await page.click('text=Cerrar sesión');
  await page.waitForURL('/login');
}

/**
 * Verifica si el usuario está autenticado
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn(page) {
  try {
    await page.waitForSelector('.user-button', { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

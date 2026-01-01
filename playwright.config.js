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

  // Timeout más largo para dar tiempo a cargar
  timeout: 60000,
  expect: {
    timeout: 10000
  },

  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Configuración adicional para estabilidad
    actionTimeout: 15000,
    navigationTimeout: 30000
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

  // Configuración del servidor web para tests
  webServer: {
    // Usa el script que genera config de test y arranca el servidor
    command: 'node scripts/start-test-server.js',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Variables de entorno para el servidor
    env: {
      NODE_ENV: 'test',
      USE_EMULATORS: 'true'
    }
  }
});

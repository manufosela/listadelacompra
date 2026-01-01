/**
 * Script para arrancar el entorno de tests E2E
 * - Genera config con .env.test
 * - Arranca servidor de desarrollo
 *
 * Los emuladores deben arrancarse por separado con: pnpm firebase:emulators
 */
import { spawn, execSync } from 'child_process';
import { config } from 'dotenv';

// Cargar .env.test
config({ path: '.env.test' });

// Forzar NODE_ENV=test
process.env.NODE_ENV = 'test';

console.log('🧪 Preparando entorno de tests...');

// 1. Generar firebase-config.js con configuración de test
console.log('  → Generando firebase-config.js para tests...');
try {
  execSync('node scripts/generate-firebase-config.js', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' }
  });
} catch (error) {
  console.error('❌ Error generando config');
  process.exit(1);
}

// 2. Arrancar servidor de desarrollo
console.log('  → Arrancando servidor de desarrollo...');
const server = spawn('npx', ['astro', 'dev', '--port', '4321'], {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

server.on('error', (error) => {
  console.error('❌ Error arrancando servidor:', error);
  process.exit(1);
});

// Manejar señales para cerrar limpiamente
process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit(0);
});

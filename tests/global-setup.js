/**
 * Global setup para tests E2E
 * - Verifica que los emuladores de Firebase estén corriendo
 * - Siembra datos de prueba
 */

async function globalSetup() {
  console.log('\n🔧 Configurando entorno de tests E2E...\n');

  // 1. Verificar que los emuladores están corriendo
  const emulatorsRunning = await checkEmulators();

  if (!emulatorsRunning) {
    console.error('❌ Los emuladores de Firebase no están corriendo.');
    console.error('   Ejecuta en otra terminal: pnpm firebase:emulators');
    console.error('   O usa: firebase emulators:start');
    process.exit(1);
  }

  console.log('✅ Emuladores de Firebase detectados\n');

  // 2. Sembrar datos de prueba
  console.log('🌱 Sembrando datos de prueba...');
  try {
    const { execSync } = await import('child_process');
    execSync('node scripts/seed-test-data.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('⚠️  Error sembrando datos (puede que ya existan):', error.message);
  }

  console.log('\n✅ Entorno de tests listo\n');
}

async function checkEmulators() {
  const endpoints = [
    { name: 'Auth', url: 'http://localhost:9099' },
    { name: 'Firestore', url: 'http://localhost:8080' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, { method: 'GET' });
      // Los emuladores responden aunque sea con error, lo importante es que respondan
      console.log(`  ✓ ${endpoint.name} emulator running on ${endpoint.url}`);
    } catch (error) {
      console.error(`  ✗ ${endpoint.name} emulator NOT running on ${endpoint.url}`);
      return false;
    }
  }

  return true;
}

export default globalSetup;

/**
 * Script para ejecutar tests E2E de forma completamente automática
 * - Arranca emuladores de Firebase
 * - Espera a que estén listos
 * - Siembra datos de prueba
 * - Ejecuta los tests
 * - Apaga los emuladores
 */
import { spawn, execSync } from 'child_process';
import { setTimeout } from 'timers/promises';

const EMULATOR_STARTUP_TIMEOUT = 60000; // 60 segundos max para arrancar
const EMULATOR_CHECK_INTERVAL = 1000; // Comprobar cada segundo

let emulatorsProcess = null;

async function checkEmulatorReady(port, name) {
  try {
    const response = await fetch(`http://localhost:${port}`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return true;
  } catch {
    return false;
  }
}

async function waitForEmulators() {
  const emulators = [
    { name: 'Auth', port: 9099 },
    { name: 'Firestore', port: 8080 }
  ];

  const startTime = Date.now();

  while (Date.now() - startTime < EMULATOR_STARTUP_TIMEOUT) {
    let allReady = true;

    for (const emu of emulators) {
      const ready = await checkEmulatorReady(emu.port, emu.name);
      if (!ready) {
        allReady = false;
        break;
      }
    }

    if (allReady) {
      console.log('  ✓ Todos los emuladores listos');
      return true;
    }

    await setTimeout(EMULATOR_CHECK_INTERVAL);
  }

  return false;
}

async function startEmulators() {
  console.log('🔥 Arrancando emuladores de Firebase...');

  emulatorsProcess = spawn('npx', ['firebase', 'emulators:start'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    detached: false
  });

  // Log de emuladores en modo silencioso (solo errores críticos)
  emulatorsProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('Error') || msg.includes('error')) {
      console.error('  [Emulator Error]', msg);
    }
  });

  emulatorsProcess.on('error', (error) => {
    console.error('❌ Error arrancando emuladores:', error);
  });

  // Esperar a que los emuladores estén listos
  const ready = await waitForEmulators();

  if (!ready) {
    console.error('❌ Timeout esperando emuladores');
    cleanup();
    process.exit(1);
  }

  return true;
}

async function seedTestData() {
  console.log('🌱 Sembrando datos de prueba...');
  try {
    execSync('node scripts/seed-test-data.js', {
      stdio: 'inherit',
      env: {
        ...process.env,
        FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
        FIRESTORE_EMULATOR_HOST: 'localhost:8080'
      }
    });
    return true;
  } catch (error) {
    console.error('⚠️  Error sembrando datos:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Ejecutando tests E2E...\n');
  try {
    execSync('npx playwright test', {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        USE_EMULATORS: 'true'
      }
    });
    return true;
  } catch (error) {
    // Playwright sale con código de error si hay tests fallidos
    return false;
  }
}

function cleanup() {
  if (emulatorsProcess) {
    console.log('\n🛑 Apagando emuladores...');

    // En Windows usamos taskkill, en Unix kill del grupo de procesos
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /pid ${emulatorsProcess.pid} /T /F`, { stdio: 'ignore' });
      } catch {}
    } else {
      try {
        // Matar el proceso y todos sus hijos
        process.kill(-emulatorsProcess.pid, 'SIGTERM');
      } catch {
        try {
          emulatorsProcess.kill('SIGTERM');
        } catch {}
      }
    }

    emulatorsProcess = null;
    console.log('  ✓ Emuladores apagados');
  }
}

// Manejar señales de terminación
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(143);
});

process.on('exit', () => {
  cleanup();
});

// Main
async function main() {
  console.log('\n════════════════════════════════════════');
  console.log('       🧪 Tests E2E - MyHomeCart');
  console.log('════════════════════════════════════════\n');

  try {
    // 1. Arrancar emuladores
    await startEmulators();

    // 2. Sembrar datos
    await seedTestData();

    // 3. Ejecutar tests
    const testsOk = await runTests();

    // 4. Limpiar
    cleanup();

    console.log('\n════════════════════════════════════════');
    if (testsOk) {
      console.log('       ✅ Tests completados con éxito');
    } else {
      console.log('       ❌ Algunos tests fallaron');
    }
    console.log('════════════════════════════════════════\n');

    process.exit(testsOk ? 0 : 1);

  } catch (error) {
    console.error('❌ Error ejecutando tests:', error);
    cleanup();
    process.exit(1);
  }
}

main();

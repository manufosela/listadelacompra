/**
 * Convierte la salida de `firebase apps:sdkconfig web <appId>` en un fichero
 * .env con las variables que espera scripts/generate-firebase-config.js.
 *
 * Lee el JSON por stdin y escribe las líneas .env por stdout:
 *   firebase apps:sdkconfig web APP_ID | node scripts/sdkconfig-to-env.mjs > .env
 *
 * La salida del CLI puede venir envuelta (como objeto { sdkConfig: {...} },
 * como asignación JS `const firebaseConfig = {...};`, o como JSON pelado),
 * así que extraemos el primer objeto JSON que aparezca.
 */
import { readFileSync } from 'node:fs';

const raw = readFileSync(0, 'utf8');

const firstBrace = raw.indexOf('{');
const lastBrace = raw.lastIndexOf('}');
if (firstBrace === -1 || lastBrace === -1) {
  console.error('No se encontró un objeto JSON en la entrada.');
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
} catch (error) {
  console.error('No se pudo parsear la configuración:', error.message);
  process.exit(1);
}

const cfg = parsed.sdkConfig ?? parsed;

const map = {
  FIREBASE_API_KEY: cfg.apiKey,
  FIREBASE_AUTH_DOMAIN: cfg.authDomain,
  FIREBASE_PROJECT_ID: cfg.projectId,
  FIREBASE_STORAGE_BUCKET: cfg.storageBucket,
  FIREBASE_MESSAGING_SENDER_ID: cfg.messagingSenderId,
  FIREBASE_APP_ID: cfg.appId,
};

const missing = Object.entries(map)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missing.length > 0) {
  console.error('Faltan campos en la configuración:', missing.join(', '));
  process.exit(1);
}

const lines = [
  '# Generado por scripts/setup-firebase.sh a partir de firebase apps:sdkconfig',
  ...Object.entries(map).map(([key, value]) => `${key}=${value}`),
];
if (cfg.measurementId) {
  lines.push(`FIREBASE_MEASUREMENT_ID=${cfg.measurementId}`);
}
lines.push('NODE_ENV=development');

process.stdout.write(lines.join('\n') + '\n');

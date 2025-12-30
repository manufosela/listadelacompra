/**
 * Genera public/js/firebase-config.js desde variables de entorno
 * Ejecutar: node scripts/generate-firebase-config.js
 */
import { writeFileSync } from 'fs';
import { config } from 'dotenv';

// Cargar .env
config();

// Validar que existen las variables necesarias
const requiredVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

// Variables opcionales
const optionalVars = [
  'FIREBASE_DATABASE_URL',
  'FIREBASE_MEASUREMENT_ID',
  'FIREBASE_DATABASE_ID'  // Para usar DB Firestore alternativa (ej: 'test')
];

const missing = requiredVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('❌ Faltan variables de entorno:', missing.join(', '));
  console.error('   Copia .env.example a .env y configura los valores');
  process.exit(1);
}

// Detectar si estamos en desarrollo
const isDev = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';
const databaseId = process.env.FIREBASE_DATABASE_ID || '(default)';

// Construir config con campos opcionales
const configLines = [
  `  apiKey: "${process.env.FIREBASE_API_KEY}",`,
  `  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",`,
  process.env.FIREBASE_DATABASE_URL ? `  databaseURL: "${process.env.FIREBASE_DATABASE_URL}",` : null,
  `  projectId: "${process.env.FIREBASE_PROJECT_ID}",`,
  `  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",`,
  `  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",`,
  process.env.FIREBASE_MEASUREMENT_ID
    ? `  appId: "${process.env.FIREBASE_APP_ID}",`
    : `  appId: "${process.env.FIREBASE_APP_ID}"`,
  process.env.FIREBASE_MEASUREMENT_ID ? `  measurementId: "${process.env.FIREBASE_MEASUREMENT_ID}"` : null
].filter(Boolean).join('\n');

// Generar contenido del fichero
const fileContent = `// =====================================================
// AUTO-GENERATED - NO EDITAR MANUALMENTE
// Generado por: pnpm run generate:config
// Fecha: ${new Date().toISOString()}
// Entorno: ${process.env.NODE_ENV || 'development'}
// Database: ${databaseId}
// =====================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator, initializeFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getStorage, connectStorageEmulator } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import { getFunctions, connectFunctionsEmulator } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';

const firebaseConfig = {
${configLines}
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Usar base de datos específica si se indica (para tests)
const DATABASE_ID = '${databaseId}';
export const db = DATABASE_ID === '(default)'
  ? getFirestore(app)
  : initializeFirestore(app, {}, DATABASE_ID);

export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west1');

// Info de entorno
export const ENV = {
  isTest: ${isTest},
  isDev: ${isDev},
  databaseId: '${databaseId}'
};

// Conectar a emuladores solo si USE_EMULATORS=true
const USE_EMULATORS = ${process.env.USE_EMULATORS === 'true'};
if (USE_EMULATORS && location.hostname === 'localhost') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('🔧 Firebase conectado a emuladores locales');
}

${isTest ? "console.log('🧪 Modo TEST - usando DB:', DATABASE_ID);" : ''}
`;

// Escribir fichero
writeFileSync('public/js/firebase-config.js', fileContent);
console.log('✅ public/js/firebase-config.js generado correctamente');

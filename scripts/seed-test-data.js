/**
 * Seed de datos de prueba para emuladores de Firebase
 * Ejecutar: node scripts/seed-test-data.js
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Configurar para usar emuladores
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const app = initializeApp({ projectId: 'lista-de-mi-compra' });
const auth = getAuth(app);
const db = getFirestore(app);

// Datos del usuario de prueba
const TEST_USER = {
  email: 'test@test.com',
  password: 'testpassword123',
  displayName: 'Test User'
};

async function seedTestData() {
  console.log('🌱 Sembrando datos de prueba...');

  try {
    // 1. Crear usuario de prueba
    let testUser;
    try {
      testUser = await auth.getUserByEmail(TEST_USER.email);
      console.log('  ✓ Usuario de prueba ya existe');
    } catch {
      testUser = await auth.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        displayName: TEST_USER.displayName,
        emailVerified: true
      });
      console.log('  ✓ Usuario de prueba creado');
    }

    const uid = testUser.uid;

    // 2. Crear documento de usuario en Firestore
    await db.collection('users').doc(uid).set({
      email: TEST_USER.email,
      displayName: TEST_USER.displayName,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });
    console.log('  ✓ Documento de usuario creado');

    // 3. Crear una lista de prueba
    const listRef = db.collection('users').doc(uid).collection('lists').doc('test-list');
    await listRef.set({
      name: 'Lista de Prueba',
      icon: '🧪',
      type: 'agnostic',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('  ✓ Lista de prueba creada');

    // 4. Crear algunos items de prueba
    const itemsRef = listRef.collection('items');

    await itemsRef.doc('item-1').set({
      name: 'Item normal',
      checked: false,
      createdAt: new Date()
    });

    await itemsRef.doc('item-2').set({
      name: 'Sublista de prueba',
      checked: false,
      isChecklist: true,
      checklist: [
        { text: 'Subelemento 1', checked: false },
        { text: 'Subelemento 2', checked: true },
        { text: 'Subelemento 3', checked: false }
      ],
      createdAt: new Date()
    });

    await itemsRef.doc('item-3').set({
      name: 'Item completado',
      checked: true,
      createdAt: new Date()
    });

    console.log('  ✓ Items de prueba creados');

    // 5. Crear una lista de compra
    const shoppingListRef = db.collection('users').doc(uid).collection('lists').doc('shopping-list');
    await shoppingListRef.set({
      name: 'Compra Semanal',
      icon: '🛒',
      type: 'shopping',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const shoppingItemsRef = shoppingListRef.collection('items');
    await shoppingItemsRef.doc('product-1').set({
      name: 'Leche',
      quantity: 2,
      unit: 'litro',
      category: 'lacteos',
      checked: false,
      createdAt: new Date()
    });

    await shoppingItemsRef.doc('product-2').set({
      name: 'Pan',
      quantity: 1,
      unit: 'unidad',
      category: 'panaderia',
      checked: false,
      createdAt: new Date()
    });

    console.log('  ✓ Lista de compra creada');

    console.log('✅ Datos de prueba sembrados correctamente');
    console.log(`   Usuario: ${TEST_USER.email} / ${TEST_USER.password}`);

  } catch (error) {
    console.error('❌ Error sembrando datos:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedTestData();

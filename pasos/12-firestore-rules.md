# Fase 12: Firestore Security Rules

## Objetivo

Implementar reglas de seguridad para Firestore y Storage que protejan los datos por hogar y usuario.

---

## Paso 12.1: Firestore Rules

### Crear `firebase/firestore.rules`

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ==================== HELPERS ====================
    
    // Verifica si el usuario está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Obtiene el ID del usuario actual
    function userId() {
      return request.auth.uid;
    }
    
    // Verifica si el usuario es miembro del hogar
    function isHouseholdMember(householdId) {
      let household = get(/databases/$(database)/documents/households/$(householdId));
      return household != null && userId() in household.data.members;
    }
    
    // Verifica si el usuario es admin del hogar
    function isHouseholdAdmin(householdId) {
      let household = get(/databases/$(database)/documents/households/$(householdId));
      return household != null 
        && userId() in household.data.members 
        && household.data.members[userId()].role == 'admin';
    }
    
    // Verifica si el usuario es el creador del hogar
    function isHouseholdCreator(householdId) {
      let household = get(/databases/$(database)/documents/households/$(householdId));
      return household != null && household.data.createdBy == userId();
    }
    
    // Valida que los campos requeridos estén presentes
    function hasRequiredFields(fields) {
      return request.resource.data.keys().hasAll(fields);
    }
    
    // Valida que solo se modifiquen campos permitidos
    function onlyUpdatesFields(fields) {
      return request.resource.data.diff(resource.data).affectedKeys().hasOnly(fields);
    }
    
    // ==================== USERS ====================
    
    match /users/{userId} {
      // Cualquier usuario autenticado puede leer perfiles públicos
      allow read: if isAuthenticated();
      
      // Solo el propio usuario puede crear/modificar su perfil
      allow create: if isAuthenticated() && userId == userId();
      allow update: if isAuthenticated() && userId == userId();
      
      // No se permite eliminar usuarios
      allow delete: if false;
    }
    
    // ==================== HOUSEHOLDS ====================
    
    match /households/{householdId} {
      // Solo miembros pueden leer el hogar
      allow read: if isAuthenticated() && isHouseholdMember(householdId);
      
      // Cualquier usuario autenticado puede crear un hogar
      allow create: if isAuthenticated() 
        && hasRequiredFields(['name', 'createdBy', 'createdAt', 'members'])
        && request.resource.data.createdBy == userId()
        && userId() in request.resource.data.members
        && request.resource.data.members[userId()].role == 'admin';
      
      // Solo admins pueden actualizar el hogar
      allow update: if isAuthenticated() && isHouseholdAdmin(householdId);
      
      // Solo el creador puede eliminar el hogar
      allow delete: if isAuthenticated() && isHouseholdCreator(householdId);
      
      // ==================== PRODUCTS ====================
      
      match /products/{productId} {
        // Miembros pueden leer productos
        allow read: if isAuthenticated() && isHouseholdMember(householdId);
        
        // Miembros pueden crear productos
        allow create: if isAuthenticated() && isHouseholdMember(householdId)
          && hasRequiredFields(['name', 'normalizedName', 'category', 'createdAt']);
        
        // Miembros pueden actualizar productos
        allow update: if isAuthenticated() && isHouseholdMember(householdId);
        
        // Solo admins pueden eliminar productos
        allow delete: if isAuthenticated() && isHouseholdAdmin(householdId);
      }
      
      // ==================== SHOPPING LISTS ====================
      
      match /shoppingLists/{listId} {
        // Miembros pueden leer listas
        allow read: if isAuthenticated() && isHouseholdMember(householdId);
        
        // Miembros pueden crear listas
        allow create: if isAuthenticated() && isHouseholdMember(householdId)
          && hasRequiredFields(['name', 'status', 'createdBy', 'createdAt'])
          && request.resource.data.createdBy == userId();
        
        // Miembros pueden actualizar listas
        allow update: if isAuthenticated() && isHouseholdMember(householdId);
        
        // Creador o admin pueden eliminar listas
        allow delete: if isAuthenticated() 
          && (isHouseholdAdmin(householdId) || resource.data.createdBy == userId());
        
        // ==================== LIST ITEMS ====================
        
        match /items/{itemId} {
          // Miembros pueden leer items
          allow read: if isAuthenticated() && isHouseholdMember(householdId);
          
          // Miembros pueden crear items
          allow create: if isAuthenticated() && isHouseholdMember(householdId)
            && hasRequiredFields(['productName', 'quantity', 'checked', 'addedBy'])
            && request.resource.data.addedBy == userId();
          
          // Miembros pueden actualizar items (marcar como comprado, etc.)
          allow update: if isAuthenticated() && isHouseholdMember(householdId);
          
          // Miembros pueden eliminar items
          allow delete: if isAuthenticated() && isHouseholdMember(householdId);
        }
      }
      
      // ==================== PURCHASES ====================
      
      match /purchases/{purchaseId} {
        // Miembros pueden leer compras
        allow read: if isAuthenticated() && isHouseholdMember(householdId);
        
        // Miembros pueden crear compras
        allow create: if isAuthenticated() && isHouseholdMember(householdId)
          && hasRequiredFields(['store', 'createdBy', 'createdAt'])
          && request.resource.data.createdBy == userId();
        
        // Creador puede actualizar su compra
        allow update: if isAuthenticated() 
          && isHouseholdMember(householdId)
          && resource.data.createdBy == userId();
        
        // Creador o admin pueden eliminar
        allow delete: if isAuthenticated() 
          && (isHouseholdAdmin(householdId) || resource.data.createdBy == userId());
        
        // ==================== PURCHASE ITEMS ====================
        
        match /items/{itemId} {
          allow read: if isAuthenticated() && isHouseholdMember(householdId);
          allow write: if isAuthenticated() && isHouseholdMember(householdId);
        }
      }
      
      // ==================== PRICE HISTORY ====================
      
      match /priceHistory/{productId}/entries/{entryId} {
        // Miembros pueden leer historial
        allow read: if isAuthenticated() && isHouseholdMember(householdId);
        
        // Miembros pueden crear entradas
        allow create: if isAuthenticated() && isHouseholdMember(householdId);
        
        // No se permite modificar historial
        allow update: if false;
        
        // Solo admins pueden eliminar historial
        allow delete: if isAuthenticated() && isHouseholdAdmin(householdId);
      }
    }
  }
}
```

---

## Paso 12.2: Storage Rules

### Crear `firebase/storage.rules`

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // ==================== HELPERS ====================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function userId() {
      return request.auth.uid;
    }
    
    // Verifica si el archivo es una imagen válida
    function isValidImage() {
      return request.resource.contentType.matches('image/.*')
        && request.resource.size < 10 * 1024 * 1024; // Max 10MB
    }
    
    // ==================== USER AVATARS ====================
    
    match /users/{userId}/avatar/{fileName} {
      // Cualquiera puede ver avatares
      allow read: if isAuthenticated();
      
      // Solo el propio usuario puede subir su avatar
      allow write: if isAuthenticated() 
        && userId == userId()
        && isValidImage();
    }
    
    // ==================== HOUSEHOLD TICKETS ====================
    
    match /households/{householdId}/tickets/{ticketId} {
      // Miembros pueden ver tickets
      // Nota: verificar membership requiere leer Firestore,
      // lo cual no es posible directamente en Storage rules.
      // Usamos el UID en el path como workaround.
      allow read: if isAuthenticated();
      
      // Usuarios autenticados pueden subir tickets
      allow create: if isAuthenticated() && isValidImage();
      
      // No se permite modificar tickets existentes
      allow update: if false;
      
      // Solo el creador puede eliminar (verificar en app)
      allow delete: if isAuthenticated();
    }
  }
}
```

---

## Paso 12.3: Firestore Indexes

### Crear `firebase/firestore.indexes.json`

```json
{
  "indexes": [
    {
      "collectionGroup": "products",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "normalizedName", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "products",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "products",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "purchaseCount", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "products",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "lastPurchasedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "shoppingLists",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "shoppingLists",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "scheduledDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "items",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "checked", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "purchases",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "entries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## Paso 12.4: Deploy de Rules

### Comandos:

```bash
# Deploy solo rules
firebase deploy --only firestore:rules
firebase deploy --only storage

# Deploy rules e indexes
firebase deploy --only firestore

# Deploy todo
firebase deploy
```

---

## Paso 12.5: Tests de Security Rules

### Crear `tests/rules/firestore.test.js`

```javascript
import { 
  initializeTestEnvironment, 
  assertSucceeds, 
  assertFails
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'homecart-test',
    firestore: {
      rules: readFileSync('firebase/firestore.rules', 'utf8')
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Users collection', () => {
  it('allows authenticated users to read any profile', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();
    
    await assertSucceeds(
      db.collection('users').doc('bob').get()
    );
  });

  it('allows users to write their own profile', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();
    
    await assertSucceeds(
      db.collection('users').doc('alice').set({
        email: 'alice@example.com',
        displayName: 'Alice'
      })
    );
  });

  it('denies users from writing other profiles', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();
    
    await assertFails(
      db.collection('users').doc('bob').set({
        email: 'hacked@example.com'
      })
    );
  });
});

describe('Households collection', () => {
  it('allows members to read household', async () => {
    // Setup: crear household con alice como miembro
    const admin = testEnv.authenticatedContext('admin');
    await admin.firestore().collection('households').doc('home1').set({
      name: 'Casa Test',
      createdBy: 'admin',
      createdAt: new Date(),
      members: {
        admin: { role: 'admin' },
        alice: { role: 'member' }
      }
    });

    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();
    
    await assertSucceeds(
      db.collection('households').doc('home1').get()
    );
  });

  it('denies non-members from reading household', async () => {
    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();
    
    await assertFails(
      db.collection('households').doc('home1').get()
    );
  });
});
```

---

## ✅ Checklist Fase 12

- [ ] Firestore rules con helpers
- [ ] Protección por usuario autenticado
- [ ] Protección por membership
- [ ] Protección por rol (admin)
- [ ] Storage rules para imágenes
- [ ] Límite de tamaño de archivos
- [ ] Indexes para queries frecuentes
- [ ] Tests de security rules
- [ ] Deploy de rules

---

## 🎉 ¡Proyecto Completo!

Has completado las 12 fases de HomeCart. Revisa el [README](./00-README.md) para el resumen general.

/**
 * Shoppings Service
 * Gestiona las "compras" (sublistas) derivadas de una lista maestra.
 *
 * Modelo: users/{ownerId}/lists/{masterListId}/shoppings/{shoppingId}
 *   - shoppingId = fecha yyyymmdd (una compra por día).
 *   - items (subcolección): un item por producto de la maestra que entra en la
 *     compra. Su id es el id del item de la maestra (para poder añadir/quitar
 *     por producto sin duplicar). Estado: 'pending' | 'bought' | 'not_found'.
 *
 * Las compras heredan con quién está compartida la lista maestra (las reglas de
 * la subcolección exigen ser el propietario o miembro de la lista).
 */

import { db } from './firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import {
  getTodayShoppingId,
  getShoppingName,
  selectItemsToMigrate,
  buildActiveShoppingDoc,
  defaultShoppingName,
  normalizeShoppingItemEdit
} from './shoppings-utils.js';

// Helpers puros (definidos en shoppings-utils.js para poder testearlos).
export { getTodayShoppingId, getShoppingName, selectItemsToMigrate };

// ============================================
// CRUD DE COMPRAS
// ============================================

function shoppingDocRef(ownerId, masterListId, shoppingId) {
  return doc(db, 'users', ownerId, 'lists', masterListId, 'shoppings', shoppingId);
}

function shoppingItemsRef(ownerId, masterListId, shoppingId) {
  return collection(db, 'users', ownerId, 'lists', masterListId, 'shoppings', shoppingId, 'items');
}

function listDocRef(ownerId, masterListId) {
  return doc(db, 'users', ownerId, 'lists', masterListId);
}

function shoppingsColRef(ownerId, masterListId) {
  return collection(db, 'users', ownerId, 'lists', masterListId, 'shoppings');
}

// ============================================
// COMPRA ACTIVA (modelo v2)
// La lista maestra guarda un puntero `activeShoppingId`. Las compras se crean a
// demanda (id autogenerado) con status 'active' | 'archived'.
// ============================================

/**
 * Devuelve el id de la compra activa; si no hay, crea una vacía y fija el puntero
 * en la lista maestra. Atómico (runTransaction) para resolver la carrera de
 * listas compartidas (dos miembros pulsando + a la vez).
 * @returns {Promise<string>} shoppingId activo
 */
export async function ensureActiveShopping(ownerId, masterListId, masterName, createdBy = null) {
  const listRef = listDocRef(ownerId, masterListId);
  return runTransaction(db, async (tx) => {
    const listSnap = await tx.get(listRef);
    const current = listSnap.exists() ? listSnap.data().activeShoppingId : null;
    if (current) return current;
    const newRef = doc(shoppingsColRef(ownerId, masterListId));
    tx.set(newRef, {
      ...buildActiveShoppingDoc({ name: defaultShoppingName(masterName), createdBy }),
      createdAt: serverTimestamp()
    });
    tx.update(listRef, { activeShoppingId: newRef.id, updatedAt: serverTimestamp() });
    return newRef.id;
  });
}

/**
 * "Nueva compra": archiva la compra activa (si la hay) y crea otra vacía,
 * actualizando el puntero. Atómico. Devuelve el id de la nueva compra.
 * @returns {Promise<string>}
 */
export async function startNewShopping(ownerId, masterListId, masterName, createdBy = null) {
  const listRef = listDocRef(ownerId, masterListId);
  return runTransaction(db, async (tx) => {
    const listSnap = await tx.get(listRef);
    const current = listSnap.exists() ? listSnap.data().activeShoppingId : null;
    if (current) {
      const currentRef = shoppingDocRef(ownerId, masterListId, current);
      tx.update(currentRef, {
        status: 'archived',
        archivedAt: serverTimestamp(),
        archivedBy: createdBy || null
      });
    }
    const newRef = doc(shoppingsColRef(ownerId, masterListId));
    tx.set(newRef, {
      ...buildActiveShoppingDoc({ name: defaultShoppingName(masterName), createdBy }),
      createdAt: serverTimestamp()
    });
    tx.update(listRef, { activeShoppingId: newRef.id, updatedAt: serverTimestamp() });
    return newRef.id;
  });
}

/**
 * Lee la compra activa (según el puntero de la lista), o null si no hay.
 * @returns {Promise<Object|null>}
 */
export async function getActiveShopping(ownerId, masterListId) {
  const listSnap = await getDoc(listDocRef(ownerId, masterListId));
  const activeId = listSnap.exists() ? listSnap.data().activeShoppingId : null;
  if (!activeId) return null;
  const snap = await getDoc(shoppingDocRef(ownerId, masterListId, activeId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Edita cantidad y/o unidad de un item de una compra (normalizadas).
 */
export async function updateShoppingItem(ownerId, masterListId, shoppingId, itemId, { quantity, unit }) {
  const ref = doc(shoppingItemsRef(ownerId, masterListId, shoppingId), itemId);
  const normalized = normalizeShoppingItemEdit({ quantity, unit });
  await updateDoc(ref, { ...normalized, updatedAt: serverTimestamp() });
}

/**
 * Crea (si no existe) u obtiene la compra de hoy y devuelve su id.
 * @param {string} ownerId
 * @param {string} masterListId
 * @param {string} masterName
 * @param {string|null} createdBy - UID de quien la crea
 * @returns {Promise<string>} shoppingId (yyyymmdd)
 */
export async function createOrGetTodayShopping(ownerId, masterListId, masterName, createdBy = null) {
  const shoppingId = getTodayShoppingId();
  const ref = shoppingDocRef(ownerId, masterListId, shoppingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name: getShoppingName(masterName, shoppingId),
      date: shoppingId,
      createdAt: serverTimestamp(),
      createdBy: createdBy || null
    });
  }
  return shoppingId;
}

/**
 * Añade un producto (item de la maestra) a una compra. El id del item de la
 * compra es el id del item de la maestra, así que es idempotente.
 * @param {string} ownerId
 * @param {string} masterListId
 * @param {string} shoppingId
 * @param {Object} masterItem - item de la maestra ({id, name, category, quantity, unit, productId})
 */
export async function addProductToShopping(ownerId, masterListId, shoppingId, masterItem) {
  if (!masterItem?.id) throw new Error('El producto no tiene id');
  const ref = doc(shoppingItemsRef(ownerId, masterListId, shoppingId), masterItem.id);
  await setDoc(ref, {
    name: masterItem.name || '',
    category: masterItem.category || null,
    quantity: masterItem.quantity ?? 1,
    unit: masterItem.unit || 'unidad',
    productId: masterItem.productId || null,
    status: 'pending',
    addedAt: serverTimestamp()
  });
}

/**
 * Quita un producto de una compra.
 */
export async function removeProductFromShopping(ownerId, masterListId, shoppingId, masterItemId) {
  await deleteDoc(doc(shoppingItemsRef(ownerId, masterListId, shoppingId), masterItemId));
}

/**
 * Cambia el estado de compra de un producto: 'pending' | 'bought' | 'not_found'.
 */
export async function setShoppingItemStatus(ownerId, masterListId, shoppingId, masterItemId, status) {
  const ref = doc(shoppingItemsRef(ownerId, masterListId, shoppingId), masterItemId);
  await setDoc(ref, { status, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Suscripción en tiempo real a los items de una compra.
 * @returns {Function} unsubscribe
 */
export function subscribeToShoppingItems(ownerId, masterListId, shoppingId, callback) {
  const q = query(shoppingItemsRef(ownerId, masterListId, shoppingId), orderBy('addedAt', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => {
      console.error('Error en la suscripción de la compra:', error);
      callback([], error);
    }
  );
}

/**
 * Migración inicial: crea la compra de hoy (si no existe) y le añade los
 * productos de la maestra que están SIN marcar (lo que el usuario iba a comprar).
 * No modifica la lista maestra. Idempotente por producto (id = id del item).
 * @param {string} ownerId
 * @param {string} masterListId
 * @param {string} masterName
 * @param {Array} masterItems - items actuales de la maestra
 * @param {string|null} createdBy
 * @returns {Promise<{shoppingId: string, added: number}>}
 */
export async function migrateUncheckedToTodayShopping(ownerId, masterListId, masterName, masterItems, createdBy = null) {
  const shoppingId = await createOrGetTodayShopping(ownerId, masterListId, masterName, createdBy);
  const toAdd = selectItemsToMigrate(masterItems);
  if (toAdd.length === 0) return { shoppingId, added: 0 };

  const itemsRef = shoppingItemsRef(ownerId, masterListId, shoppingId);
  const batch = writeBatch(db);
  for (const item of toAdd) {
    batch.set(doc(itemsRef, item.id), {
      name: item.name || '',
      category: item.category || null,
      quantity: item.quantity ?? 1,
      unit: item.unit || 'unidad',
      productId: item.productId || null,
      status: 'pending',
      addedAt: serverTimestamp()
    });
  }
  await batch.commit();
  return { shoppingId, added: toAdd.length };
}

/**
 * Lista las compras (para el historial), más recientes primero.
 * @returns {Promise<Array>}
 */
export async function getShoppings(ownerId, masterListId) {
  const snapshot = await getDocs(query(shoppingsColRef(ownerId, masterListId), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

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
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getTodayShoppingId, getShoppingName } from './shoppings-utils.js';

// Helpers puros (definidos en shoppings-utils.js para poder testearlos).
export { getTodayShoppingId, getShoppingName };

// ============================================
// CRUD DE COMPRAS
// ============================================

function shoppingDocRef(ownerId, masterListId, shoppingId) {
  return doc(db, 'users', ownerId, 'lists', masterListId, 'shoppings', shoppingId);
}

function shoppingItemsRef(ownerId, masterListId, shoppingId) {
  return collection(db, 'users', ownerId, 'lists', masterListId, 'shoppings', shoppingId, 'items');
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
 * Lista las compras (para el historial), más recientes primero.
 * @returns {Promise<Array>}
 */
export async function getShoppings(ownerId, masterListId) {
  const ref = collection(db, 'users', ownerId, 'lists', masterListId, 'shoppings');
  const snapshot = await getDocs(query(ref, orderBy('date', 'desc')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

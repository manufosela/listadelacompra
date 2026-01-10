/**
 * Realtime Sync Service
 * Gestiona suscripciones en tiempo real a Firestore.
 */

import { db } from './firebase-config.js';
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getCurrentUser } from './auth.js';

// Almacenar suscripciones activas para poder cancelarlas
const activeSubscriptions = new Map();

/**
 * Cancela una suscripción activa
 */
export function unsubscribe(key) {
  const unsub = activeSubscriptions.get(key);
  if (unsub) {
    unsub();
    activeSubscriptions.delete(key);
  }
}

/**
 * Cancela todas las suscripciones activas
 */
export function unsubscribeAll() {
  activeSubscriptions.forEach((unsub) => unsub());
  activeSubscriptions.clear();
}

// ============================================
// LISTAS DE LA COMPRA
// ============================================

/**
 * Suscribe a las listas de un grupo
 */
export function subscribeToLists(groupId, callback) {
  const key = `lists-${groupId}`;
  unsubscribe(key);

  const listsRef = collection(db, 'groups', groupId, 'shoppingLists');
  const q = query(listsRef, orderBy('scheduledDate', 'asc'));

  const unsub = onSnapshot(q, (snapshot) => {
    const lists = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledDate: doc.data().scheduledDate?.toDate?.(),
      createdAt: doc.data().createdAt?.toDate?.(),
      completedAt: doc.data().completedAt?.toDate?.()
    }));
    callback(lists);
  }, (error) => {
    console.error('Error subscribing to lists:', error);
    callback([], error);
  });

  activeSubscriptions.set(key, unsub);
  return () => unsubscribe(key);
}

/**
 * Suscribe a una lista específica
 */
export function subscribeToList(groupId, listId, callback) {
  const key = `list-${listId}`;
  unsubscribe(key);

  const listRef = doc(db, 'groups', groupId, 'shoppingLists', listId);

  const unsub = onSnapshot(listRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        id: docSnap.id,
        ...data,
        scheduledDate: data.scheduledDate?.toDate?.(),
        createdAt: data.createdAt?.toDate?.(),
        completedAt: data.completedAt?.toDate?.()
      });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to list:', error);
    callback(null, error);
  });

  activeSubscriptions.set(key, unsub);
  return () => unsubscribe(key);
}

/**
 * Suscribe a los items de una lista
 */
export function subscribeToListItems(groupId, listId, callback) {
  const key = `items-${listId}`;
  unsubscribe(key);

  const itemsRef = collection(
    db,
    'groups', groupId,
    'shoppingLists', listId,
    'items'
  );
  const q = query(itemsRef, orderBy('createdAt', 'asc'));

  const unsub = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.(),
      checkedAt: doc.data().checkedAt?.toDate?.()
    }));
    callback(items);
  }, (error) => {
    console.error('Error subscribing to items:', error);
    callback([], error);
  });

  activeSubscriptions.set(key, unsub);
  return () => unsubscribe(key);
}

// ============================================
// OPERACIONES CRUD DE LISTAS
// ============================================

/**
 * Crea una nueva lista
 */
export async function createList(groupId, listData) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const listsRef = collection(db, 'groups', groupId, 'shoppingLists');

  const docRef = await addDoc(listsRef, {
    name: listData.name,
    store: listData.store || '',
    scheduledDate: listData.scheduledDate
      ? Timestamp.fromDate(new Date(listData.scheduledDate))
      : null,
    status: 'pending',
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    completedAt: null,
    isRecurring: listData.isRecurring || false,
    recurringPattern: listData.recurringPattern || null
  });

  return docRef.id;
}

/**
 * Actualiza una lista
 */
export async function updateList(groupId, listId, updates) {
  const listRef = doc(db, 'groups', groupId, 'shoppingLists', listId);

  if (updates.scheduledDate && typeof updates.scheduledDate === 'string') {
    updates.scheduledDate = Timestamp.fromDate(new Date(updates.scheduledDate));
  }

  await updateDoc(listRef, updates);
}

/**
 * Elimina una lista y todos sus items
 */
export async function deleteList(groupId, listId) {
  const itemsRef = collection(
    db,
    'groups', groupId,
    'shoppingLists', listId,
    'items'
  );

  const itemsSnap = await getDocs(itemsRef);
  const batch = writeBatch(db);

  itemsSnap.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  const listRef = doc(db, 'groups', groupId, 'shoppingLists', listId);
  batch.delete(listRef);

  await batch.commit();
}

/**
 * Marca una lista como completada
 */
export async function completeList(groupId, listId) {
  await updateList(groupId, listId, {
    status: 'completed',
    completedAt: serverTimestamp()
  });
}

/**
 * Cambia el estado de la lista a "comprando"
 */
export async function startShopping(groupId, listId) {
  await updateList(groupId, listId, {
    status: 'shopping'
  });
}

// ============================================
// OPERACIONES CRUD DE ITEMS
// ============================================

/**
 * Añade un item a la lista
 */
export async function addListItem(groupId, listId, itemData) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const itemsRef = collection(
    db,
    'groups', groupId,
    'shoppingLists', listId,
    'items'
  );

  const docRef = await addDoc(itemsRef, {
    productId: itemData.productId || null,
    productName: itemData.productName,
    quantity: itemData.quantity || 1,
    unit: itemData.unit || 'unidad',
    checked: false,
    checkedBy: null,
    checkedAt: null,
    addedBy: user.uid,
    notes: itemData.notes || '',
    category: itemData.category || 'otros',
    createdAt: serverTimestamp()
  });

  return docRef.id;
}

/**
 * Actualiza un item
 */
export async function updateListItem(groupId, listId, itemId, updates) {
  const itemRef = doc(
    db,
    'groups', groupId,
    'shoppingLists', listId,
    'items', itemId
  );

  await updateDoc(itemRef, updates);
}

/**
 * Marca/desmarca un item
 */
export async function toggleItemChecked(groupId, listId, itemId, checked) {
  const user = getCurrentUser();

  const updates = {
    checked,
    checkedBy: checked ? user?.uid : null,
    checkedAt: checked ? serverTimestamp() : null
  };

  await updateListItem(groupId, listId, itemId, updates);
}

/**
 * Elimina un item
 */
export async function removeListItem(groupId, listId, itemId) {
  const itemRef = doc(
    db,
    'groups', groupId,
    'shoppingLists', listId,
    'items', itemId
  );

  await deleteDoc(itemRef);
}

/**
 * Añade múltiples items de una vez
 */
export async function addMultipleItems(groupId, listId, items) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const batch = writeBatch(db);
  const itemsRef = collection(
    db,
    'groups', groupId,
    'shoppingLists', listId,
    'items'
  );

  items.forEach(item => {
    const newItemRef = doc(itemsRef);
    batch.set(newItemRef, {
      productId: item.productId || null,
      productName: item.productName,
      quantity: item.quantity || 1,
      unit: item.unit || 'unidad',
      checked: false,
      checkedBy: null,
      checkedAt: null,
      addedBy: user.uid,
      notes: item.notes || '',
      category: item.category || 'otros',
      createdAt: serverTimestamp()
    });
  });

  await batch.commit();
}

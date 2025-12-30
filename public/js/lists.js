/**
 * Lists Service
 * Gestiona listas de compra con cache optimizado.
 */

import { db } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getCachedOrFetch, setInCache, invalidateCache } from './cache.js';

/**
 * Obtiene las listas del usuario (con cache)
 * @param {Object} user - Usuario (opcional, si no se pasa usa getCurrentUser)
 * @param {boolean} forceRefresh - Forzar recarga
 * @returns {Promise<Array>} Lista de listas
 */
export async function getUserLists(user = null, forceRefresh = false) {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return [];

  if (forceRefresh) {
    invalidateCache('lists', currentUser.uid);
  }

  return getCachedOrFetch('lists', currentUser.uid, async () => {
    const listsRef = collection(db, 'users', currentUser.uid, 'lists');
    const q = query(listsRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });
}

/**
 * Obtiene una lista por ID (con cache)
 * @param {string} listId - ID de la lista
 * @param {boolean} forceRefresh - Forzar recarga
 * @returns {Promise<Object|null>} Lista o null
 */
export async function getList(listId, forceRefresh = false) {
  const user = getCurrentUser();
  if (!user || !listId) return null;

  const cacheKey = `${user.uid}_${listId}`;

  if (forceRefresh) {
    invalidateCache('list', cacheKey);
  }

  return getCachedOrFetch('list', cacheKey, async () => {
    const listRef = doc(db, 'users', user.uid, 'lists', listId);
    const listDoc = await getDoc(listRef);

    if (listDoc.exists()) {
      return { id: listDoc.id, ...listDoc.data() };
    }
    return null;
  }, { ttl: 60 * 1000 }); // 1 minuto para listas individuales
}

/**
 * Crea una nueva lista
 * @param {Object} listData - Datos de la lista
 * @returns {Promise<Object>} Lista creada
 */
export async function createList(listData) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const listsRef = collection(db, 'users', user.uid, 'lists');

  const newList = {
    ...listData,
    itemCount: 0,
    closed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: user.uid
  };

  const docRef = await addDoc(listsRef, newList);

  // Invalidar cache de listas
  invalidateCache('lists', user.uid);

  return { id: docRef.id, ...newList };
}

/**
 * Actualiza una lista
 * @param {string} listId - ID de la lista
 * @param {Object} updates - Campos a actualizar
 */
export async function updateList(listId, updates) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const listRef = doc(db, 'users', user.uid, 'lists', listId);
  await updateDoc(listRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });

  // Invalidar caches
  invalidateCache('lists', user.uid);
  invalidateCache('list', `${user.uid}_${listId}`);
}

/**
 * Elimina una lista
 * @param {string} listId - ID de la lista
 */
export async function deleteList(listId) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const listRef = doc(db, 'users', user.uid, 'lists', listId);
  await deleteDoc(listRef);

  // Invalidar caches
  invalidateCache('lists', user.uid);
  invalidateCache('list', `${user.uid}_${listId}`);
}

/**
 * Obtiene listas filtradas por grupo (con cache)
 * @param {string} groupId - ID del grupo
 * @returns {Promise<Array>} Listas del grupo
 */
export async function getListsByGroup(groupId) {
  const lists = await getUserLists();
  return lists.filter(list => list.groupIds?.includes(groupId));
}

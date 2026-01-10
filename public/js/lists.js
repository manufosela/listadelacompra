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
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getCurrentGroupId } from './group.js';
import { getCachedOrFetch, invalidateCache } from './cache.js';

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
 * @param {Array} members - UIDs de miembros con acceso (opcional)
 * @returns {Promise<Object>} Lista creada
 */
export async function createList(listData, members = []) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const listsRef = collection(db, 'users', user.uid, 'lists');

  // Asegurar que el propietario siempre está en members
  const allMembers = [user.uid, ...members.filter(m => m !== user.uid)];

  const newList = {
    ...listData,
    ownerId: user.uid,
    ownerName: user.displayName || user.email?.split('@')[0] || 'Usuario',
    members: allMembers,
    itemCount: 0,
    closed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: user.uid
  };

  const docRef = await addDoc(listsRef, newList);

  // Si hay miembros adicionales, crear referencia compartida en el grupo
  if (members.length > 0) {
    const groupId = getCurrentGroupId();
    if (groupId) {
      await createSharedListRef(groupId, docRef.id, newList);
    }
  }

  // Invalidar cache de listas
  invalidateCache('lists', user.uid);

  return { id: docRef.id, ...newList };
}

/**
 * Crea una referencia de lista compartida en el grupo
 * @param {string} groupId - ID del grupo
 * @param {string} listId - ID de la lista
 * @param {Object} listData - Datos de la lista
 */
export async function createSharedListRef(groupId, listId, listData) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const refDoc = doc(db, 'groups', groupId, 'sharedListRefs', listId);

  await setDoc(refDoc, {
    listId,
    ownerId: user.uid,
    ownerName: listData.ownerName || user.displayName || 'Usuario',
    name: listData.name,
    icon: listData.icon || '🛒',
    members: listData.members || [user.uid],
    updatedAt: serverTimestamp()
  });
}

/**
 * Actualiza los miembros de una lista (operación atómica)
 * @param {string} listId - ID de la lista
 * @param {Array} members - Nuevos miembros (UIDs)
 */
export async function updateListMembers(listId, members) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  // Asegurar que el propietario siempre está
  const allMembers = [user.uid, ...members.filter(m => m !== user.uid)];

  const groupId = getCurrentGroupId();
  const listRef = doc(db, 'users', user.uid, 'lists', listId);

  // Si no hay grupo, solo actualizar la lista
  if (!groupId) {
    await updateDoc(listRef, {
      members: allMembers,
      updatedAt: serverTimestamp()
    });
    invalidateCache('lists', user.uid);
    invalidateCache('list', `${user.uid}_${listId}`);
    return;
  }

  // Leer datos necesarios antes del batch
  const listSnap = await getDoc(listRef);
  if (!listSnap.exists()) {
    throw new Error('Lista no encontrada');
  }
  const listData = listSnap.data();

  // Usar batch para operación atómica
  const batch = writeBatch(db);

  // 1. Actualizar lista
  batch.update(listRef, {
    members: allMembers,
    updatedAt: serverTimestamp()
  });

  // 2. Crear/actualizar referencia compartida si hay miembros adicionales
  if (allMembers.length > 1) {
    const refDoc = doc(db, 'groups', groupId, 'sharedListRefs', listId);
    batch.set(refDoc, {
      listId,
      ownerId: user.uid,
      ownerName: listData.ownerName || user.displayName || 'Usuario',
      name: listData.name,
      icon: listData.icon || '🛒',
      members: allMembers,
      updatedAt: serverTimestamp()
    }, { merge: true }); // merge:true para crear o actualizar
  }

  // Ejecutar batch (todo o nada)
  await batch.commit();

  // Invalidar caches solo si el batch tuvo éxito
  invalidateCache('lists', user.uid);
  invalidateCache('list', `${user.uid}_${listId}`);
}

/**
 * Obtiene listas compartidas conmigo en el grupo actual
 * @returns {Promise<Array>} Referencias de listas compartidas
 */
export async function getSharedListsForUser() {
  const user = getCurrentUser();
  const groupId = getCurrentGroupId();

  if (!user || !groupId) return [];

  const refsRef = collection(db, 'groups', groupId, 'sharedListRefs');
  const q = query(refsRef, where('members', 'array-contains', user.uid));
  const snapshot = await getDocs(q);

  // Filtrar listas que no son mías
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(ref => ref.ownerId !== user.uid);
}

/**
 * Obtiene una lista compartida (de otro usuario)
 * @param {string} ownerId - ID del propietario
 * @param {string} listId - ID de la lista
 * @returns {Promise<Object|null>} Lista o null
 */
export async function getSharedList(ownerId, listId) {
  const user = getCurrentUser();
  if (!user || !ownerId || !listId) return null;

  const listRef = doc(db, 'users', ownerId, 'lists', listId);
  const listSnap = await getDoc(listRef);

  if (listSnap.exists()) {
    return { id: listSnap.id, ...listSnap.data() };
  }
  return null;
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
    updatedAt: serverTimestamp(),
    updatedBy: user.uid
  });

  // Invalidar caches
  invalidateCache('lists', user.uid);
  invalidateCache('list', `${user.uid}_${listId}`);
}

/**
 * Archiva una lista
 * @param {string} listId - ID de la lista
 */
export async function archiveList(listId) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const listRef = doc(db, 'users', user.uid, 'lists', listId);
  await updateDoc(listRef, {
    closed: true,
    archivedAt: serverTimestamp(),
    archivedBy: user.uid,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid
  });

  // Invalidar caches
  invalidateCache('lists', user.uid);
  invalidateCache('list', `${user.uid}_${listId}`);
}

/**
 * Restaura una lista archivada
 * @param {string} listId - ID de la lista
 */
export async function restoreList(listId) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const listRef = doc(db, 'users', user.uid, 'lists', listId);
  await updateDoc(listRef, {
    closed: false,
    archivedAt: null,
    archivedBy: null,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid
  });

  // Invalidar caches
  invalidateCache('lists', user.uid);
  invalidateCache('list', `${user.uid}_${listId}`);
}

/**
 * Clona una lista existente (crea una nueva con los mismos items)
 * @param {string} sourceListId - ID de la lista a clonar
 * @param {string} sourceOwnerId - ID del propietario de la lista origen (opcional, para listas compartidas)
 * @param {string} newName - Nombre para la nueva lista (opcional)
 * @returns {Promise<Object>} Nueva lista creada
 */
export async function cloneList(sourceListId, sourceOwnerId = null, newName = null) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const ownerId = sourceOwnerId || user.uid;
  const sourceListRef = doc(db, 'users', ownerId, 'lists', sourceListId);
  const sourceListSnap = await getDoc(sourceListRef);

  if (!sourceListSnap.exists()) {
    throw new Error('Lista origen no encontrada');
  }

  const sourceList = sourceListSnap.data();

  // Obtener items de la lista origen
  const itemsRef = collection(db, 'users', ownerId, 'lists', sourceListId, 'items');
  const itemsSnap = await getDocs(itemsRef);
  const sourceItems = itemsSnap.docs.map(d => d.data());

  // Crear nueva lista
  const listsRef = collection(db, 'users', user.uid, 'lists');
  const newList = {
    name: newName || `${sourceList.name} (copia)`,
    icon: sourceList.icon || '🛒',
    iconUrl: sourceList.iconUrl || null,
    listType: sourceList.listType || 'shopping',
    expenseType: sourceList.expenseType || 'common',
    ownerId: user.uid,
    ownerName: user.displayName || user.email?.split('@')[0] || 'Usuario',
    members: [user.uid],
    itemCount: sourceItems.length,
    closed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: user.uid,
    clonedFrom: sourceListId
  };

  const newListRef = await addDoc(listsRef, newList);

  // Copiar items (sin checked, checkedAt, checkedBy)
  const batch = writeBatch(db);
  for (const item of sourceItems) {
    const newItemRef = doc(collection(db, 'users', user.uid, 'lists', newListRef.id, 'items'));
    batch.set(newItemRef, {
      name: item.name,
      quantity: item.quantity || 1,
      unit: item.unit || 'unidad',
      category: item.category || 'otros',
      notes: item.notes || '',
      priority: item.priority || 'normal',
      productId: item.productId || null,
      checked: false,
      checkedAt: null,
      checkedBy: null,
      createdAt: serverTimestamp(),
      createdBy: user.uid
    });
  }
  await batch.commit();

  // Invalidar cache
  invalidateCache('lists', user.uid);

  return { id: newListRef.id, ...newList };
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

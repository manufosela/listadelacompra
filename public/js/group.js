/**
 * Group Service
 * Gestiona grupos, miembros, invitaciones y permisos.
 * Optimizado con cache para reducir llamadas a Firestore.
 */

import { db } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';
import { functions } from './firebase-config.js';
import { getCachedOrFetch, invalidateCache } from './cache.js';


/**
 * Crea un nuevo grupo
 * @param {string} name - Nombre del grupo
 * @returns {Promise<Object>} Grupo creado
 */
export async function createGroup(name) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const groupRef = doc(collection(db, 'groups'));
  const groupId = groupRef.id;

  const groupData = {
    name,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    members: {
      [user.uid]: {
        role: 'admin',
        joinedAt: serverTimestamp(),
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      }
    },
    inviteCodes: {}
  };

  // Crear grupo
  await setDoc(groupRef, groupData);

  // Actualizar usuario (merge: true crea el doc si no existe)
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    groupIds: arrayUnion(groupId)
  }, { merge: true });

  // Invalidar cache de grupos del usuario
  invalidateCache('userGroups', user.uid);

  // Guardar como grupo activo
  setCurrentGroup(groupId);

  return { id: groupId, ...groupData };
}

/**
 * Obtiene los grupos del usuario actual (con cache)
 * @param {boolean} forceRefresh - Forzar recarga desde Firestore
 * @returns {Promise<Array>} Lista de grupos
 */
export async function getUserGroups(forceRefresh = false) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  // Si forzamos refresh, invalidar cache
  if (forceRefresh) {
    invalidateCache('userGroups', user.uid);
  }

  return getCachedOrFetch('userGroups', user.uid, async () => {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) return [];

    const groupIds = userDoc.data().groupIds || [];
    if (groupIds.length === 0) return [];

    const groups = await Promise.all(
      groupIds.map(async (id) => {
        const groupDoc = await getDoc(doc(db, 'groups', id));
        if (groupDoc.exists()) {
          return { id: groupDoc.id, ...groupDoc.data() };
        }
        return null;
      })
    );

    return groups.filter(Boolean);
  });
}

/**
 * Obtiene un grupo por ID (con cache)
 * @param {string} groupId - ID del grupo
 * @param {boolean} forceRefresh - Forzar recarga
 * @returns {Promise<Object|null>} Grupo o null
 */
export async function getGroup(groupId, forceRefresh = false) {
  if (!groupId) return null;

  if (forceRefresh) {
    invalidateCache('groups', groupId);
  }

  return getCachedOrFetch('groups', groupId, async () => {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (groupDoc.exists()) {
      return { id: groupDoc.id, ...groupDoc.data() };
    }
    return null;
  });
}

/**
 * Obtiene el grupo actual del localStorage
 * @returns {string|null} ID del grupo actual
 */
export function getCurrentGroupId() {
  return localStorage.getItem('hc_current_group');
}

/**
 * Establece el grupo actual
 * @param {string} groupId - ID del grupo
 */
export function setCurrentGroup(groupId) {
  localStorage.setItem('hc_current_group', groupId);
  window.dispatchEvent(new CustomEvent('group-changed', {
    detail: { groupId }
  }));
}

// ==================== INVITACIONES POR EMAIL ====================

/**
 * Invita a un usuario por email (solo admins)
 * @param {string} groupId - ID del grupo
 * @param {string} email - Email del usuario a invitar
 * @returns {Promise<Object>} Invitación creada
 */
export async function inviteUserByEmail(groupId, email) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  // Verificar permisos de admin
  if (!(await isAdmin(groupId))) {
    throw new Error('Solo los administradores pueden invitar');
  }

  // Forzar refresh para evitar datos cacheados obsoletos
  const group = await getGroup(groupId, true);
  if (!group) throw new Error('Grupo no encontrado');

  const normalizedEmail = email.toLowerCase().trim();

  // Verificar que no es ya miembro (por email)
  const memberEmails = Object.values(group.members || {}).map(m => m.email?.toLowerCase());
  if (memberEmails.includes(normalizedEmail)) {
    throw new Error('Este usuario ya es miembro del grupo');
  }

  // Verificar que no hay invitación pendiente
  const existingQuery = query(
    collection(db, 'invitations'),
    where('groupId', '==', groupId),
    where('invitedEmail', '==', normalizedEmail),
    where('status', '==', 'pending')
  );
  const existingSnap = await getDocs(existingQuery);
  if (!existingSnap.empty) {
    throw new Error('Ya existe una invitación pendiente para este email');
  }

  // Crear invitación (expira en 7 días)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const inviteRef = doc(collection(db, 'invitations'));
  const inviteData = {
    groupId,
    groupName: group.name,
    invitedEmail: normalizedEmail,
    invitedBy: user.uid,
    invitedByName: user.displayName || user.email,
    status: 'pending',
    expiresAt: Timestamp.fromDate(expiresAt),
    createdAt: serverTimestamp()
  };

  await setDoc(inviteRef, inviteData);

  return { id: inviteRef.id, ...inviteData };
}

/**
 * Obtiene las invitaciones pendientes para el usuario actual
 * @returns {Promise<Array>} Lista de invitaciones pendientes
 */
export async function getPendingInvitations() {
  const user = getCurrentUser();
  if (!user || !user.email) return [];

  const q = query(
    collection(db, 'invitations'),
    where('invitedEmail', '==', user.email.toLowerCase()),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  const now = new Date();

  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .filter(inv => {
      // Filtrar expiradas
      const expiresAt = inv.expiresAt?.toDate?.() || new Date(inv.expiresAt);
      return expiresAt > now;
    });
}

/**
 * Obtiene las invitaciones de un grupo (para admins)
 * @param {string} groupId - ID del grupo
 * @returns {Promise<Array>} Lista de invitaciones
 */
export async function getGroupInvitations(groupId) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  if (!(await isAdmin(groupId))) {
    throw new Error('Solo administradores pueden ver las invitaciones');
  }

  const q = query(
    collection(db, 'invitations'),
    where('groupId', '==', groupId)
  );

  const snapshot = await getDocs(q);
  const now = new Date();

  return snapshot.docs
    .map(doc => {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
      // Marcar como expirada si corresponde
      let status = data.status;
      if (status === 'pending' && expiresAt <= now) {
        status = 'expired';
      }
      return {
        id: doc.id,
        ...data,
        status,
        expiresAt
      };
    })
    .sort((a, b) => {
      // Pendientes primero, luego por fecha
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return b.createdAt?.toDate?.() - a.createdAt?.toDate?.();
    });
}

/**
 * Acepta una invitación (llama a Cloud Function)
 * @param {string} invitationId - ID de la invitación
 * @returns {Promise<Object>} Resultado con groupId y groupName
 */
export async function acceptInvitation(invitationId) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const acceptFn = httpsCallable(functions, 'acceptInvitation');
  const result = await acceptFn({ invitationId });

  // Invalidar caches
  invalidateCache('userGroups', user.uid);
  if (result.data.groupId) {
    invalidateCache('groups', result.data.groupId);
    setCurrentGroup(result.data.groupId);
  }

  return result.data;
}

/**
 * Rechaza una invitación
 * @param {string} invitationId - ID de la invitación
 */
export async function rejectInvitation(invitationId) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const inviteRef = doc(db, 'invitations', invitationId);
  await updateDoc(inviteRef, {
    status: 'rejected',
    rejectedAt: serverTimestamp()
  });
}

/**
 * Elimina una invitación (solo admins)
 * @param {string} invitationId - ID de la invitación
 */
export async function deleteInvitation(invitationId) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  await deleteDoc(doc(db, 'invitations', invitationId));
}

/**
 * Elimina un miembro del grupo
 * @param {string} groupId - ID del grupo
 * @param {string} userId - ID del usuario a eliminar
 */
export async function removeMember(groupId, userId) {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('No authenticated user');

  const group = await getGroup(groupId);

  // Solo admins pueden eliminar, o el usuario puede eliminarse a sí mismo
  const isCurrentUserAdmin = group.members[currentUser.uid]?.role === 'admin';
  const isRemovingSelf = userId === currentUser.uid;

  if (!isCurrentUserAdmin && !isRemovingSelf) {
    throw new Error('Only admins can remove members');
  }

  // No se puede eliminar al creador del grupo
  if (userId === group.createdBy && !isRemovingSelf) {
    throw new Error('Cannot remove the group creator');
  }

  // Crear nuevo objeto members sin el usuario
  const newMembers = { ...group.members };
  delete newMembers[userId];

  // Actualizar grupo
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, { members: newMembers });

  // Actualizar usuario
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    groupIds: arrayRemove(groupId)
  }, { merge: true });

  // Invalidar caches
  invalidateCache('groups', groupId);
  invalidateCache('userGroups', userId);

  // Si el usuario se eliminó a sí mismo, limpiar grupo actual
  if (isRemovingSelf && getCurrentGroupId() === groupId) {
    localStorage.removeItem('hc_current_group');
  }
}

/**
 * Actualiza el rol de un miembro
 * @param {string} groupId - ID del grupo
 * @param {string} userId - ID del usuario
 * @param {string} newRole - Nuevo rol ('admin' o 'member')
 */
export async function updateMemberRole(groupId, userId, newRole) {
  if (!(await isAdmin(groupId))) {
    throw new Error('Only admins can change roles');
  }

  const group = await getGroup(groupId);

  // No se puede cambiar rol del creador
  if (userId === group.createdBy) {
    throw new Error('Cannot change the role of the group creator');
  }

  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, {
    [`members.${userId}.role`]: newRole
  });

  // Invalidar cache del grupo
  invalidateCache('groups', groupId);
}

/**
 * Verifica si el usuario actual es admin del grupo
 * @param {string} groupId - ID del grupo
 * @returns {Promise<boolean>}
 */
export async function isAdmin(groupId) {
  const user = getCurrentUser();
  if (!user) return false;

  const group = await getGroup(groupId);
  return group?.members[user.uid]?.role === 'admin';
}

/**
 * Verifica si el usuario actual es miembro del grupo
 * @param {string} groupId - ID del grupo
 * @returns {Promise<boolean>}
 */
export async function isMember(groupId) {
  const user = getCurrentUser();
  if (!user) return false;

  const group = await getGroup(groupId);
  return !!group?.members[user.uid];
}

/**
 * Obtiene los miembros de un grupo formateados (usa cache del grupo)
 * @param {string} groupId - ID del grupo
 * @param {boolean} forceRefresh - Forzar recarga
 * @returns {Promise<Array>} Lista de miembros
 */
export async function getGroupMembers(groupId, forceRefresh = false) {
  const group = await getGroup(groupId, forceRefresh);
  if (!group) return [];

  return Object.entries(group.members).map(([id, data]) => ({
    id,
    ...data,
    isCreator: id === group.createdBy
  }));
}

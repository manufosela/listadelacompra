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
  query,
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getCachedOrFetch, setInCache, invalidateCache, invalidateNamespace } from './cache.js';

/**
 * Genera un código de invitación aleatorio
 * @returns {string} Código de 6 caracteres
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Sin I, L, O, 0, 1 confusos
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

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

/**
 * Genera un código de invitación para el grupo
 * @param {string} groupId - ID del grupo
 * @param {number} expiresInHours - Horas hasta expiración (default 48)
 * @returns {Promise<string>} Código de invitación
 */
export async function generateGroupInvite(groupId, expiresInHours = 48) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  // Verificar que es admin
  const group = await getGroup(groupId);
  if (!group || group.members[user.uid]?.role !== 'admin') {
    throw new Error('Only admins can generate invite codes');
  }

  const code = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  // Guardar en colección pública de invitaciones
  const inviteRef = doc(db, 'invitations', code);
  await setDoc(inviteRef, {
    groupId,
    groupName: group.name,
    expiresAt,
    createdAt: serverTimestamp(),
    createdBy: user.uid
  });

  return code;
}

/**
 * Une al usuario actual a un grupo usando código de invitación
 * @param {string} code - Código de invitación
 * @returns {Promise<Object>} Grupo al que se unió
 */
export async function joinGroupWithCode(code) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const normalizedCode = code.toUpperCase().trim();

  // Buscar invitación por código
  const inviteRef = doc(db, 'invitations', normalizedCode);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    throw new Error('Invalid invite code');
  }

  const inviteData = inviteSnap.data();

  // Verificar que no ha expirado
  const expiresAt = inviteData.expiresAt?.toDate?.() || new Date(inviteData.expiresAt);
  if (expiresAt <= new Date()) {
    throw new Error('Invite code has expired');
  }

  // Obtener el grupo
  const targetGroup = await getGroup(inviteData.groupId);
  if (!targetGroup) {
    throw new Error('Group not found');
  }

  // Verificar que no es ya miembro
  if (targetGroup.members[user.uid]) {
    throw new Error('Already a member of this group');
  }

  // Añadir como miembro al grupo
  const groupRef = doc(db, 'groups', targetGroup.id);
  await updateDoc(groupRef, {
    [`members.${user.uid}`]: {
      role: 'member',
      joinedAt: serverTimestamp(),
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL
    }
  });

  // Actualizar usuario (merge: true crea el doc si no existe)
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    groupIds: arrayUnion(targetGroup.id)
  }, { merge: true });

  // Invalidar caches
  invalidateCache('userGroups', user.uid);
  invalidateCache('groups', targetGroup.id);

  // Establecer como grupo activo
  setCurrentGroup(targetGroup.id);

  return targetGroup;
}

/**
 * Añade un miembro por email (solo admins)
 * @param {string} groupId - ID del grupo
 * @param {string} email - Email del usuario a añadir
 * @param {string} role - Rol ('admin' o 'member')
 */
export async function addMemberByEmail(groupId, email, role = 'member') {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('No authenticated user');

  // Verificar permisos de admin
  if (!(await isAdmin(groupId))) {
    throw new Error('Only admins can add members');
  }

  // Buscar usuario por email
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email.toLowerCase()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('No user found with that email');
  }

  const targetUser = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

  // Verificar que no es ya miembro
  const group = await getGroup(groupId);
  if (group.members[targetUser.id]) {
    throw new Error('User is already a member');
  }

  // Añadir miembro al grupo
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, {
    [`members.${targetUser.id}`]: {
      role,
      joinedAt: serverTimestamp(),
      displayName: targetUser.displayName,
      email: targetUser.email,
      photoURL: targetUser.photoURL
    }
  });

  // Actualizar usuario
  const userRef = doc(db, 'users', targetUser.id);
  await setDoc(userRef, {
    groupIds: arrayUnion(groupId)
  }, { merge: true });

  // Invalidar cache del grupo
  invalidateCache('groups', groupId);
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

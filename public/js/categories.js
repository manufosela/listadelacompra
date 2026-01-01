/**
 * Categories Service
 * Gestiona categorías para listas de compra y listas generales.
 *
 * - Listas de compra: categorías globales por defecto + custom por grupo (con emoji)
 * - Listas generales: sin categorías por defecto, solo custom por grupo (con colores)
 */

import { db } from './firebase-config.js';
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
  writeBatch,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ============================================
// CATEGORÍAS POR DEFECTO (SHOPPING)
// ============================================

// Categorías por defecto para listas de compra (no editables, no borrables)
export const DEFAULT_SHOPPING_CATEGORIES = [
  { id: 'frutas', name: 'Frutas', icon: '🍎', bgColor: '#EF4444', textColor: '#FFFFFF', order: 1 },
  { id: 'verduras', name: 'Verduras', icon: '🥬', bgColor: '#22C55E', textColor: '#FFFFFF', order: 2 },
  { id: 'carnes', name: 'Carnes', icon: '🥩', bgColor: '#B91C1C', textColor: '#FFFFFF', order: 3 },
  { id: 'pescados', name: 'Pescados', icon: '🐟', bgColor: '#3B82F6', textColor: '#FFFFFF', order: 4 },
  { id: 'lacteos', name: 'Lácteos', icon: '🥛', bgColor: '#0EA5E9', textColor: '#FFFFFF', order: 5 },
  { id: 'panaderia', name: 'Panadería', icon: '🍞', bgColor: '#D97706', textColor: '#FFFFFF', order: 6 },
  { id: 'bebidas', name: 'Bebidas', icon: '🥤', bgColor: '#EC4899', textColor: '#FFFFFF', order: 7 },
  { id: 'limpieza', name: 'Limpieza', icon: '🧹', bgColor: '#6366F1', textColor: '#FFFFFF', order: 8 },
  { id: 'higiene', name: 'Higiene', icon: '🧴', bgColor: '#A855F7', textColor: '#FFFFFF', order: 9 },
  { id: 'congelados', name: 'Congelados', icon: '❄️', bgColor: '#06B6D4', textColor: '#FFFFFF', order: 10 },
  { id: 'despensa', name: 'Despensa', icon: '🥫', bgColor: '#F97316', textColor: '#FFFFFF', order: 11 },
  { id: 'snacks', name: 'Snacks', icon: '🍿', bgColor: '#EAB308', textColor: '#000000', order: 12 },
  { id: 'mascotas', name: 'Mascotas', icon: '🐕', bgColor: '#78716C', textColor: '#FFFFFF', order: 13 },
  { id: 'otros', name: 'Otros', icon: '📦', bgColor: '#6B7280', textColor: '#FFFFFF', order: 99 }
];

// Colores predefinidos para categorías custom (colores vivos)
export const CATEGORY_COLORS = [
  { bgColor: '#EF4444', textColor: '#FFFFFF', name: 'Rojo' },
  { bgColor: '#F97316', textColor: '#FFFFFF', name: 'Naranja' },
  { bgColor: '#EAB308', textColor: '#000000', name: 'Amarillo' },
  { bgColor: '#84CC16', textColor: '#000000', name: 'Lima' },
  { bgColor: '#22C55E', textColor: '#FFFFFF', name: 'Verde' },
  { bgColor: '#14B8A6', textColor: '#FFFFFF', name: 'Teal' },
  { bgColor: '#06B6D4', textColor: '#FFFFFF', name: 'Cian' },
  { bgColor: '#3B82F6', textColor: '#FFFFFF', name: 'Azul' },
  { bgColor: '#6366F1', textColor: '#FFFFFF', name: 'Índigo' },
  { bgColor: '#A855F7', textColor: '#FFFFFF', name: 'Púrpura' },
  { bgColor: '#EC4899', textColor: '#FFFFFF', name: 'Rosa' },
  { bgColor: '#6B7280', textColor: '#FFFFFF', name: 'Gris' }
];

// ============================================
// FUNCIONES HELPER
// ============================================

/**
 * Obtiene una categoría por defecto por ID
 * @param {string} categoryId
 * @returns {Object|null}
 */
export function getDefaultCategory(categoryId) {
  return DEFAULT_SHOPPING_CATEGORIES.find(c => c.id === categoryId) || null;
}

/**
 * Verifica si una categoría es por defecto (no editable/borrable)
 * @param {string} categoryId
 * @returns {boolean}
 */
export function isDefaultCategory(categoryId) {
  return DEFAULT_SHOPPING_CATEGORIES.some(c => c.id === categoryId);
}

// ============================================
// CATEGORÍAS CUSTOM POR GRUPO
// ============================================

/**
 * Obtiene las categorías custom de un grupo
 * @param {string} groupId
 * @param {string} listType - 'shopping' | 'agnostic'
 * @returns {Promise<Array>}
 */
export async function getGroupCategories(groupId, listType = null) {
  const categoriesRef = collection(db, 'groups', groupId, 'categories');

  let q;
  if (listType) {
    q = query(categoriesRef, where('listType', '==', listType), orderBy('order', 'asc'));
  } else {
    q = query(categoriesRef, orderBy('order', 'asc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isDefault: false }));
}

/**
 * Obtiene todas las categorías disponibles según el tipo de lista
 * @param {string} groupId
 * @param {string} listType - 'shopping' | 'agnostic'
 * @returns {Promise<Array>}
 */
export async function getCategoriesForList(groupId, listType) {
  const customCategories = await getGroupCategories(groupId, listType);

  if (listType === 'shopping') {
    // Listas de compra: categorías por defecto + custom
    const defaultCats = DEFAULT_SHOPPING_CATEGORIES.map(c => ({ ...c, isDefault: true }));
    return [...defaultCats, ...customCategories];
  }

  // Listas generales: solo categorías custom
  return customCategories;
}

/**
 * Obtiene una categoría por ID (buscando en defaults y custom del grupo)
 * @param {string} groupId
 * @param {string} categoryId
 * @returns {Promise<Object|null>}
 */
export async function getCategoryById(groupId, categoryId) {
  // Primero buscar en categorías por defecto
  const defaultCat = getDefaultCategory(categoryId);
  if (defaultCat) {
    return { ...defaultCat, isDefault: true };
  }

  // Luego buscar en categorías custom del grupo
  const categoryRef = doc(db, 'groups', groupId, 'categories', categoryId);
  const categorySnap = await getDoc(categoryRef);

  if (categorySnap.exists()) {
    return { id: categorySnap.id, ...categorySnap.data(), isDefault: false };
  }

  return null;
}

/**
 * Crea una categoría custom para un grupo
 * @param {string} groupId
 * @param {Object} categoryData
 * @param {string} createdBy - UID del usuario que crea
 * @returns {Promise<string>} ID de la nueva categoría
 */
export async function createGroupCategory(groupId, categoryData, createdBy) {
  const categoriesRef = collection(db, 'groups', groupId, 'categories');

  // Obtener el orden máximo actual para este tipo de lista
  const existingCategories = await getGroupCategories(groupId, categoryData.listType);
  const maxOrder = existingCategories.reduce((max, cat) => Math.max(max, cat.order || 0), 100);

  const docRef = await addDoc(categoriesRef, {
    name: categoryData.name.trim(),
    icon: categoryData.listType === 'shopping' ? (categoryData.icon || '📦') : null,
    bgColor: categoryData.bgColor || '#F3F4F6',
    textColor: categoryData.textColor || '#6B7280',
    listType: categoryData.listType,
    order: maxOrder + 1,
    createdAt: serverTimestamp(),
    createdBy
  });

  return docRef.id;
}

/**
 * Actualiza una categoría custom
 * @param {string} groupId
 * @param {string} categoryId
 * @param {Object} updates
 */
export async function updateGroupCategory(groupId, categoryId, updates) {
  // No permitir actualizar categorías por defecto
  if (isDefaultCategory(categoryId)) {
    throw new Error('No se pueden editar categorías por defecto');
  }

  const categoryRef = doc(db, 'groups', groupId, 'categories', categoryId);

  const cleanUpdates = { ...updates };
  if (cleanUpdates.name) {
    cleanUpdates.name = cleanUpdates.name.trim();
  }

  await updateDoc(categoryRef, cleanUpdates);
}

/**
 * Elimina una categoría custom y limpia referencias en items
 * @param {string} groupId
 * @param {string} categoryId
 * @param {string} ownerIds - Array de UIDs cuyos items deben actualizarse
 */
export async function deleteGroupCategory(groupId, categoryId) {
  // No permitir eliminar categorías por defecto
  if (isDefaultCategory(categoryId)) {
    throw new Error('No se pueden eliminar categorías por defecto');
  }

  const categoryRef = doc(db, 'groups', groupId, 'categories', categoryId);
  await deleteDoc(categoryRef);

  // Nota: La limpieza de referencias en items se hace desde el componente
  // ya que requiere conocer las listas y sus items
}

/**
 * Cuenta cuántos items usan una categoría específica
 * Esto se usa antes de eliminar para informar al usuario
 * @param {string} userId
 * @param {string} categoryId
 * @returns {Promise<number>}
 */
export async function countItemsWithCategory(userId, categoryId) {
  // Esta función se implementa en el componente porque requiere
  // iterar sobre las listas del usuario y sus items
  // Aquí dejamos un placeholder
  console.warn('countItemsWithCategory debe implementarse en el componente');
  return 0;
}

/**
 * Elimina la categoría de todos los items que la usen
 * @param {string} userId
 * @param {Array<string>} listIds - IDs de las listas a actualizar
 * @param {string} categoryId
 */
export async function removeCategoryFromItems(userId, listIds, categoryId) {
  const batch = writeBatch(db);
  let batchCount = 0;

  for (const listId of listIds) {
    const itemsRef = collection(db, 'users', userId, 'lists', listId, 'items');
    const q = query(itemsRef, where('category', '==', categoryId));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      batch.update(docSnap.ref, { category: null });
      batchCount++;

      // Firestore tiene límite de 500 operaciones por batch
      if (batchCount >= 450) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
}

// ============================================
// HELPERS PARA UI
// ============================================

/**
 * Formatea una categoría para mostrar en UI
 * @param {Object} category
 * @param {string} listType
 * @returns {Object} { display, icon, style }
 */
export function formatCategoryDisplay(category, listType = 'shopping') {
  if (!category) {
    return {
      display: 'Sin categoría',
      icon: null,
      style: {}
    };
  }

  if (listType === 'shopping') {
    return {
      display: `${category.icon || ''} ${category.name}`.trim(),
      icon: category.icon,
      style: {}
    };
  }

  // Listas generales: badge con color
  return {
    display: category.name,
    icon: null,
    style: {
      backgroundColor: category.bgColor || '#F3F4F6',
      color: category.textColor || '#6B7280'
    }
  };
}

/**
 * Obtiene el siguiente color disponible para una nueva categoría
 * Intenta no repetir colores ya usados
 * @param {Array} existingCategories
 * @returns {Object} { bgColor, textColor }
 */
export function getNextAvailableColor(existingCategories = []) {
  const usedColors = new Set(existingCategories.map(c => c.bgColor));

  for (const color of CATEGORY_COLORS) {
    if (!usedColors.has(color.bgColor)) {
      return { bgColor: color.bgColor, textColor: color.textColor };
    }
  }

  // Si todos los colores están usados, devolver el primero
  return { bgColor: CATEGORY_COLORS[0].bgColor, textColor: CATEGORY_COLORS[0].textColor };
}

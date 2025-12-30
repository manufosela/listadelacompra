/**
 * Database Service
 * Gestiona operaciones CRUD de productos y otras entidades.
 */

import { db } from './firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ============================================
// CATEGORÍAS Y UNIDADES
// ============================================

// Categorías para listas de compra
export const PRODUCT_CATEGORIES = [
  { id: 'frutas', name: 'Frutas', icon: '🍎' },
  { id: 'verduras', name: 'Verduras', icon: '🥬' },
  { id: 'carnes', name: 'Carnes', icon: '🥩' },
  { id: 'pescados', name: 'Pescados', icon: '🐟' },
  { id: 'lacteos', name: 'Lácteos', icon: '🥛' },
  { id: 'panaderia', name: 'Panadería', icon: '🍞' },
  { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
  { id: 'limpieza', name: 'Limpieza', icon: '🧹' },
  { id: 'higiene', name: 'Higiene', icon: '🧴' },
  { id: 'congelados', name: 'Congelados', icon: '❄️' },
  { id: 'despensa', name: 'Despensa', icon: '🥫' },
  { id: 'snacks', name: 'Snacks', icon: '🍿' },
  { id: 'mascotas', name: 'Mascotas', icon: '🐕' },
  { id: 'otros', name: 'Otros', icon: '📦' }
];

// Categorías para listas agnósticas (generales)
export const GENERAL_CATEGORIES = [
  { id: 'tareas', name: 'Tareas', icon: '📋' },
  { id: 'viaje', name: 'Viaje', icon: '✈️' },
  { id: 'camping', name: 'Camping', icon: '⛺' },
  { id: 'tecnologia', name: 'Tecnología', icon: '💻' },
  { id: 'deporte', name: 'Deporte', icon: '⚽' },
  { id: 'hogar', name: 'Hogar', icon: '🏠' },
  { id: 'trabajo', name: 'Trabajo', icon: '💼' },
  { id: 'salud', name: 'Salud', icon: '🏥' },
  { id: 'documentos', name: 'Documentos', icon: '📄' },
  { id: 'general_otros', name: 'Otros', icon: '📌' }
];

// Prioridades para items de listas agnósticas
export const PRIORITIES = [
  { id: 'high', name: 'Alta', icon: '🔴', color: '#dc2626' },
  { id: 'medium', name: 'Media', icon: '🟡', color: '#f59e0b' },
  { id: 'low', name: 'Baja', icon: '🟢', color: '#10b981' }
];

/**
 * Obtiene las categorías según el tipo de lista
 * @param {string} listType - 'shopping' o 'agnostic'
 * @param {Array} customCategories - Categorías personalizadas del usuario
 * @returns {Array} Lista de categorías
 */
export function getCategoriesForListType(listType, customCategories = []) {
  if (listType === 'shopping') {
    return PRODUCT_CATEGORIES;
  }
  return [...GENERAL_CATEGORIES, ...customCategories];
}

export const UNITS = [
  { id: 'unidad', name: 'Unidad(es)' },
  { id: 'kg', name: 'Kilogramo(s)' },
  { id: 'g', name: 'Gramo(s)' },
  { id: 'l', name: 'Litro(s)' },
  { id: 'ml', name: 'Mililitro(s)' },
  { id: 'pack', name: 'Pack(s)' },
  { id: 'paquete', name: 'Paquete(s)' },
  { id: 'caja', name: 'Caja(s)' },
  { id: 'docena', name: 'Docena(s)' },
  { id: 'bolsa', name: 'Bolsa(s)' },
  { id: 'lata', name: 'Lata(s)' },
  { id: 'botella', name: 'Botella(s)' }
];

// ============================================
// PRODUCTOS
// ============================================

/**
 * Crea un nuevo producto
 */
export async function createProduct(groupId, productData) {
  const productsRef = collection(db, 'groups', groupId, 'products');
  const normalizedName = productData.name.toLowerCase().trim();

  const docRef = await addDoc(productsRef, {
    name: productData.name.trim(),
    normalizedName,
    brand: productData.brand?.trim() || null,
    category: productData.category || 'otros',
    defaultUnit: productData.defaultUnit || 'unidad',
    defaultQuantity: productData.defaultQuantity || 1,
    barcode: productData.barcode || null,
    notes: productData.notes || '',
    createdAt: serverTimestamp(),
    lastPurchasedAt: null,
    purchaseCount: 0
  });

  return docRef.id;
}

/**
 * Obtiene un producto por ID
 */
export async function getProduct(groupId, productId) {
  const productRef = doc(db, 'groups', groupId, 'products', productId);
  const productSnap = await getDoc(productRef);

  if (productSnap.exists()) {
    return { id: productSnap.id, ...productSnap.data() };
  }
  return null;
}

/**
 * Obtiene todos los productos de un grupo
 */
export async function getAllProducts(groupId) {
  const productsRef = collection(db, 'groups', groupId, 'products');
  const q = query(productsRef, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Busca productos por nombre
 */
export async function searchProducts(groupId, searchQuery, maxResults = 10) {
  const normalizedQuery = searchQuery.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const productsRef = collection(db, 'groups', groupId, 'products');
  const q = query(
    productsRef,
    where('normalizedName', '>=', normalizedQuery),
    where('normalizedName', '<=', normalizedQuery + '\uf8ff'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Obtiene productos por categoría
 */
export async function getProductsByCategory(groupId, category) {
  const productsRef = collection(db, 'groups', groupId, 'products');
  const q = query(productsRef, where('category', '==', category), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Obtiene los productos más usados
 */
export async function getMostUsedProducts(groupId, maxResults = 10) {
  const productsRef = collection(db, 'groups', groupId, 'products');
  const q = query(productsRef, orderBy('purchaseCount', 'desc'), limit(maxResults));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Actualiza un producto
 */
export async function updateProduct(groupId, productId, updates) {
  const productRef = doc(db, 'groups', groupId, 'products', productId);

  if (updates.name) {
    updates.normalizedName = updates.name.toLowerCase().trim();
    updates.name = updates.name.trim();
  }

  await updateDoc(productRef, updates);
}

/**
 * Elimina un producto
 */
export async function deleteProduct(groupId, productId) {
  const productRef = doc(db, 'groups', groupId, 'products', productId);
  await deleteDoc(productRef);
}

/**
 * Incrementa el contador de compras
 */
export async function incrementProductPurchase(groupId, productId) {
  const productRef = doc(db, 'groups', groupId, 'products', productId);
  await updateDoc(productRef, {
    purchaseCount: increment(1),
    lastPurchasedAt: serverTimestamp()
  });
}

/**
 * Busca o crea un producto por nombre
 */
export async function findOrCreateProduct(groupId, name, defaults = {}) {
  const normalizedName = name.toLowerCase().trim();

  const productsRef = collection(db, 'groups', groupId, 'products');
  const q = query(productsRef, where('normalizedName', '==', normalizedName), limit(1));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  }

  const productId = await createProduct(groupId, { name, ...defaults });
  return getProduct(groupId, productId);
}

// ============================================
// CATEGORÍAS PERSONALIZADAS
// ============================================

/**
 * Obtiene las categorías personalizadas de un usuario
 */
export async function getUserCustomCategories(userId) {
  const categoriesRef = collection(db, 'users', userId, 'customCategories');
  const q = query(categoriesRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Crea una categoría personalizada
 */
export async function createCustomCategory(userId, categoryData) {
  const categoriesRef = collection(db, 'users', userId, 'customCategories');

  // Obtener el orden máximo actual
  const existingCategories = await getUserCustomCategories(userId);
  const maxOrder = existingCategories.reduce((max, cat) => Math.max(max, cat.order || 0), 0);

  const docRef = await addDoc(categoriesRef, {
    name: categoryData.name.trim(),
    icon: categoryData.icon || '📌',
    order: maxOrder + 1,
    createdAt: serverTimestamp()
  });

  return docRef.id;
}

/**
 * Actualiza una categoría personalizada
 */
export async function updateCustomCategory(userId, categoryId, updates) {
  const categoryRef = doc(db, 'users', userId, 'customCategories', categoryId);

  if (updates.name) {
    updates.name = updates.name.trim();
  }

  await updateDoc(categoryRef, updates);
}

/**
 * Elimina una categoría personalizada
 */
export async function deleteCustomCategory(userId, categoryId) {
  const categoryRef = doc(db, 'users', userId, 'customCategories', categoryId);
  await deleteDoc(categoryRef);
}

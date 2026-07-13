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
import { normalizeProductName, calculateSimilarity } from './product-matching.js';

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
  { id: 'botella', name: 'Botella(s)' },
  { id: 'bandeja', name: 'Bandeja(s)' },
  { id: 'bolsa', name: 'Bolsa(s)' },
  { id: 'manojo', name: 'Manojo(s)' },
  { id: 'pieza', name: 'Pieza(s)' },
];

// ============================================
// HELPERS DE NORMALIZACIÓN
// ============================================

// La lógica pura de normalización y similitud vive en product-matching.js
// (módulo sin dependencias, testeable). Se reexporta para no romper importadores.
export { normalizeProductName, calculateSimilarity };

// ============================================
// PRODUCTOS
// ============================================

/**
 * Crea un nuevo producto
 */
export async function createProduct(groupId, productData) {
  const productsRef = collection(db, 'groups', groupId, 'products');
  const normalizedName = normalizeProductName(productData.name);

  const docRef = await addDoc(productsRef, {
    name: productData.name.trim(),
    normalizedName,
    brand: productData.brand?.trim() || null,
    storeTag: productData.storeTag?.trim() || null,
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
 * Busca productos por nombre con fuzzy matching
 * Combina búsqueda por prefijo + fuzzy matching, ordenado por relevancia
 */
export async function searchProducts(groupId, searchQuery, maxResults = 10) {
  const normalizedQuery = normalizeProductName(searchQuery);
  if (!normalizedQuery) return [];

  const productsRef = collection(db, 'groups', groupId, 'products');
  const results = new Map(); // Usar Map para evitar duplicados

  // 1. Búsqueda por prefijo (más eficiente, resultados más relevantes)
  const prefixQ = query(
    productsRef,
    where('normalizedName', '>=', normalizedQuery),
    where('normalizedName', '<=', normalizedQuery + '\uf8ff'),
    limit(maxResults)
  );
  const prefixSnapshot = await getDocs(prefixQ);

  prefixSnapshot.docs.forEach(doc => {
    const data = { id: doc.id, ...doc.data() };
    data._similarity = calculateSimilarity(normalizedQuery, data.normalizedName);
    results.set(doc.id, data);
  });

  // 2. Si no tenemos suficientes resultados, buscar fuzzy en más productos
  if (results.size < maxResults) {
    // Cargar productos más usados para fuzzy matching
    const fuzzyQ = query(
      productsRef,
      orderBy('purchaseCount', 'desc'),
      limit(50) // Limitar para no cargar demasiados
    );
    const fuzzySnapshot = await getDocs(fuzzyQ);

    fuzzySnapshot.docs.forEach(doc => {
      if (results.has(doc.id)) return; // Ya está en resultados

      const data = { id: doc.id, ...doc.data() };
      const similarity = calculateSimilarity(normalizedQuery, data.normalizedName);

      // Solo incluir si hay alguna similitud
      if (similarity >= 0.3) {
        data._similarity = similarity;
        results.set(doc.id, data);
      }
    });
  }

  // 3. Ordenar por similitud (descendente) y luego por purchaseCount
  const sortedResults = Array.from(results.values())
    .sort((a, b) => {
      // Primero por similitud
      if (b._similarity !== a._similarity) {
        return b._similarity - a._similarity;
      }
      // Luego por frecuencia de uso
      return (b.purchaseCount || 0) - (a.purchaseCount || 0);
    })
    .slice(0, maxResults);

  // Limpiar campo interno
  sortedResults.forEach(r => delete r._similarity);

  return sortedResults;
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
    updates.normalizedName = normalizeProductName(updates.name);
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
 * Incrementa el contador de compras buscando por nombre
 * Útil cuando no tenemos el productId pero sí el nombre del item
 */
export async function incrementProductPurchaseByName(groupId, itemName) {
  if (!groupId || !itemName) return;

  const normalizedName = normalizeProductName(itemName);
  const productsRef = collection(db, 'groups', groupId, 'products');
  const q = query(productsRef, where('normalizedName', '==', normalizedName), limit(1));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const productDoc = snapshot.docs[0];
    await updateDoc(productDoc.ref, {
      purchaseCount: increment(1),
      lastPurchasedAt: serverTimestamp()
    });
  }
}

/**
 * Busca o crea un producto por nombre
 */
export async function findOrCreateProduct(groupId, name, defaults = {}) {
  const normalizedName = normalizeProductName(name);

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
// MIGRACIÓN DE PRODUCTOS
// ============================================

/**
 * Migra productos de las listas de un usuario al catálogo del grupo
 * Extrae todos los items únicos de las listas de compra y los añade al catálogo
 * @param {string} userId - ID del usuario
 * @param {string} groupId - ID del grupo
 * @returns {Object} - Estadísticas de la migración
 */
export async function migrateUserProductsToCatalog(userId, groupId) {
  if (!userId || !groupId) {
    throw new Error('userId y groupId son requeridos');
  }

  const stats = {
    listsProcessed: 0,
    itemsProcessed: 0,
    productsCreated: 0,
    productsUpdated: 0,
    duplicatesSkipped: 0
  };

  try {
    // 1. Obtener todas las listas de compra del usuario
    const listsRef = collection(db, 'users', userId, 'lists');
    const listsSnapshot = await getDocs(listsRef);

    for (const listDoc of listsSnapshot.docs) {
      const listData = listDoc.data();

      // Solo procesar listas de compra (no agnostic)
      if (listData.listType === 'agnostic') continue;

      stats.listsProcessed++;

      // 2. Obtener items de la lista
      const itemsRef = collection(db, 'users', userId, 'lists', listDoc.id, 'items');
      const itemsSnapshot = await getDocs(itemsRef);

      for (const itemDoc of itemsSnapshot.docs) {
        const item = itemDoc.data();
        if (!item.name) continue;

        stats.itemsProcessed++;

        const normalizedName = normalizeProductName(item.name);
        if (!normalizedName) continue;

        // 3. Verificar si el producto ya existe en el catálogo
        const productsRef = collection(db, 'groups', groupId, 'products');
        const q = query(productsRef, where('normalizedName', '==', normalizedName), limit(1));
        const productSnapshot = await getDocs(q);

        if (productSnapshot.empty) {
          // Crear nuevo producto
          await addDoc(productsRef, {
            name: item.name.trim(),
            normalizedName,
            category: item.category || 'otros',
            purchaseCount: item.checked ? 1 : 0,
            lastPurchasedAt: item.checked && item.checkedAt ? item.checkedAt : null,
            createdAt: serverTimestamp(),
            createdBy: userId
          });
          stats.productsCreated++;
        } else {
          // Si el item estaba marcado como comprado, incrementar contador
          if (item.checked) {
            const productDoc = productSnapshot.docs[0];
            await updateDoc(productDoc.ref, {
              purchaseCount: increment(1),
              lastPurchasedAt: serverTimestamp()
            });
            stats.productsUpdated++;
          } else {
            stats.duplicatesSkipped++;
          }
        }
      }
    }

    return stats;
  } catch (error) {
    console.error('Error en migración:', error);
    throw error;
  }
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

# Fase 5: Catálogo de Productos

## Objetivo

Implementar el catálogo de productos del hogar con CRUD completo, búsqueda, categorización y gestión de productos frecuentes.

---

## Paso 5.1: Product Service

### Actualizar `public/js/db.js`

```javascript
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
// CATEGORÍAS
// ============================================

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

export const UNITS = [
  { id: 'unidad', name: 'Unidad(es)' },
  { id: 'kg', name: 'Kilogramo(s)' },
  { id: 'g', name: 'Gramo(s)' },
  { id: 'l', name: 'Litro(s)' },
  { id: 'ml', name: 'Mililitro(s)' },
  { id: 'pack', name: 'Pack(s)' },
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
export async function createProduct(householdId, productData) {
  const productsRef = collection(db, 'households', householdId, 'products');
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
export async function getProduct(householdId, productId) {
  const productRef = doc(db, 'households', householdId, 'products', productId);
  const productSnap = await getDoc(productRef);
  
  if (productSnap.exists()) {
    return { id: productSnap.id, ...productSnap.data() };
  }
  return null;
}

/**
 * Obtiene todos los productos de un hogar
 */
export async function getAllProducts(householdId) {
  const productsRef = collection(db, 'households', householdId, 'products');
  const q = query(productsRef, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Busca productos por nombre
 */
export async function searchProducts(householdId, searchQuery, maxResults = 10) {
  const normalizedQuery = searchQuery.toLowerCase().trim();
  if (!normalizedQuery) return [];
  
  const productsRef = collection(db, 'households', householdId, 'products');
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
export async function getProductsByCategory(householdId, category) {
  const productsRef = collection(db, 'households', householdId, 'products');
  const q = query(productsRef, where('category', '==', category), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Obtiene los productos más usados
 */
export async function getMostUsedProducts(householdId, maxResults = 10) {
  const productsRef = collection(db, 'households', householdId, 'products');
  const q = query(productsRef, orderBy('purchaseCount', 'desc'), limit(maxResults));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Actualiza un producto
 */
export async function updateProduct(householdId, productId, updates) {
  const productRef = doc(db, 'households', householdId, 'products', productId);
  
  if (updates.name) {
    updates.normalizedName = updates.name.toLowerCase().trim();
    updates.name = updates.name.trim();
  }
  
  await updateDoc(productRef, updates);
}

/**
 * Elimina un producto
 */
export async function deleteProduct(householdId, productId) {
  const productRef = doc(db, 'households', householdId, 'products', productId);
  await deleteDoc(productRef);
}

/**
 * Incrementa el contador de compras
 */
export async function incrementProductPurchase(householdId, productId) {
  const productRef = doc(db, 'households', householdId, 'products', productId);
  await updateDoc(productRef, {
    purchaseCount: increment(1),
    lastPurchasedAt: serverTimestamp()
  });
}

/**
 * Busca o crea un producto por nombre
 */
export async function findOrCreateProduct(householdId, name, defaults = {}) {
  const normalizedName = name.toLowerCase().trim();
  
  const productsRef = collection(db, 'households', householdId, 'products');
  const q = query(productsRef, where('normalizedName', '==', normalizedName), limit(1));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  
  const productId = await createProduct(householdId, { name, ...defaults });
  return getProduct(householdId, productId);
}
```

---

## Paso 5.2: Página de Catálogo

### Crear `src/pages/app/products/index.astro`

```astro
---
import AppLayout from '../../../layouts/AppLayout.astro';
---

<AppLayout title="Catálogo de Productos">
  <div class="products-page">
    <header class="page-header">
      <div>
        <h1>Catálogo de Productos</h1>
        <p>Gestiona los productos de tu hogar</p>
      </div>
      <button id="add-product-btn" class="btn btn-primary">+ Nuevo producto</button>
    </header>
    
    <div class="search-filters">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="search-input" placeholder="Buscar productos..." />
      </div>
      
      <select id="category-filter">
        <option value="">Todas las categorías</option>
      </select>
      
      <select id="sort-by">
        <option value="name">Ordenar por nombre</option>
        <option value="recent">Más recientes</option>
        <option value="frequent">Más usados</option>
      </select>
    </div>
    
    <div id="products-grid" class="products-grid">
      <p class="loading">Cargando productos...</p>
    </div>
  </div>
  
  <dialog id="product-modal" class="modal">
    <form id="product-form" method="dialog" class="modal-content">
      <h2 id="modal-title">Nuevo Producto</h2>
      <input type="hidden" id="product-id" />
      
      <div class="form-group">
        <label for="product-name">Nombre *</label>
        <input type="text" id="product-name" required />
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="product-brand">Marca</label>
          <input type="text" id="product-brand" />
        </div>
        <div class="form-group">
          <label for="product-category">Categoría</label>
          <select id="product-category"></select>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="product-unit">Unidad</label>
          <select id="product-unit"></select>
        </div>
        <div class="form-group">
          <label for="product-quantity">Cantidad</label>
          <input type="number" id="product-quantity" min="1" value="1" />
        </div>
      </div>
      
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="cancel-modal">Cancelar</button>
        <button type="button" class="btn btn-danger" id="delete-product" hidden>Eliminar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  </dialog>
</AppLayout>

<script type="module">
  import { getAllProducts, createProduct, updateProduct, deleteProduct, PRODUCT_CATEGORIES, UNITS } from '/js/db.js';
  import { getCurrentHouseholdId } from '/js/household.js';
  
  let allProducts = [];
  const modal = document.getElementById('product-modal');
  
  // Poblar selects con categorías y unidades
  PRODUCT_CATEGORIES.forEach(cat => {
    document.getElementById('product-category').innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
    document.getElementById('category-filter').innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
  });
  
  UNITS.forEach(unit => {
    document.getElementById('product-unit').innerHTML += `<option value="${unit.id}">${unit.name}</option>`;
  });
  
  window.addEventListener('auth-ready', loadProducts);
  
  async function loadProducts() {
    const householdId = getCurrentHouseholdId();
    if (!householdId) return;
    
    allProducts = await getAllProducts(householdId);
    renderProducts(allProducts);
  }
  
  function renderProducts(products) {
    const container = document.getElementById('products-grid');
    if (products.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No hay productos.</p></div>';
      return;
    }
    
    container.innerHTML = products.map(p => `
      <div class="product-card" data-id="${p.id}">
        <div class="product-icon">${PRODUCT_CATEGORIES.find(c => c.id === p.category)?.icon || '📦'}</div>
        <div class="product-info">
          <h3>${p.name}</h3>
          ${p.brand ? `<p class="product-brand">${p.brand}</p>` : ''}
        </div>
        <button class="edit-btn" onclick="editProduct('${p.id}')">✏️</button>
      </div>
    `).join('');
  }
  
  // Filtros
  document.getElementById('search-input').addEventListener('input', e => {
    const query = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(query));
    renderProducts(filtered);
  });
  
  document.getElementById('category-filter').addEventListener('change', e => {
    const cat = e.target.value;
    const filtered = cat ? allProducts.filter(p => p.category === cat) : allProducts;
    renderProducts(filtered);
  });
  
  // Modal
  document.getElementById('add-product-btn').addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Nuevo Producto';
    document.getElementById('product-id').value = '';
    document.getElementById('product-form').reset();
    document.getElementById('delete-product').hidden = true;
    modal.showModal();
  });
  
  window.editProduct = (id) => {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById('modal-title').textContent = 'Editar Producto';
    document.getElementById('product-id').value = id;
    document.getElementById('product-name').value = p.name;
    document.getElementById('product-brand').value = p.brand || '';
    document.getElementById('product-category').value = p.category;
    document.getElementById('product-unit').value = p.defaultUnit;
    document.getElementById('product-quantity').value = p.defaultQuantity || 1;
    document.getElementById('delete-product').hidden = false;
    modal.showModal();
  };
  
  document.getElementById('cancel-modal').addEventListener('click', () => modal.close());
  
  document.getElementById('product-form').addEventListener('submit', async e => {
    e.preventDefault();
    const householdId = getCurrentHouseholdId();
    const id = document.getElementById('product-id').value;
    
    const data = {
      name: document.getElementById('product-name').value,
      brand: document.getElementById('product-brand').value || null,
      category: document.getElementById('product-category').value,
      defaultUnit: document.getElementById('product-unit').value,
      defaultQuantity: parseInt(document.getElementById('product-quantity').value) || 1
    };
    
    if (id) {
      await updateProduct(householdId, id, data);
    } else {
      await createProduct(householdId, data);
    }
    
    modal.close();
    loadProducts();
  });
  
  document.getElementById('delete-product').addEventListener('click', async () => {
    if (!confirm('¿Eliminar producto?')) return;
    const householdId = getCurrentHouseholdId();
    const id = document.getElementById('product-id').value;
    await deleteProduct(householdId, id);
    modal.close();
    loadProducts();
  });
</script>

<style>
  .products-page { max-width: 1200px; }
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xl); }
  .search-filters { display: flex; gap: var(--space-md); margin-bottom: var(--space-lg); flex-wrap: wrap; }
  .search-box { flex: 1; min-width: 200px; position: relative; }
  .search-box input { width: 100%; padding: var(--space-sm) var(--space-md) var(--space-sm) 2.5rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
  .search-box .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); }
  .search-filters select { padding: var(--space-sm) var(--space-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
  .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-md); }
  .product-card { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md); background: white; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
  .product-card:hover { border-color: var(--color-primary); }
  .product-icon { font-size: 2rem; }
  .product-info { flex: 1; }
  .product-info h3 { font-size: var(--font-size-base); }
  .product-brand { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
  .edit-btn { background: transparent; border: none; cursor: pointer; opacity: 0; transition: opacity 0.15s; }
  .product-card:hover .edit-btn { opacity: 1; }
  .modal { border: none; border-radius: var(--radius-lg); padding: 0; max-width: 500px; width: 90%; }
  .modal::backdrop { background: rgba(0,0,0,0.5); }
  .modal-content { padding: var(--space-xl); }
  .form-group { margin-bottom: var(--space-md); }
  .form-group label { display: block; margin-bottom: var(--space-xs); font-weight: 500; }
  .form-group input, .form-group select { width: 100%; padding: var(--space-sm); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
  .modal-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-lg); }
  .btn-danger { background: var(--color-danger); color: white; margin-right: auto; }
</style>
```

---

## ✅ Checklist de la Fase 5

- [ ] Product service con CRUD completo
- [ ] Categorías y unidades predefinidas
- [ ] Búsqueda de productos
- [ ] Filtrado por categoría
- [ ] Página de catálogo con grid
- [ ] Modal crear/editar/eliminar

---

## 🔗 Siguiente Fase

→ [06-tickets-ia.md](./06-tickets-ia.md)

# Fase 4: Listas de la Compra en Tiempo Real

## Objetivo

Implementar las listas de la compra con sincronización en tiempo real usando Firestore listeners, permitiendo que múltiples usuarios vean los cambios instantáneamente.

---

## Paso 4.1: Realtime Sync Service

### Crear `public/js/realtime-sync.js`

```javascript
/**
 * Realtime Sync Service
 * Gestiona suscripciones en tiempo real a Firestore.
 */

import { db } from './firebase-config.js';
import {
  collection,
  doc,
  query,
  where,
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
 * @param {string} key - Identificador de la suscripción
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
 * Suscribe a las listas de un hogar
 * @param {string} householdId - ID del hogar
 * @param {Function} callback - Función a llamar con las listas
 * @returns {Function} Función para cancelar suscripción
 */
export function subscribeToLists(householdId, callback) {
  const key = `lists-${householdId}`;
  unsubscribe(key); // Cancelar suscripción anterior si existe

  const listsRef = collection(db, 'households', householdId, 'shoppingLists');
  const q = query(listsRef, orderBy('scheduledDate', 'asc'));

  const unsub = onSnapshot(q, (snapshot) => {
    const lists = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convertir timestamps a Date
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
 * @param {string} householdId - ID del hogar
 * @param {string} listId - ID de la lista
 * @param {Function} callback - Función a llamar con la lista
 * @returns {Function} Función para cancelar suscripción
 */
export function subscribeToList(householdId, listId, callback) {
  const key = `list-${listId}`;
  unsubscribe(key);

  const listRef = doc(db, 'households', householdId, 'shoppingLists', listId);

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
 * @param {string} householdId - ID del hogar
 * @param {string} listId - ID de la lista
 * @param {Function} callback - Función a llamar con los items
 * @returns {Function} Función para cancelar suscripción
 */
export function subscribeToListItems(householdId, listId, callback) {
  const key = `items-${listId}`;
  unsubscribe(key);

  const itemsRef = collection(
    db, 
    'households', householdId, 
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
 * @param {string} householdId - ID del hogar
 * @param {Object} listData - Datos de la lista
 * @returns {Promise<string>} ID de la lista creada
 */
export async function createList(householdId, listData) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const listsRef = collection(db, 'households', householdId, 'shoppingLists');
  
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
 * @param {string} householdId - ID del hogar
 * @param {string} listId - ID de la lista
 * @param {Object} updates - Campos a actualizar
 */
export async function updateList(householdId, listId, updates) {
  const listRef = doc(db, 'households', householdId, 'shoppingLists', listId);
  
  // Convertir fecha si viene como string
  if (updates.scheduledDate && typeof updates.scheduledDate === 'string') {
    updates.scheduledDate = Timestamp.fromDate(new Date(updates.scheduledDate));
  }
  
  await updateDoc(listRef, updates);
}

/**
 * Elimina una lista y todos sus items
 * @param {string} householdId - ID del hogar
 * @param {string} listId - ID de la lista
 */
export async function deleteList(householdId, listId) {
  // Primero eliminar todos los items
  const itemsRef = collection(
    db, 
    'households', householdId, 
    'shoppingLists', listId, 
    'items'
  );
  
  const itemsSnap = await getDocs(itemsRef);
  const batch = writeBatch(db);
  
  itemsSnap.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Luego eliminar la lista
  const listRef = doc(db, 'households', householdId, 'shoppingLists', listId);
  batch.delete(listRef);
  
  await batch.commit();
}

/**
 * Marca una lista como completada
 * @param {string} householdId - ID del hogar
 * @param {string} listId - ID de la lista
 */
export async function completeList(householdId, listId) {
  await updateList(householdId, listId, {
    status: 'completed',
    completedAt: serverTimestamp()
  });
}

/**
 * Cambia el estado de la lista a "comprando"
 * @param {string} householdId - ID del hogar
 * @param {string} listId - ID de la lista
 */
export async function startShopping(householdId, listId) {
  await updateList(householdId, listId, {
    status: 'shopping'
  });
}

// ============================================
// OPERACIONES CRUD DE ITEMS
// ============================================

/**
 * Añade un item a la lista
 * @param {string} householdId - ID del hogar
 * @param {string} listId - ID de la lista
 * @param {Object} itemData - Datos del item
 * @returns {Promise<string>} ID del item creado
 */
export async function addListItem(householdId, listId, itemData) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const itemsRef = collection(
    db, 
    'households', householdId, 
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
 * @param {string} householdId - ID del hogar
 * @param {string} listId - ID de la lista
 * @param {string} itemId - ID del item
 * @param {Object} updates - Campos a actualizar
 */
export async function updateListItem(householdId, listId, itemId, updates) {
  const itemRef = doc(
    db, 
    'households', householdId, 
    'shoppingLists', listId, 
    'items', itemId
  );
  
  await updateDoc(itemRef, updates);
}

/**
 * Marca/desmarca un item
 * @param {string} householdId - ID del hogar
 * @param {string} listId - ID de la lista
 * @param {string} itemId - ID del item
 * @param {boolean} checked - Estado de marcado
 */
export async function toggleItemChecked(householdId, listId, itemId, checked) {
  const user = getCurrentUser();
  
  const updates = {
    checked,
    checkedBy: checked ? user?.uid : null,
    checkedAt: checked ? serverTimestamp() : null
  };
  
  await updateListItem(householdId, listId, itemId, updates);
}

/**
 * Elimina un item
 * @param {string} householdId - ID del hogar
 * @param {string} listId - ID de la lista
 * @param {string} itemId - ID del item
 */
export async function removeListItem(householdId, listId, itemId) {
  const itemRef = doc(
    db, 
    'households', householdId, 
    'shoppingLists', listId, 
    'items', itemId
  );
  
  await deleteDoc(itemRef);
}

/**
 * Añade múltiples items de una vez
 * @param {string} householdId - ID del hogar
 * @param {string} listId - ID de la lista
 * @param {Array} items - Array de items a añadir
 */
export async function addMultipleItems(householdId, listId, items) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const batch = writeBatch(db);
  const itemsRef = collection(
    db, 
    'households', householdId, 
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
```

---

## Paso 4.2: Patrón Event Bus para Componentes

Todos los componentes Lit siguen este patrón para comunicación desacoplada:

```javascript
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/nickg/lit@3.1.0/lit-all.min.js';
import { eventBus } from '/js/event-bus.js';

export class HcExampleComponent extends LitElement {
  constructor() {
    super();
    // Generar ID único para este componente
    this._componentId = `example-${Math.random().toString(36).substr(2, 9)}`;
    
    // Bind de handlers para poder hacer off después
    this._handleSomeEvent = this._handleSomeEvent.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Suscribirse a eventos
    eventBus.on('some:event', this._handleSomeEvent);
    
    // Registrar componente como listo
    eventBus.registerComponent(this._componentId);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Desuscribirse de eventos
    eventBus.off('some:event', this._handleSomeEvent);
    
    // Desregistrar componente
    eventBus.unregisterComponent(this._componentId);
  }

  _handleSomeEvent(payload) {
    // Verificar si el evento es para este componente (si aplica)
    if (payload.targetId && payload.targetId !== this._componentId) return;
    
    // Procesar evento...
  }

  _emitEvent() {
    // Emitir evento con senderId
    eventBus.emit('another:event', {
      senderId: this._componentId,
      data: { /* ... */ }
    });
  }
}
```

---

## Paso 4.3: Componente Shopping List

### Crear `public/components/hc-shopping-list.js`

```javascript
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/nickg/lit@3.1.0/lit-all.min.js';
import { eventBus } from '/js/event-bus.js';
import {
  subscribeToList,
  subscribeToListItems,
  toggleItemChecked,
  removeListItem,
  addListItem
} from '/js/realtime-sync.js';
import { getCurrentHouseholdId } from '/js/household.js';
import './hc-list-item.js';
import './hc-product-search.js';

export class HcShoppingList extends LitElement {
  static properties = {
    listId: { type: String, attribute: 'list-id' },
    householdId: { type: String, attribute: 'household-id' },
    list: { type: Object, state: true },
    items: { type: Array, state: true },
    groupByCategory: { type: Boolean, state: true },
    showCompleted: { type: Boolean, state: true },
    loading: { type: Boolean, state: true }
  };

  constructor() {
    super();
    this._componentId = `shopping-list-${Math.random().toString(36).substr(2, 9)}`;
    this._handleHouseholdChanged = this._handleHouseholdChanged.bind(this);
    this._handleItemRequest = this._handleItemRequest.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Suscribirse a eventos del bus
    eventBus.on('household:changed', this._handleHouseholdChanged);
    eventBus.on('list:item-request', this._handleItemRequest);
    
    // Registrar componente
    eventBus.registerComponent(this._componentId);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Desuscribirse
    eventBus.off('household:changed', this._handleHouseholdChanged);
    eventBus.off('list:item-request', this._handleItemRequest);
    eventBus.unregisterComponent(this._componentId);
  }

  _handleHouseholdChanged(payload) {
    // Recargar lista si cambia el hogar
    this.householdId = payload.householdId;
    this._setupSubscriptions();
  }

  _handleItemRequest(payload) {
    if (payload.targetId && payload.targetId !== this._componentId) return;
    // Responder con datos de items si alguien los solicita
    eventBus.emit('list:item-response', {
      senderId: this._componentId,
      targetId: payload.senderId,
      items: this.items
    });
  }

  // Notificar cuando la lista cambia
  _notifyListUpdated() {
    eventBus.emit('list:updated', {
      senderId: this._componentId,
      listId: this.listId,
      itemCount: this.items?.length || 0,
      checkedCount: this.items?.filter(i => i.checked).length || 0
    });
  }

  static styles = css`
    :host {
      display: block;
    }
    
    .list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .list-title {
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    .list-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.875rem;
      color: #64748b;
    }
    
    .list-status {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .list-status.pending {
      background: #fef3c7;
      color: #92400e;
    }
    
    .list-status.shopping {
      background: #dbeafe;
      color: #1e40af;
    }
    
    .list-status.completed {
      background: #dcfce7;
      color: #166534;
    }
    
    .list-controls {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    .control-btn {
      padding: 0.375rem 0.75rem;
      background: transparent;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .control-btn:hover {
      background: #f8fafc;
    }
    
    .control-btn.active {
      background: #eff6ff;
      border-color: #2563eb;
      color: #2563eb;
    }
    
    .add-item-section {
      margin-bottom: 1.5rem;
    }
    
    .category-group {
      margin-bottom: 1.5rem;
    }
    
    .category-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0;
      font-weight: 500;
      color: #64748b;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .category-count {
      background: #f1f5f9;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
    }
    
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .progress-bar {
      height: 4px;
      background: #e2e8f0;
      border-radius: 9999px;
      overflow: hidden;
      margin-bottom: 1rem;
    }
    
    .progress-fill {
      height: 100%;
      background: #22c55e;
      transition: width 0.3s ease;
    }
    
    .progress-text {
      font-size: 0.875rem;
      color: #64748b;
      margin-bottom: 0.5rem;
    }
    
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #64748b;
    }
    
    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
  `;

  constructor() {
    super();
    this.list = null;
    this.items = [];
    this.groupByCategory = true;
    this.showCompleted = true;
    this.loading = true;
    this._unsubscribers = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this._setupSubscriptions();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribers.forEach(unsub => unsub());
  }

  _setupSubscriptions() {
    const hId = this.householdId || getCurrentHouseholdId();
    if (!hId || !this.listId) return;

    // Suscribirse a la lista
    const unsubList = subscribeToList(hId, this.listId, (list) => {
      this.list = list;
      this.loading = false;
    });
    this._unsubscribers.push(unsubList);

    // Suscribirse a los items
    const unsubItems = subscribeToListItems(hId, this.listId, (items) => {
      this.items = items;
    });
    this._unsubscribers.push(unsubItems);
  }

  get _checkedCount() {
    return this.items.filter(i => i.checked).length;
  }

  get _progress() {
    if (this.items.length === 0) return 0;
    return Math.round((this._checkedCount / this.items.length) * 100);
  }

  get _groupedItems() {
    if (!this.groupByCategory) {
      return { 'todos': this._filteredItems };
    }

    const groups = {};
    this._filteredItems.forEach(item => {
      const category = item.category || 'otros';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    return groups;
  }

  get _filteredItems() {
    if (this.showCompleted) {
      return this.items;
    }
    return this.items.filter(i => !i.checked);
  }

  async _handleToggleItem(e) {
    const { itemId, checked } = e.detail;
    const hId = this.householdId || getCurrentHouseholdId();
    
    try {
      await toggleItemChecked(hId, this.listId, itemId, checked);
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  }

  async _handleRemoveItem(e) {
    const { itemId } = e.detail;
    const hId = this.householdId || getCurrentHouseholdId();
    
    try {
      await removeListItem(hId, this.listId, itemId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }

  async _handleAddItem(e) {
    const { product } = e.detail;
    const hId = this.householdId || getCurrentHouseholdId();
    
    try {
      await addListItem(hId, this.listId, {
        productId: product.id || null,
        productName: product.name,
        quantity: product.quantity || 1,
        unit: product.unit || 'unidad',
        category: product.category || 'otros'
      });
    } catch (error) {
      console.error('Error adding item:', error);
    }
  }

  _getCategoryIcon(category) {
    const icons = {
      'frutas': '🍎',
      'verduras': '🥬',
      'carnes': '🥩',
      'pescados': '🐟',
      'lácteos': '🥛',
      'panadería': '🍞',
      'bebidas': '🥤',
      'limpieza': '🧹',
      'higiene': '🧴',
      'congelados': '❄️',
      'otros': '📦'
    };
    return icons[category] || '📦';
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Cargando lista...</div>`;
    }

    if (!this.list) {
      return html`<div class="error">Lista no encontrada</div>`;
    }

    return html`
      <div class="list-header">
        <div>
          <h1 class="list-title">${this.list.name}</h1>
          <div class="list-meta">
            ${this.list.store ? html`<span>📍 ${this.list.store}</span>` : ''}
            ${this.list.scheduledDate ? html`
              <span>📅 ${this.list.scheduledDate.toLocaleDateString()}</span>
            ` : ''}
          </div>
        </div>
        <span class="list-status ${this.list.status}">${this.list.status}</span>
      </div>
      
      <div class="progress-text">
        ${this._checkedCount} de ${this.items.length} items (${this._progress}%)
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${this._progress}%"></div>
      </div>
      
      <div class="list-controls">
        <button 
          class="control-btn ${this.groupByCategory ? 'active' : ''}"
          @click=${() => this.groupByCategory = !this.groupByCategory}
        >
          📁 Agrupar
        </button>
        <button 
          class="control-btn ${this.showCompleted ? 'active' : ''}"
          @click=${() => this.showCompleted = !this.showCompleted}
        >
          ✓ Mostrar comprados
        </button>
      </div>
      
      <div class="add-item-section">
        <hc-product-search
          household-id=${this.householdId || getCurrentHouseholdId()}
          @product-selected=${this._handleAddItem}
        ></hc-product-search>
      </div>
      
      ${this.items.length === 0 ? html`
        <div class="empty-state">
          <div class="empty-state-icon">🛒</div>
          <p>La lista está vacía. ¡Añade productos!</p>
        </div>
      ` : html`
        ${Object.entries(this._groupedItems).map(([category, items]) => html`
          <div class="category-group">
            ${this.groupByCategory ? html`
              <div class="category-header">
                <span>${this._getCategoryIcon(category)}</span>
                <span>${category}</span>
                <span class="category-count">${items.length}</span>
              </div>
            ` : ''}
            <div class="items-list">
              ${items.map(item => html`
                <hc-list-item
                  .item=${item}
                  @toggle=${this._handleToggleItem}
                  @remove=${this._handleRemoveItem}
                ></hc-list-item>
              `)}
            </div>
          </div>
        `)}
      `}
    `;
  }
}

customElements.define('hc-shopping-list', HcShoppingList);
```

---

## Paso 4.3: Componente List Item

### Crear `public/components/hc-list-item.js`

```javascript
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/nickg/lit@3.1.0/lit-all.min.js';

export class HcListItem extends LitElement {
  static properties = {
    item: { type: Object },
    expanded: { type: Boolean, state: true }
  };

  static styles = css`
    :host {
      display: block;
    }
    
    .item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      transition: all 0.15s ease;
    }
    
    .item:hover {
      border-color: #cbd5e1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    
    .item.checked {
      background: #f8fafc;
      opacity: 0.7;
    }
    
    .item.checked .item-name {
      text-decoration: line-through;
      color: #94a3b8;
    }
    
    .checkbox {
      width: 22px;
      height: 22px;
      border: 2px solid #cbd5e1;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    
    .checkbox:hover {
      border-color: #22c55e;
    }
    
    .checkbox.checked {
      background: #22c55e;
      border-color: #22c55e;
      color: white;
    }
    
    .item-content {
      flex: 1;
      min-width: 0;
    }
    
    .item-main {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .item-name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .item-quantity {
      font-size: 0.875rem;
      color: #64748b;
      white-space: nowrap;
    }
    
    .item-meta {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }
    
    .item-notes {
      font-size: 0.875rem;
      color: #64748b;
      font-style: italic;
      margin-top: 0.25rem;
      padding-top: 0.25rem;
      border-top: 1px dashed #e2e8f0;
    }
    
    .item-actions {
      display: flex;
      gap: 0.25rem;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    
    .item:hover .item-actions {
      opacity: 1;
    }
    
    .action-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: 0.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      transition: background 0.15s ease;
    }
    
    .action-btn:hover {
      background: #f1f5f9;
    }
    
    .action-btn.danger:hover {
      background: #fef2f2;
    }
  `;

  constructor() {
    super();
    this.expanded = false;
  }

  _handleToggle() {
    this.dispatchEvent(new CustomEvent('toggle', {
      detail: {
        itemId: this.item.id,
        checked: !this.item.checked
      },
      bubbles: true,
      composed: true
    }));
  }

  _handleRemove() {
    this.dispatchEvent(new CustomEvent('remove', {
      detail: { itemId: this.item.id },
      bubbles: true,
      composed: true
    }));
  }

  _toggleExpanded() {
    this.expanded = !this.expanded;
  }

  render() {
    const { item } = this;
    if (!item) return null;

    return html`
      <div class="item ${item.checked ? 'checked' : ''}">
        <div 
          class="checkbox ${item.checked ? 'checked' : ''}"
          @click=${this._handleToggle}
        >
          ${item.checked ? '✓' : ''}
        </div>
        
        <div class="item-content" @click=${this._toggleExpanded}>
          <div class="item-main">
            <span class="item-name">${item.productName}</span>
            <span class="item-quantity">
              ${item.quantity} ${item.unit}
            </span>
          </div>
          
          ${item.checked && item.checkedAt ? html`
            <div class="item-meta">
              Comprado ${item.checkedAt.toLocaleTimeString()}
            </div>
          ` : ''}
          
          ${this.expanded && item.notes ? html`
            <div class="item-notes">📝 ${item.notes}</div>
          ` : ''}
        </div>
        
        <div class="item-actions">
          ${item.notes ? html`
            <button class="action-btn" @click=${this._toggleExpanded}>
              ${this.expanded ? '▲' : '▼'}
            </button>
          ` : ''}
          <button class="action-btn danger" @click=${this._handleRemove}>
            🗑️
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('hc-list-item', HcListItem);
```

---

## Paso 4.4: Componente Product Search

### Crear `public/components/hc-product-search.js`

```javascript
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/nickg/lit@3.1.0/lit-all.min.js';
import { searchProducts, getMostUsedProducts } from '/js/db.js';

export class HcProductSearch extends LitElement {
  static properties = {
    householdId: { type: String, attribute: 'household-id' },
    query: { type: String, state: true },
    suggestions: { type: Array, state: true },
    recentProducts: { type: Array, state: true },
    showSuggestions: { type: Boolean, state: true },
    selectedQuantity: { type: Number, state: true },
    loading: { type: Boolean, state: true }
  };

  static styles = css`
    :host {
      display: block;
      position: relative;
    }
    
    .search-container {
      display: flex;
      gap: 0.5rem;
    }
    
    .search-input-wrapper {
      flex: 1;
      position: relative;
    }
    
    .search-input {
      width: 100%;
      padding: 0.75rem 1rem;
      padding-left: 2.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      transition: all 0.15s ease;
    }
    
    .search-input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    
    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
    }
    
    .quantity-input {
      width: 80px;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      text-align: center;
    }
    
    .add-btn {
      padding: 0.75rem 1.5rem;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    
    .add-btn:hover {
      background: #1d4ed8;
    }
    
    .add-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
    
    .suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 0.25rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      max-height: 300px;
      overflow-y: auto;
      z-index: 100;
    }
    
    .suggestions-header {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    
    .suggestion-item:hover {
      background: #f8fafc;
    }
    
    .suggestion-icon {
      font-size: 1.25rem;
    }
    
    .suggestion-info {
      flex: 1;
    }
    
    .suggestion-name {
      font-weight: 500;
    }
    
    .suggestion-meta {
      font-size: 0.75rem;
      color: #64748b;
    }
    
    .new-product {
      border-top: 1px solid #e2e8f0;
      color: #2563eb;
    }
    
    .new-product .suggestion-name {
      color: #2563eb;
    }
  `;

  constructor() {
    super();
    this.query = '';
    this.suggestions = [];
    this.recentProducts = [];
    this.showSuggestions = false;
    this.selectedQuantity = 1;
    this.loading = false;
    this._debounceTimer = null;
  }

  async connectedCallback() {
    super.connectedCallback();
    await this._loadRecentProducts();
    
    // Cerrar sugerencias al hacer clic fuera
    this._handleClickOutside = (e) => {
      if (!this.contains(e.target)) {
        this.showSuggestions = false;
      }
    };
    document.addEventListener('click', this._handleClickOutside);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleClickOutside);
  }

  async _loadRecentProducts() {
    if (!this.householdId) return;
    
    try {
      this.recentProducts = await getMostUsedProducts(this.householdId, 5);
    } catch (error) {
      console.error('Error loading recent products:', error);
    }
  }

  _handleInput(e) {
    this.query = e.target.value;
    this.showSuggestions = true;
    
    // Debounce la búsqueda
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._search(), 200);
  }

  async _search() {
    if (!this.query.trim() || !this.householdId) {
      this.suggestions = [];
      return;
    }

    this.loading = true;
    try {
      this.suggestions = await searchProducts(this.householdId, this.query);
    } catch (error) {
      console.error('Error searching products:', error);
    }
    this.loading = false;
  }

  _handleFocus() {
    this.showSuggestions = true;
  }

  _selectProduct(product) {
    this.dispatchEvent(new CustomEvent('product-selected', {
      detail: {
        product: {
          ...product,
          quantity: this.selectedQuantity
        }
      },
      bubbles: true,
      composed: true
    }));
    
    // Reset
    this.query = '';
    this.selectedQuantity = 1;
    this.showSuggestions = false;
    this.suggestions = [];
  }

  _addNewProduct() {
    if (!this.query.trim()) return;
    
    this._selectProduct({
      name: this.query.trim(),
      category: 'otros',
      unit: 'unidad'
    });
  }

  _handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.suggestions.length > 0) {
        this._selectProduct(this.suggestions[0]);
      } else if (this.query.trim()) {
        this._addNewProduct();
      }
    }
  }

  _getCategoryIcon(category) {
    const icons = {
      'frutas': '🍎',
      'verduras': '🥬',
      'carnes': '🥩',
      'pescados': '🐟',
      'lácteos': '🥛',
      'panadería': '🍞',
      'bebidas': '🥤',
      'limpieza': '🧹',
      'higiene': '🧴',
      'congelados': '❄️',
      'otros': '📦'
    };
    return icons[category] || '📦';
  }

  render() {
    const showRecent = this.showSuggestions && !this.query && this.recentProducts.length > 0;
    const showResults = this.showSuggestions && this.query;

    return html`
      <div class="search-container">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Buscar o añadir producto..."
            .value=${this.query}
            @input=${this._handleInput}
            @focus=${this._handleFocus}
            @keydown=${this._handleKeyDown}
          />
          
          ${showRecent ? html`
            <div class="suggestions">
              <div class="suggestions-header">Productos frecuentes</div>
              ${this.recentProducts.map(product => html`
                <div class="suggestion-item" @click=${() => this._selectProduct(product)}>
                  <span class="suggestion-icon">${this._getCategoryIcon(product.category)}</span>
                  <div class="suggestion-info">
                    <div class="suggestion-name">${product.name}</div>
                    <div class="suggestion-meta">${product.category}</div>
                  </div>
                </div>
              `)}
            </div>
          ` : ''}
          
          ${showResults ? html`
            <div class="suggestions">
              ${this.suggestions.length > 0 ? html`
                <div class="suggestions-header">Productos</div>
                ${this.suggestions.map(product => html`
                  <div class="suggestion-item" @click=${() => this._selectProduct(product)}>
                    <span class="suggestion-icon">${this._getCategoryIcon(product.category)}</span>
                    <div class="suggestion-info">
                      <div class="suggestion-name">${product.name}</div>
                      <div class="suggestion-meta">
                        ${product.brand ? `${product.brand} · ` : ''}${product.category}
                      </div>
                    </div>
                  </div>
                `)}
              ` : ''}
              
              <div class="suggestion-item new-product" @click=${this._addNewProduct}>
                <span class="suggestion-icon">➕</span>
                <div class="suggestion-info">
                  <div class="suggestion-name">Añadir "${this.query}"</div>
                  <div class="suggestion-meta">Crear nuevo producto</div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
        
        <input
          type="number"
          class="quantity-input"
          min="1"
          .value=${this.selectedQuantity}
          @change=${(e) => this.selectedQuantity = parseInt(e.target.value) || 1}
        />
        
        <button 
          class="add-btn" 
          ?disabled=${!this.query.trim()}
          @click=${this._addNewProduct}
        >
          Añadir
        </button>
      </div>
    `;
  }
}

customElements.define('hc-product-search', HcProductSearch);
```

---

## Paso 4.5: Páginas de Listas

### Crear `src/pages/app/lists/index.astro`

```astro
---
import AppLayout from '../../../layouts/AppLayout.astro';
---

<AppLayout title="Mis Listas">
  <div class="lists-page">
    <header class="page-header">
      <div>
        <h1>Mis Listas</h1>
        <p>Gestiona tus listas de la compra</p>
      </div>
      <a href="/app/lists/new" class="btn btn-primary">+ Nueva lista</a>
    </header>
    
    <div class="lists-tabs">
      <button class="tab active" data-status="pending">Pendientes</button>
      <button class="tab" data-status="shopping">En curso</button>
      <button class="tab" data-status="completed">Completadas</button>
    </div>
    
    <div id="lists-container" class="lists-grid">
      <p class="loading">Cargando listas...</p>
    </div>
  </div>
</AppLayout>

<script type="module">
  import { subscribeToLists } from '/js/realtime-sync.js';
  import { getCurrentHouseholdId } from '/js/household.js';
  
  let allLists = [];
  let activeStatus = 'pending';
  
  window.addEventListener('auth-ready', () => {
    const householdId = getCurrentHouseholdId();
    if (!householdId) {
      document.getElementById('lists-container').innerHTML = `
        <div class="empty-state">
          <p>Primero necesitas crear o unirte a una casa.</p>
          <a href="/app/settings/household" class="btn btn-primary">Configurar casa</a>
        </div>
      `;
      return;
    }
    
    subscribeToLists(householdId, (lists) => {
      allLists = lists;
      renderLists();
    });
  });
  
  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeStatus = tab.dataset.status;
      renderLists();
    });
  });
  
  function renderLists() {
    const container = document.getElementById('lists-container');
    const filtered = allLists.filter(l => l.status === activeStatus);
    
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No hay listas ${activeStatus === 'pending' ? 'pendientes' : activeStatus === 'shopping' ? 'en curso' : 'completadas'}.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = filtered.map(list => `
      <a href="/app/lists/${list.id}" class="list-card">
        <div class="list-card-header">
          <h3>${list.name}</h3>
          <span class="list-status ${list.status}">${list.status}</span>
        </div>
        ${list.store ? `<p class="list-store">📍 ${list.store}</p>` : ''}
        ${list.scheduledDate ? `<p class="list-date">📅 ${list.scheduledDate.toLocaleDateString()}</p>` : ''}
        ${list.isRecurring ? `<p class="list-recurring">🔄 Recurrente</p>` : ''}
      </a>
    `).join('');
  }
</script>

<style>
  .lists-page {
    max-width: 1000px;
  }
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xl);
  }
  
  .page-header h1 {
    margin-bottom: var(--space-xs);
  }
  
  .page-header p {
    color: var(--color-text-secondary);
  }
  
  .lists-tabs {
    display: flex;
    gap: var(--space-xs);
    margin-bottom: var(--space-lg);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-xs);
  }
  
  .tab {
    padding: var(--space-sm) var(--space-md);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }
  
  .tab:hover {
    background: var(--color-bg-secondary);
  }
  
  .tab.active {
    background: var(--color-primary);
    color: white;
  }
  
  .lists-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-md);
  }
  
  .list-card {
    display: block;
    padding: var(--space-lg);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: inherit;
    transition: all var(--transition-fast);
  }
  
  .list-card:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
  
  .list-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-sm);
  }
  
  .list-card-header h3 {
    font-size: var(--font-size-lg);
  }
  
  .list-status {
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .list-status.pending {
    background: #fef3c7;
    color: #92400e;
  }
  
  .list-status.shopping {
    background: #dbeafe;
    color: #1e40af;
  }
  
  .list-status.completed {
    background: #dcfce7;
    color: #166534;
  }
  
  .list-store,
  .list-date,
  .list-recurring {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin-top: var(--space-xs);
  }
  
  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: var(--space-xl);
    color: var(--color-text-secondary);
  }
</style>
```

### Crear `src/pages/app/lists/[id].astro`

```astro
---
import AppLayout from '../../../layouts/AppLayout.astro';

const { id } = Astro.params;
---

<AppLayout title="Lista de la Compra">
  <div class="list-detail-page">
    <a href="/app/lists" class="back-link">← Volver a listas</a>
    <hc-shopping-list list-id={id}></hc-shopping-list>
  </div>
</AppLayout>

<script type="module">
  import '/components/hc-shopping-list.js';
</script>

<style>
  .list-detail-page {
    max-width: 800px;
  }
  
  .back-link {
    display: inline-block;
    margin-bottom: var(--space-lg);
    color: var(--color-text-secondary);
    text-decoration: none;
  }
  
  .back-link:hover {
    color: var(--color-primary);
  }
</style>
```

### Crear `src/pages/app/lists/new.astro`

```astro
---
import AppLayout from '../../../layouts/AppLayout.astro';
---

<AppLayout title="Nueva Lista">
  <div class="new-list-page">
    <a href="/app/lists" class="back-link">← Volver a listas</a>
    
    <h1>Crear Nueva Lista</h1>
    
    <form id="new-list-form" class="form">
      <div class="form-group">
        <label for="name">Nombre de la lista *</label>
        <input type="text" id="name" required placeholder="Ej: Compra semanal" />
      </div>
      
      <div class="form-group">
        <label for="store">Tienda</label>
        <input type="text" id="store" placeholder="Ej: Carrefour" />
      </div>
      
      <div class="form-group">
        <label for="date">Fecha programada</label>
        <input type="date" id="date" />
      </div>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="recurring" />
          Lista recurrente
        </label>
      </div>
      
      <div id="recurring-options" class="recurring-options" hidden>
        <div class="form-group">
          <label for="frequency">Frecuencia</label>
          <select id="frequency">
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quincenal</option>
            <option value="monthly">Mensual</option>
          </select>
        </div>
      </div>
      
      <div class="form-actions">
        <a href="/app/lists" class="btn btn-secondary">Cancelar</a>
        <button type="submit" class="btn btn-primary">Crear lista</button>
      </div>
    </form>
  </div>
</AppLayout>

<script type="module">
  import { createList } from '/js/realtime-sync.js';
  import { getCurrentHouseholdId } from '/js/household.js';
  
  const form = document.getElementById('new-list-form');
  const recurringCheckbox = document.getElementById('recurring');
  const recurringOptions = document.getElementById('recurring-options');
  
  recurringCheckbox.addEventListener('change', () => {
    recurringOptions.hidden = !recurringCheckbox.checked;
  });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const householdId = getCurrentHouseholdId();
    if (!householdId) {
      alert('Primero debes configurar una casa');
      return;
    }
    
    const name = document.getElementById('name').value;
    const store = document.getElementById('store').value;
    const date = document.getElementById('date').value;
    const isRecurring = recurringCheckbox.checked;
    const frequency = document.getElementById('frequency').value;
    
    try {
      const listId = await createList(householdId, {
        name,
        store,
        scheduledDate: date || null,
        isRecurring,
        recurringPattern: isRecurring ? { frequency } : null
      });
      
      window.location.href = `/app/lists/${listId}`;
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Error al crear la lista: ' + error.message);
    }
  });
</script>

<style>
  .new-list-page {
    max-width: 500px;
  }
  
  .back-link {
    display: inline-block;
    margin-bottom: var(--space-lg);
    color: var(--color-text-secondary);
    text-decoration: none;
  }
  
  h1 {
    margin-bottom: var(--space-xl);
  }
  
  .form-group {
    margin-bottom: var(--space-lg);
  }
  
  .form-group label {
    display: block;
    margin-bottom: var(--space-xs);
    font-weight: 500;
  }
  
  .form-group input[type="text"],
  .form-group input[type="date"],
  .form-group select {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    cursor: pointer;
  }
  
  .recurring-options {
    padding: var(--space-md);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-lg);
  }
  
  .form-actions {
    display: flex;
    gap: var(--space-sm);
    justify-content: flex-end;
  }
</style>
```

---

## Paso 4.6: Commit de la fase

```bash
git add .
git commit -m "feat(lists): implement realtime shopping lists

- Add realtime-sync service with Firestore subscriptions
- Create hc-shopping-list component with live updates
- Create hc-list-item component with check/remove
- Create hc-product-search with autocomplete
- Add list pages (index, detail, new)
- Implement grouped view by category
- Add progress tracking for lists"
```

---

## ✅ Checklist de la Fase 4

- [ ] Realtime sync service con suscripciones
- [ ] CRUD completo de listas
- [ ] CRUD completo de items
- [ ] Componente hc-shopping-list en tiempo real
- [ ] Componente hc-list-item con toggle
- [ ] Componente hc-product-search con autocomplete
- [ ] Página de listado de listas con filtros
- [ ] Página de detalle de lista
- [ ] Página de crear nueva lista
- [ ] Agrupación por categorías
- [ ] Barra de progreso de items

---

## 🔗 Siguiente Fase

→ [05-catalogo-productos.md](./05-catalogo-productos.md)

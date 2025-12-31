import { LitElement, html, css } from '/js/vendor/lit.bundle.js';
import { eventBus } from '/js/event-bus.js';
import { db } from '/js/firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  increment
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getCurrentUser } from '/js/auth.js';
import { getCurrentGroupId } from '/js/group.js';
import { searchProducts, UNITS, PRODUCT_CATEGORIES, GENERAL_CATEGORIES, PRIORITIES } from '/js/db.js';
import './hc-list-item.js';

export class HcShoppingList extends LitElement {
  static properties = {
    listId: { type: String, attribute: 'list-id' },
    userId: { type: String, attribute: 'user-id' },
    listType: { type: String, attribute: 'list-type' }, // 'shopping' or 'agnostic'
    items: { type: Array, state: true },
    members: { type: Array, state: true },
    groupByCategory: { type: Boolean, state: true },
    showCompleted: { type: Boolean, state: true },
    filterByAssignee: { type: String, state: true },
    loading: { type: Boolean, state: true },
    newItemName: { type: String, state: true },
    newItemQuantity: { type: Number, state: true },
    newItemUnit: { type: String, state: true },
    newItemNotes: { type: String, state: true }, // Para listas agnósticas
    newItemPriority: { type: String, state: true }, // Para listas agnósticas
    suggestions: { type: Array, state: true },
    showSuggestions: { type: Boolean, state: true },
    selectedSuggestionIndex: { type: Number, state: true },
    mode: { type: String, state: true }, // 'shopping' or 'edit'
    // Estado para edición de items
    editingItem: { type: Object, state: true },
    editItemName: { type: String, state: true },
    editItemQuantity: { type: Number, state: true },
    editItemUnit: { type: String, state: true },
    editItemNotes: { type: String, state: true },
    editItemPriority: { type: String, state: true }
  };

  static styles = css`
    :host {
      display: block;
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

    .mode-toggle {
      display: flex;
      background: #f1f5f9;
      border-radius: 0.5rem;
      padding: 0.25rem;
      margin-bottom: 1rem;
    }

    .mode-btn {
      flex: 1;
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      color: #64748b;
    }

    .mode-btn:hover {
      color: #334155;
    }

    .mode-btn.active {
      background: white;
      color: #2563eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .filter-select {
      padding: 0.375rem 0.75rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .filter-select:focus {
      outline: none;
      border-color: #2563eb;
    }

    .add-item-section {
      margin-bottom: 1.5rem;
    }

    .add-item-form {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: flex-end;
    }

    .input-group {
      position: relative;
      flex: 1;
      min-width: 200px;
    }

    .input-group label {
      display: block;
      font-size: 0.75rem;
      color: #64748b;
      margin-bottom: 0.25rem;
    }

    .add-item-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      transition: border-color 0.15s ease;
      box-sizing: border-box;
    }

    .add-item-input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      z-index: 100;
      max-height: 200px;
      overflow-y: auto;
      margin-top: 2px;
    }

    .suggestion-item {
      padding: 0.75rem 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background 0.1s ease;
    }

    .suggestion-item:hover,
    .suggestion-item.selected {
      background: #f1f5f9;
    }

    .suggestion-icon {
      font-size: 1.25rem;
    }

    .suggestion-name {
      flex: 1;
    }

    .suggestion-category {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .quantity-input {
      width: 70px;
    }

    .quantity-input input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      text-align: center;
    }

    .quantity-input input:focus {
      outline: none;
      border-color: #2563eb;
    }

    .unit-select {
      width: 130px;
    }

    .unit-select select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      background: white;
      cursor: pointer;
    }

    .unit-select select:focus {
      outline: none;
      border-color: #2563eb;
    }

    .add-btn {
      padding: 0.75rem 1.5rem;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
      height: fit-content;
    }

    .add-btn:hover {
      background: #1d4ed8;
    }

    .add-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
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

    .loading {
      text-align: center;
      padding: 2rem;
      color: #64748b;
    }

    .error {
      text-align: center;
      padding: 2rem;
      color: #dc2626;
    }

    /* Estilos para formulario agnóstico */
    .notes-input {
      flex: 1;
      min-width: 150px;
    }

    .notes-input textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      resize: none;
      font-family: inherit;
      box-sizing: border-box;
    }

    .notes-input textarea:focus {
      outline: none;
      border-color: #2563eb;
    }

    .priority-select {
      width: 120px;
    }

    .priority-select select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      background: white;
      cursor: pointer;
    }

    .priority-select select:focus {
      outline: none;
      border-color: #2563eb;
    }

    /* Modal de edición */
    .edit-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .edit-modal {
      background: white;
      border-radius: 0.75rem;
      padding: 1.5rem;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .edit-modal h3 {
      margin: 0 0 1rem 0;
      font-size: 1.125rem;
    }

    .edit-modal .form-group {
      margin-bottom: 1rem;
    }

    .edit-modal label {
      display: block;
      font-size: 0.875rem;
      color: #64748b;
      margin-bottom: 0.25rem;
    }

    .edit-modal input,
    .edit-modal select,
    .edit-modal textarea {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      font-size: 1rem;
      box-sizing: border-box;
    }

    .edit-modal input:focus,
    .edit-modal select:focus,
    .edit-modal textarea:focus {
      outline: none;
      border-color: #2563eb;
    }

    .edit-modal textarea {
      resize: vertical;
      min-height: 60px;
      font-family: inherit;
    }

    .edit-modal-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    .edit-modal-actions button {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-cancel {
      background: transparent;
      border: 1px solid #e2e8f0;
      color: #64748b;
    }

    .btn-cancel:hover {
      background: #f8fafc;
    }

    .btn-save {
      background: #2563eb;
      border: none;
      color: white;
    }

    .btn-save:hover {
      background: #1d4ed8;
    }
  `;

  constructor() {
    super();
    this._componentId = `shopping-list-${Math.random().toString(36).substr(2, 9)}`;
    this.items = [];
    this.members = [];
    this.listType = 'shopping';
    this.groupByCategory = true;
    this.showCompleted = true;
    this.filterByAssignee = '';
    this.loading = true;
    this.newItemName = '';
    this.newItemQuantity = 1;
    this.newItemUnit = 'unidad';
    this.newItemNotes = '';
    this.newItemPriority = '';
    this.suggestions = [];
    this.showSuggestions = false;
    this.selectedSuggestionIndex = -1;
    this.mode = 'shopping'; // Default to shopping mode
    this._searchTimeout = null;
    this._unsubscribers = [];
    this._subscribedPath = null; // Para evitar suscripciones duplicadas
    // Estado de edición
    this.editingItem = null;
    this.editItemName = '';
    this.editItemQuantity = 1;
    this.editItemUnit = 'unidad';
    this.editItemNotes = '';
    this.editItemPriority = '';
  }

  connectedCallback() {
    super.connectedCallback();
    eventBus.registerComponent(this._componentId);

    // Esperar a que tengamos userId y listId
    if (this.userId && this.listId) {
      this._setupSubscriptions();
    }
  }

  updated(changedProperties) {
    if ((changedProperties.has('userId') || changedProperties.has('listId')) && this.userId && this.listId) {
      this._setupSubscriptions();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribers.forEach(unsub => unsub());
    this._subscribedPath = null;
    eventBus.unregisterComponent(this._componentId);
  }

  async _setupSubscriptions() {
    if (!this.userId || !this.listId) return;

    // Evitar suscripciones duplicadas al mismo path
    const newPath = `${this.userId}/${this.listId}`;
    if (this._subscribedPath === newPath) return;

    // Limpiar suscripciones anteriores
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
    this._subscribedPath = newPath;

    // Suscribirse a la lista para obtener groupIds
    const listRef = doc(db, 'users', this.userId, 'lists', this.listId);
    const unsubList = onSnapshot(listRef, async (snapshot) => {
      if (snapshot.exists()) {
        const listData = snapshot.data();
        const groupIds = listData.groupIds || [];

        // Cargar miembros de todos los grupos
        await this._loadMembersFromGroups(groupIds);
      }
    });
    this._unsubscribers.push(unsubList);

    // Suscribirse a los items de la lista
    const itemsRef = collection(db, 'users', this.userId, 'lists', this.listId, 'items');
    const q = query(itemsRef, orderBy('createdAt', 'desc'));

    const unsubItems = onSnapshot(q, (snapshot) => {
      this.items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.loading = false;
    }, (error) => {
      console.error('Error en suscripción a items:', error);
      this.loading = false;
    });
    this._unsubscribers.push(unsubItems);
  }

  async _loadMembersFromGroups(groupIds) {
    if (!groupIds || groupIds.length === 0) {
      this.members = [];
      return;
    }

    try {
      const allMembers = new Map();

      for (const groupId of groupIds) {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          const membersMap = groupData.members || {};

          Object.entries(membersMap).forEach(([uid, memberData]) => {
            if (!allMembers.has(uid)) {
              allMembers.set(uid, {
                id: uid,
                displayName: memberData.displayName,
                email: memberData.email,
                photoURL: memberData.photoURL
              });
            }
          });
        }
      }

      this.members = Array.from(allMembers.values());
    } catch (error) {
      console.error('Error loading members:', error);
      this.members = [];
    }
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
    let filtered = this.items;

    if (!this.showCompleted) {
      filtered = filtered.filter(i => !i.checked);
    }

    if (this.filterByAssignee) {
      if (this.filterByAssignee === 'unassigned') {
        filtered = filtered.filter(i => !i.assignedTo);
      } else {
        filtered = filtered.filter(i => i.assignedTo === this.filterByAssignee);
      }
    }

    return filtered;
  }

  async _handleAddItem(e) {
    e.preventDefault();

    const name = this.newItemName.trim();
    if (!name || !this.userId || !this.listId) return;

    const isAgnostic = this.listType === 'agnostic';

    try {
      const itemsRef = collection(db, 'users', this.userId, 'lists', this.listId, 'items');

      // Encontrar la categoría si hay un producto sugerido seleccionado
      let category = isAgnostic ? 'general_otros' : 'otros';
      if (this._selectedProduct?.category) {
        category = this._selectedProduct.category;
      }

      // Datos base del item
      const itemData = {
        name,
        category,
        checked: false,
        createdAt: serverTimestamp(),
        createdBy: this.userId,
        itemType: isAgnostic ? 'general' : 'shopping'
      };

      // Añadir campos específicos según el tipo de lista
      if (isAgnostic) {
        itemData.notes = this.newItemNotes || null;
        itemData.priority = this.newItemPriority || null;
      } else {
        itemData.quantity = this.newItemQuantity || 1;
        itemData.unit = this.newItemUnit || 'unidad';
      }

      await addDoc(itemsRef, itemData);

      // Actualizar contador de la lista
      const listRef = doc(db, 'users', this.userId, 'lists', this.listId);
      await updateDoc(listRef, {
        itemCount: increment(1),
        updatedAt: serverTimestamp()
      });

      // Sincronizar con el catálogo de productos del grupo (solo para listas de compra)
      if (!isAgnostic) {
        const groupId = getCurrentGroupId();
        if (groupId && !this._selectedProduct) {
          this._addToProductCatalog(groupId, name.toLowerCase(), category);
        }
      }

      // Resetear formulario
      this.newItemName = '';
      this.newItemQuantity = 1;
      this.newItemUnit = 'unidad';
      this.newItemNotes = '';
      this.newItemPriority = '';
      this.suggestions = [];
      this.showSuggestions = false;
      this._selectedProduct = null;
    } catch (error) {
      console.error('Error adding item:', error);
    }
  }

  async _addToProductCatalog(groupId, name, category) {
    try {
      // Verificar si el producto ya existe en el catálogo
      const productsRef = collection(db, 'groups', groupId, 'products');
      const { getDocs, query: firestoreQuery, where } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
      const q = firestoreQuery(productsRef, where('normalizedName', '==', name));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Producto no existe, añadirlo al catálogo
        await addDoc(productsRef, {
          name,
          normalizedName: name,
          category: category || 'otros',
          createdAt: serverTimestamp(),
          createdBy: this.userId
        });
      }
    } catch (error) {
      // Error silencioso - no es crítico si falla
      console.warn('Could not sync product to catalog:', error);
    }
  }

  async _handleToggleItem(e) {
    const { itemId, checked } = e.detail;

    if (!this.userId || !this.listId) return;

    try {
      const itemRef = doc(db, 'users', this.userId, 'lists', this.listId, 'items', itemId);
      const user = getCurrentUser();

      await updateDoc(itemRef, {
        checked,
        checkedBy: checked ? user?.uid : null,
        checkedAt: checked ? serverTimestamp() : null
      });

      // Actualizar timestamp de la lista
      const listRef = doc(db, 'users', this.userId, 'lists', this.listId);
      await updateDoc(listRef, { updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  }

  async _handleRemoveItem(e) {
    const { itemId } = e.detail;

    if (!this.userId || !this.listId) return;

    try {
      const itemRef = doc(db, 'users', this.userId, 'lists', this.listId, 'items', itemId);
      await deleteDoc(itemRef);

      // Actualizar contador de la lista
      const listRef = doc(db, 'users', this.userId, 'lists', this.listId);
      await updateDoc(listRef, {
        itemCount: increment(-1),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }

  async _handleAssignItem(e) {
    const { itemId, assignedTo } = e.detail;

    if (!this.userId || !this.listId) return;

    try {
      const itemRef = doc(db, 'users', this.userId, 'lists', this.listId, 'items', itemId);
      await updateDoc(itemRef, {
        assignedTo: assignedTo,
        assignedAt: assignedTo ? serverTimestamp() : null
      });

      // Actualizar timestamp de la lista
      const listRef = doc(db, 'users', this.userId, 'lists', this.listId);
      await updateDoc(listRef, { updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Error assigning item:', error);
    }
  }

  _handleEditItem(e) {
    const { item } = e.detail;
    this.editingItem = item;
    this.editItemName = item.name;
    this.editItemQuantity = item.quantity || 1;
    this.editItemUnit = item.unit || 'unidad';
    this.editItemNotes = item.notes || '';
    this.editItemPriority = item.priority || '';
  }

  _handleCancelEdit() {
    this.editingItem = null;
    this.editItemName = '';
    this.editItemQuantity = 1;
    this.editItemUnit = 'unidad';
    this.editItemNotes = '';
    this.editItemPriority = '';
  }

  async _handleSaveEdit(e) {
    e.preventDefault();

    if (!this.editingItem || !this.userId || !this.listId) return;

    const isAgnostic = this.listType === 'agnostic';

    try {
      const itemRef = doc(db, 'users', this.userId, 'lists', this.listId, 'items', this.editingItem.id);

      const updates = {
        name: this.editItemName.trim(),
        updatedAt: serverTimestamp()
      };

      if (isAgnostic) {
        updates.notes = this.editItemNotes || null;
        updates.priority = this.editItemPriority || null;
      } else {
        updates.quantity = this.editItemQuantity || 1;
        updates.unit = this.editItemUnit || 'unidad';
      }

      await updateDoc(itemRef, updates);

      // Actualizar timestamp de la lista
      const listRef = doc(db, 'users', this.userId, 'lists', this.listId);
      await updateDoc(listRef, { updatedAt: serverTimestamp() });

      this._handleCancelEdit();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  }

  _handleFilterChange(e) {
    this.filterByAssignee = e.target.value;
  }

  _getCategoryIcon(category) {
    // Buscar en categorías de producto
    const productCat = PRODUCT_CATEGORIES.find(c => c.id === category);
    if (productCat) return productCat.icon;

    // Buscar en categorías generales
    const generalCat = GENERAL_CATEGORIES.find(c => c.id === category);
    if (generalCat) return generalCat.icon;

    return '📦';
  }

  _getCategoryName(category) {
    // Buscar en categorías de producto
    const productCat = PRODUCT_CATEGORIES.find(c => c.id === category);
    if (productCat) return productCat.name;

    // Buscar en categorías generales
    const generalCat = GENERAL_CATEGORIES.find(c => c.id === category);
    if (generalCat) return generalCat.name;

    return category;
  }

  _handleNotesChange(e) {
    this.newItemNotes = e.target.value;
  }

  _handlePriorityChange(e) {
    this.newItemPriority = e.target.value;
  }

  async _handleInputChange(e) {
    this.newItemName = e.target.value;
    this._selectedProduct = null;

    // Debounce search
    if (this._searchTimeout) {
      clearTimeout(this._searchTimeout);
    }

    const query = e.target.value.trim();
    if (query.length < 2) {
      this.suggestions = [];
      this.showSuggestions = false;
      return;
    }

    this._searchTimeout = setTimeout(async () => {
      try {
        const groupId = getCurrentGroupId();
        if (groupId) {
          const results = await searchProducts(groupId, query, 5);
          this.suggestions = results;
          this.showSuggestions = results.length > 0;
          this.selectedSuggestionIndex = -1;
        }
      } catch (error) {
        console.warn('Error searching products:', error);
      }
    }, 200);
  }

  _handleKeyDown(e) {
    if (this.showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedSuggestionIndex = Math.min(
          this.selectedSuggestionIndex + 1,
          this.suggestions.length - 1
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
      } else if (e.key === 'Enter' && this.selectedSuggestionIndex >= 0) {
        e.preventDefault();
        this._selectSuggestion(this.suggestions[this.selectedSuggestionIndex]);
      } else if (e.key === 'Escape') {
        this.showSuggestions = false;
        this.selectedSuggestionIndex = -1;
      } else if (e.key === 'Enter') {
        this.showSuggestions = false;
        this._handleAddItem(e);
      }
    } else if (e.key === 'Enter') {
      this._handleAddItem(e);
    }
  }

  _selectSuggestion(product) {
    this.newItemName = product.name;
    this._selectedProduct = product;

    // Usar valores por defecto del producto si los tiene
    if (product.defaultUnit) {
      this.newItemUnit = product.defaultUnit;
    }
    if (product.defaultQuantity) {
      this.newItemQuantity = product.defaultQuantity;
    }

    this.showSuggestions = false;
    this.selectedSuggestionIndex = -1;
  }

  _handleQuantityChange(e) {
    this.newItemQuantity = parseInt(e.target.value) || 1;
  }

  _handleUnitChange(e) {
    this.newItemUnit = e.target.value;
  }

  _handleInputBlur() {
    // Delay to allow click on suggestion
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  _handleInputFocus() {
    if (this.suggestions.length > 0) {
      this.showSuggestions = true;
    }
  }

  _setMode(newMode) {
    this.mode = newMode;
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Cargando items...</div>`;
    }

    const isAgnostic = this.listType === 'agnostic';

    return html`
      <!-- Mode Toggle -->
      <div class="mode-toggle">
        <button
          class="mode-btn ${this.mode === 'shopping' ? 'active' : ''}"
          @click=${() => this._setMode('shopping')}
        >
          ${isAgnostic ? '✅ Usar' : '🛒 Comprar'}
        </button>
        <button
          class="mode-btn ${this.mode === 'edit' ? 'active' : ''}"
          @click=${() => this._setMode('edit')}
        >
          ✏️ Editar
        </button>
      </div>

      <!-- Progress (only in shopping mode) -->
      ${this.mode === 'shopping' ? html`
        <div class="progress-text">
          ${this._checkedCount} de ${this.items.length} items (${this._progress}%)
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${this._progress}%"></div>
        </div>
      ` : ''}

      <div class="list-controls">
        <button
          class="control-btn ${this.groupByCategory ? 'active' : ''}"
          @click=${() => this.groupByCategory = !this.groupByCategory}
        >
          📁 Agrupar
        </button>
        ${this.mode === 'shopping' ? html`
          <button
            class="control-btn ${this.showCompleted ? 'active' : ''}"
            @click=${() => this.showCompleted = !this.showCompleted}
          >
            ✓ Mostrar completados
          </button>
          ${this.members.length > 0 ? html`
            <select
              class="filter-select"
              .value=${this.filterByAssignee}
              @change=${this._handleFilterChange}
            >
              <option value="">👤 Todos</option>
              <option value="unassigned">Sin asignar</option>
              ${this.members.map(member => html`
                <option value="${member.id}">
                  ${member.displayName?.split(' ')[0] || member.email}
                </option>
              `)}
            </select>
          ` : ''}
        ` : ''}
      </div>

      <!-- Add item form (only in edit mode) -->
      ${this.mode === 'edit' ? html`
        <div class="add-item-section">
        <form class="add-item-form" @submit=${this._handleAddItem}>
          <div class="input-group">
            <label>${isAgnostic ? 'Item' : 'Producto'}</label>
            <input
              type="text"
              class="add-item-input"
              placeholder="${isAgnostic ? 'Añadir item...' : 'Buscar o añadir producto...'}"
              .value=${this.newItemName}
              @input=${this._handleInputChange}
              @keydown=${this._handleKeyDown}
              @blur=${this._handleInputBlur}
              @focus=${this._handleInputFocus}
              autocomplete="off"
            />
            ${!isAgnostic && this.showSuggestions && this.suggestions.length > 0 ? html`
              <div class="suggestions-dropdown">
                ${this.suggestions.map((product, index) => {
                  const cat = PRODUCT_CATEGORIES.find(c => c.id === product.category);
                  return html`
                    <div
                      class="suggestion-item ${index === this.selectedSuggestionIndex ? 'selected' : ''}"
                      @mousedown=${() => this._selectSuggestion(product)}
                    >
                      <span class="suggestion-icon">${cat?.icon || '📦'}</span>
                      <span class="suggestion-name">${product.name}</span>
                      <span class="suggestion-category">${cat?.name || ''}</span>
                    </div>
                  `;
                })}
              </div>
            ` : ''}
          </div>
          ${isAgnostic ? html`
            <!-- Campos para listas agnósticas -->
            <div class="notes-input">
              <label>Notas (opcional)</label>
              <textarea
                rows="1"
                placeholder="Notas..."
                .value=${this.newItemNotes}
                @input=${this._handleNotesChange}
              ></textarea>
            </div>
            <div class="priority-select">
              <label>Prioridad</label>
              <select .value=${this.newItemPriority} @change=${this._handlePriorityChange}>
                <option value="">Sin prioridad</option>
                ${PRIORITIES.map(p => html`
                  <option value="${p.id}">${p.icon} ${p.name}</option>
                `)}
              </select>
            </div>
          ` : html`
            <!-- Campos para listas de compra -->
            <div class="quantity-input">
              <label>Cant.</label>
              <input
                type="number"
                min="1"
                .value=${this.newItemQuantity}
                @input=${this._handleQuantityChange}
              />
            </div>
            <div class="unit-select">
              <label>Unidad</label>
              <select .value=${this.newItemUnit} @change=${this._handleUnitChange}>
                ${UNITS.map(unit => html`
                  <option value="${unit.id}" ?selected=${unit.id === this.newItemUnit}>
                    ${unit.name}
                  </option>
                `)}
              </select>
            </div>
          `}
          <button type="submit" class="add-btn" ?disabled=${!this.newItemName.trim()}>
            + Añadir
          </button>
        </form>
        </div>
      ` : ''}

      ${this.items.length === 0 ? html`
        <div class="empty-state">
          <div class="empty-state-icon">${this.mode === 'edit' ? '📝' : (isAgnostic ? '✅' : '🛒')}</div>
          <p>${this.mode === 'edit' ? (isAgnostic ? '¡Añade items a la lista!' : '¡Añade productos a la lista!') : 'La lista está vacía.'}</p>
        </div>
      ` : html`
        ${Object.entries(this._groupedItems).map(([category, items]) => html`
          <div class="category-group">
            ${this.groupByCategory && category !== 'todos' ? html`
              <div class="category-header">
                <span>${this._getCategoryIcon(category)}</span>
                <span>${this._getCategoryName(category)}</span>
                <span class="category-count">${items.length}</span>
              </div>
            ` : ''}
            <div class="items-list">
              ${items.map(item => html`
                <hc-list-item
                  .item=${item}
                  .members=${this.members}
                  .mode=${this.mode}
                  .listType=${this.listType}
                  @toggle=${this._handleToggleItem}
                  @remove=${this._handleRemoveItem}
                  @assign=${this._handleAssignItem}
                  @edit=${this._handleEditItem}
                ></hc-list-item>
              `)}
            </div>
          </div>
        `)}
      `}

      <!-- Modal de edición -->
      ${this.editingItem ? html`
        <div class="edit-modal-overlay" @click=${this._handleCancelEdit}>
          <div class="edit-modal" @click=${(e) => e.stopPropagation()}>
            <h3>Editar item</h3>
            <form @submit=${this._handleSaveEdit}>
              <div class="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  .value=${this.editItemName}
                  @input=${(e) => this.editItemName = e.target.value}
                  required
                />
              </div>
              ${isAgnostic ? html`
                <div class="form-group">
                  <label>Notas</label>
                  <textarea
                    .value=${this.editItemNotes}
                    @input=${(e) => this.editItemNotes = e.target.value}
                    placeholder="Notas opcionales..."
                  ></textarea>
                </div>
                <div class="form-group">
                  <label>Prioridad</label>
                  <select
                    .value=${this.editItemPriority}
                    @change=${(e) => this.editItemPriority = e.target.value}
                  >
                    <option value="">Sin prioridad</option>
                    ${PRIORITIES.map(p => html`
                      <option value="${p.id}">${p.icon} ${p.name}</option>
                    `)}
                  </select>
                </div>
              ` : html`
                <div class="form-group">
                  <label>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    .value=${this.editItemQuantity}
                    @input=${(e) => this.editItemQuantity = parseInt(e.target.value) || 1}
                  />
                </div>
                <div class="form-group">
                  <label>Unidad</label>
                  <select
                    .value=${this.editItemUnit}
                    @change=${(e) => this.editItemUnit = e.target.value}
                  >
                    ${UNITS.map(unit => html`
                      <option value="${unit.id}">${unit.name}</option>
                    `)}
                  </select>
                </div>
              `}
              <div class="edit-modal-actions">
                <button type="button" class="btn-cancel" @click=${this._handleCancelEdit}>
                  Cancelar
                </button>
                <button type="submit" class="btn-save">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}
    `;
  }
}

customElements.define('hc-shopping-list', HcShoppingList);

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
import { searchProducts, UNITS, PRIORITIES } from '/js/db.js';
import {
  DEFAULT_SHOPPING_CATEGORIES,
  CATEGORY_COLORS,
  getCategoriesForList,
  createGroupCategory,
  getNextAvailableColor
} from '/js/categories.js';
import './hc-list-item.js';

export class HcShoppingList extends LitElement {
  static properties = {
    listId: { type: String, attribute: 'list-id' },
    userId: { type: String, attribute: 'user-id' },
    listType: { type: String, attribute: 'list-type' }, // 'shopping' or 'agnostic'
    readonly: { type: Boolean, attribute: 'readonly' }, // Lista cerrada = solo lectura
    items: { type: Array, state: true },
    members: { type: Array, state: true },
    groupByCategory: { type: Boolean, state: true },
    showCompleted: { type: Boolean, state: true },
    filterByAssignee: { type: String, state: true },
    viewMode: { type: String, state: true }, // 'list' or 'table'
    loading: { type: Boolean, state: true },
    newItemName: { type: String, state: true },
    newItemQuantity: { type: Number, state: true },
    newItemUnit: { type: String, state: true },
    newItemNotes: { type: String, state: true }, // Para listas agnósticas
    newItemPriority: { type: String, state: true }, // Para listas agnósticas
    newItemIsChecklist: { type: Boolean, state: true }, // Si el item es una sublista
    newChecklistItems: { type: Array, state: true }, // Items de la sublista al crear
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
    editItemPriority: { type: String, state: true },
    // Estado para edición de sublistas
    editItemIsChecklist: { type: Boolean, state: true },
    editChecklistItems: { type: Array, state: true },
    editChecklistItemText: { type: String, state: true },
    // Estado para categorías
    _categories: { type: Array, state: true },
    newItemCategory: { type: String, state: true },
    editItemCategory: { type: String, state: true },
    _showNewCategoryForm: { type: Boolean, state: true },
    _newCategoryName: { type: String, state: true },
    _newCategoryIcon: { type: String, state: true },
    _newCategoryBgColor: { type: String, state: true },
    _newCategoryTextColor: { type: String, state: true },
    // Quick add
    _quickAddValue: { type: String, state: true },
    _duplicateWarnings: { type: Array, state: true }
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
      color: #1e293b;
    }

    @media (prefers-color-scheme: dark) {
      .control-btn {
        border-color: #475569;
        color: #94a3b8;
      }

      .control-btn:hover {
        background: #334155;
        color: #f1f5f9;
      }

      .control-btn.active {
        background: #1e3a5f;
        border-color: #3b82f6;
        color: #3b82f6;
      }

      .mode-toggle {
        background: #334155;
      }

      .mode-btn {
        color: #94a3b8;
      }

      .mode-btn:hover {
        color: #f1f5f9;
      }

      .mode-btn.active {
        background: #1e293b;
        color: #3b82f6;
      }

      .filter-select {
        background: #1e293b;
        border-color: #334155;
        color: #f1f5f9;
      }
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
      background: white;
      color: #1e293b;
    }

    .add-item-input::placeholder {
      color: #94a3b8;
    }

    .add-item-input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    @media (prefers-color-scheme: dark) {
      .add-item-input {
        background: #1e293b;
        color: #f1f5f9;
        border-color: #334155;
      }

      .add-item-input::placeholder {
        color: #64748b;
      }

      .add-item-input:focus {
        border-color: #3b82f6;
      }
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
      color: #1e293b;
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

    @media (prefers-color-scheme: dark) {
      .suggestions-dropdown {
        background: #1e293b;
        border-color: #334155;
      }

      .suggestion-item {
        color: #f1f5f9;
      }

      .suggestion-item:hover,
      .suggestion-item.selected {
        background: #334155;
      }

      .suggestion-category {
        color: #64748b;
      }
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
      background: white;
      color: #1e293b;
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
      color: #1e293b;
      cursor: pointer;
    }

    .unit-select select:focus {
      outline: none;
      border-color: #2563eb;
    }

    @media (prefers-color-scheme: dark) {
      .quantity-input input {
        background: #1e293b;
        color: #f1f5f9;
        border-color: #334155;
      }

      .unit-select select {
        background: #1e293b;
        color: #f1f5f9;
        border-color: #334155;
      }
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
      padding: 0.5rem 0.75rem;
      font-weight: 500;
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      color: #64748b;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .category-count {
      background: rgba(255, 255, 255, 0.3);
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      color: inherit;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    /* View toggle buttons */
    .view-toggle {
      display: flex;
      background: #f1f5f9;
      border-radius: 0.375rem;
      padding: 0.125rem;
    }

    .view-toggle-btn {
      padding: 0.375rem 0.5rem;
      border: none;
      background: transparent;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 1rem;
      color: #64748b;
      transition: all 0.15s ease;
      line-height: 1;
    }

    .view-toggle-btn:hover {
      color: #334155;
    }

    .view-toggle-btn.active {
      background: white;
      color: #2563eb;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    @media (prefers-color-scheme: dark) {
      .view-toggle {
        background: #334155;
      }

      .view-toggle-btn {
        color: #94a3b8;
      }

      .view-toggle-btn:hover {
        color: #f1f5f9;
      }

      .view-toggle-btn.active {
        background: #1e293b;
        color: #3b82f6;
      }
    }

    /* Table view styles */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .items-table th,
    .items-table td {
      padding: 0.625rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    .items-table th {
      font-weight: 500;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      background: #f8fafc;
    }

    .items-table tbody tr {
      transition: background 0.15s ease;
      cursor: pointer;
    }

    .items-table tbody tr:hover {
      background: #f8fafc;
    }

    .items-table tbody tr.checked {
      background: transparent;
    }

    .items-table tbody tr.checked td {
      text-decoration: line-through;
    }

    .items-table .checkbox-cell {
      width: 40px;
      text-align: center;
    }

    .table-checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid #cbd5e1;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 0.75rem;
      background: white;
    }

    .table-checkbox:hover {
      border-color: #22c55e;
    }

    .table-checkbox.checked {
      background: #22c55e;
      border-color: #22c55e;
      color: white;
    }

    .table-quantity {
      white-space: nowrap;
    }

    .table-actions {
      width: 80px;
      text-align: right;
    }

    .table-actions button {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
      opacity: 0;
      transition: all 0.15s ease;
    }

    .items-table tbody tr:hover .table-actions button {
      opacity: 1;
    }

    .table-actions button:hover {
      background: #f1f5f9;
    }

    .table-actions button.danger:hover {
      background: #fef2f2;
    }

    @media (prefers-color-scheme: dark) {
      .items-table th,
      .items-table td {
        border-color: #334155;
      }

      .items-table th {
        background: #1e293b;
        color: #94a3b8;
      }

      .items-table tbody tr:hover {
        background: #334155;
      }

      .table-checkbox {
        background: #1e293b;
        border-color: #475569;
      }

      .table-actions button:hover {
        background: #334155;
      }

      .table-actions button.danger:hover {
        background: #450a0a;
      }
    }

    @media (max-width: 640px) {
      .items-table th,
      .items-table td {
        padding: 0.5rem;
      }

      .items-table .hide-mobile {
        display: none;
      }
    }

    /* Quick add styles */
    .quick-add-section {
      margin-bottom: 1rem;
    }

    .quick-add-form {
      display: flex;
      gap: 0.5rem;
    }

    .quick-add-input {
      flex: 1;
      padding: 0.625rem 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      background: white;
      color: #1e293b;
      transition: border-color 0.15s ease;
    }

    .quick-add-input::placeholder {
      color: #94a3b8;
    }

    .quick-add-input:focus {
      outline: none;
      border-color: #2563eb;
    }

    .quick-add-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: #2563eb;
      color: white;
      border-radius: 0.5rem;
      font-size: 1.25rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .quick-add-btn:hover {
      background: #1d4ed8;
    }

    .quick-add-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }

    @media (prefers-color-scheme: dark) {
      .quick-add-input {
        background: #1e293b;
        color: #f1f5f9;
        border-color: #334155;
      }

      .quick-add-input::placeholder {
        color: #64748b;
      }

      .quick-add-input:focus {
        border-color: #3b82f6;
      }
    }

    /* Duplicate warning styles */
    .duplicate-warning {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 0.375rem;
      padding: 0.5rem 0.75rem;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #92400e;
    }

    .duplicate-warning-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .duplicate-warning-items {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .duplicate-warning-item {
      background: rgba(245, 158, 11, 0.2);
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.6875rem;
    }

    @media (prefers-color-scheme: dark) {
      .duplicate-warning {
        background: #451a03;
        border-color: #b45309;
        color: #fcd34d;
      }

      .duplicate-warning-item {
        background: rgba(251, 191, 36, 0.2);
      }
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

    .bulk-actions {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .bulk-btn {
      padding: 0.375rem 0.75rem;
      background: transparent;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s ease;
      color: #64748b;
    }

    .bulk-btn:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #334155;
    }

    .bulk-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (prefers-color-scheme: dark) {
      .bulk-btn {
        border-color: #475569;
        color: #94a3b8;
      }

      .bulk-btn:hover {
        background: #334155;
        border-color: #64748b;
        color: #f1f5f9;
      }
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
      background: white;
      color: #1e293b;
    }

    .notes-input textarea::placeholder {
      color: #94a3b8;
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
      color: #1e293b;
      cursor: pointer;
    }

    .priority-select select:focus {
      outline: none;
      border-color: #2563eb;
    }

    /* Selector de categoría */
    .category-select {
      min-width: 150px;
    }

    .category-select select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      background: white;
      color: #1e293b;
      cursor: pointer;
    }

    .category-select select:focus {
      outline: none;
      border-color: #2563eb;
    }

    /* Formulario de nueva categoría inline */
    .new-category-form {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 0.75rem;
      margin-top: 0.5rem;
      width: 100%;
    }

    .new-category-form-title {
      font-size: 0.75rem;
      color: #64748b;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .new-category-form-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .new-category-form-row input {
      flex: 1;
      padding: 0.375rem 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      background: white;
      color: #1e293b;
    }

    .new-category-form-row input:focus {
      outline: none;
      border-color: #2563eb;
    }

    .color-picker {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }

    .color-option {
      width: 24px;
      height: 24px;
      border: 2px solid transparent;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    .color-option:hover {
      transform: scale(1.1);
    }

    .color-option.selected {
      border-color: #1e293b;
      box-shadow: 0 0 0 2px white inset;
    }

    .new-category-form-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }

    .new-category-form-actions button {
      padding: 0.375rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .btn-create-category {
      background: #2563eb;
      border: none;
      color: white;
    }

    .btn-create-category:hover {
      background: #1d4ed8;
    }

    .btn-cancel-category {
      background: #e2e8f0;
      border: none;
      color: #334155;
    }

    .btn-cancel-category:hover {
      background: #cbd5e1;
    }

    @media (prefers-color-scheme: dark) {
      .notes-input textarea {
        background: #1e293b;
        color: #f1f5f9;
        border-color: #334155;
      }

      .notes-input textarea::placeholder {
        color: #64748b;
      }

      .priority-select select {
        background: #1e293b;
        color: #f1f5f9;
        border-color: #334155;
      }

      .category-select select {
        background: #1e293b;
        color: #f1f5f9;
        border-color: #334155;
      }

      .new-category-form {
        background: #334155;
        border-color: #475569;
      }

      .new-category-form-title {
        color: #94a3b8;
      }

      .new-category-form-row input {
        background: #1e293b;
        color: #f1f5f9;
        border-color: #475569;
      }

      .color-option.selected {
        border-color: #f1f5f9;
      }

      .btn-cancel-category {
        background: #475569;
        color: #f1f5f9;
      }

      .btn-cancel-category:hover {
        background: #64748b;
      }
    }

    /* Checkbox "Es sublista" */
    .checklist-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0;
    }

    .checklist-option input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .checklist-option label {
      font-size: 0.875rem;
      color: #64748b;
      cursor: pointer;
    }

    /* Formulario de subelementos */
    .checklist-builder {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 0.75rem;
      margin-top: 0.5rem;
      width: 100%;
    }

    .checklist-builder-title {
      font-size: 0.75rem;
      color: #64748b;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .checklist-builder-items {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }

    .checklist-builder-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem;
      background: white;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      color: #1e293b;
    }

    .checklist-builder-item span {
      flex: 1;
    }

    .checklist-builder-item button {
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: #94a3b8;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
    }

    .checklist-builder-item button:hover {
      background: #fef2f2;
      color: #dc2626;
    }

    .checklist-builder-add {
      display: flex;
      gap: 0.5rem;
    }

    .checklist-builder-add input {
      flex: 1;
      padding: 0.375rem 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      background: white;
      color: #1e293b;
    }

    .checklist-builder-add input::placeholder {
      color: #94a3b8;
    }

    .checklist-builder-add input:focus {
      outline: none;
      border-color: #2563eb;
    }

    .checklist-builder-add button {
      padding: 0.375rem 0.75rem;
      background: #e2e8f0;
      border: none;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      cursor: pointer;
      color: #334155;
    }

    .checklist-builder-add button:hover {
      background: #cbd5e1;
    }

    @media (prefers-color-scheme: dark) {
      .checklist-option label {
        color: #94a3b8;
      }

      .checklist-builder {
        background: #334155;
        border-color: #475569;
      }

      .checklist-builder-title {
        color: #94a3b8;
      }

      .checklist-builder-item {
        background: #1e293b;
        color: #f1f5f9;
      }

      .checklist-builder-item button {
        color: #64748b;
      }

      .checklist-builder-add input {
        background: #1e293b;
        color: #f1f5f9;
        border-color: #475569;
      }

      .checklist-builder-add input::placeholder {
        color: #64748b;
      }

      .checklist-builder-add button {
        background: #475569;
        color: #f1f5f9;
      }

      .checklist-builder-add button:hover {
        background: #64748b;
      }
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

    @media (prefers-color-scheme: dark) {
      .edit-modal {
        background: #1e293b;
        color: #f1f5f9;
      }

      .edit-modal h3 {
        color: #f1f5f9;
      }

      .edit-modal label {
        color: #94a3b8;
      }

      .edit-modal input,
      .edit-modal select,
      .edit-modal textarea {
        background: #0f172a;
        border-color: #334155;
        color: #f1f5f9;
      }

      .edit-modal input::placeholder,
      .edit-modal textarea::placeholder {
        color: #64748b;
      }

      .edit-modal input:focus,
      .edit-modal select:focus,
      .edit-modal textarea:focus {
        border-color: #3b82f6;
      }

      .btn-cancel {
        border-color: #475569;
        color: #94a3b8;
      }

      .btn-cancel:hover {
        background: #334155;
        color: #f1f5f9;
      }
    }
  `;

  constructor() {
    super();
    this._componentId = `shopping-list-${Math.random().toString(36).substr(2, 9)}`;
    this.items = [];
    this.members = [];
    this.listType = 'shopping';
    this.readonly = false;
    this.groupByCategory = true;
    this.showCompleted = true;
    this.filterByAssignee = '';
    this.viewMode = 'table'; // 'table' por defecto
    this.loading = true;
    this.newItemName = '';
    this.newItemQuantity = 1;
    this.newItemUnit = 'unidad';
    this.newItemNotes = '';
    this.newItemPriority = '';
    this.newItemIsChecklist = false;
    this.newChecklistItems = [];
    this.newChecklistItemText = '';
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
    this.editItemIsChecklist = false;
    this.editChecklistItems = [];
    this.editChecklistItemText = '';
    // Categorías
    this._categories = [];
    this.newItemCategory = '';
    this.editItemCategory = '';
    this._showNewCategoryForm = false;
    this._newCategoryName = '';
    this._newCategoryIcon = '📦';
    this._newCategoryBgColor = CATEGORY_COLORS[0].bgColor;
    this._newCategoryTextColor = CATEGORY_COLORS[0].textColor;
    this._quickAddValue = '';
    this._duplicateWarnings = [];
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
    // Recargar categorías cuando cambia el tipo de lista
    if (changedProperties.has('listType') && this.userId && this.listId) {
      this._loadCategories();
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

    // Cargar categorías del grupo
    await this._loadCategories();

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

  async _loadCategories() {
    try {
      const groupId = getCurrentGroupId();
      if (!groupId) {
        // Si no hay grupo, usar categorías por defecto
        this._categories = this.listType === 'shopping'
          ? DEFAULT_SHOPPING_CATEGORIES.map(c => ({ ...c, isDefault: true }))
          : [];
        return;
      }

      this._categories = await getCategoriesForList(groupId, this.listType);
    } catch (error) {
      console.error('Error loading categories:', error);
      this._categories = this.listType === 'shopping'
        ? DEFAULT_SHOPPING_CATEGORIES.map(c => ({ ...c, isDefault: true }))
        : [];
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

      // Determinar la categoría
      let category = null;
      if (this.newItemCategory) {
        category = this.newItemCategory;
      } else if (this._selectedProduct?.category) {
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

        // Si es sublista, añadir el checklist
        if (this.newItemIsChecklist && this.newChecklistItems.length > 0) {
          itemData.isChecklist = true;
          itemData.checklist = this.newChecklistItems;
        }
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
      this.newItemCategory = '';
      this.newItemIsChecklist = false;
      this.newChecklistItems = [];
      this.newChecklistItemText = '';
      this.suggestions = [];
      this.showSuggestions = false;
      this._selectedProduct = null;
      this._duplicateWarnings = [];
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

  // Manejadores de sublista/checklist
  async _handleChecklistToggle(e) {
    const { itemId, checklistIndex, checked } = e.detail;

    if (!this.userId || !this.listId) return;

    try {
      // Encontrar el item actual
      const item = this.items.find(i => i.id === itemId);
      if (!item || !item.checklist) return;

      // Crear una copia del checklist con el cambio
      const updatedChecklist = [...item.checklist];
      updatedChecklist[checklistIndex] = {
        ...updatedChecklist[checklistIndex],
        checked
      };

      // Calcular estado del item padre basado en la sublista
      const allChecked = updatedChecklist.every(i => i.checked);
      const someChecked = updatedChecklist.some(i => i.checked);

      const itemRef = doc(db, 'users', this.userId, 'lists', this.listId, 'items', itemId);
      await updateDoc(itemRef, {
        checklist: updatedChecklist,
        checked: allChecked,
        partiallyChecked: someChecked && !allChecked,
        updatedAt: serverTimestamp()
      });

      // Actualizar timestamp de la lista
      const listRef = doc(db, 'users', this.userId, 'lists', this.listId);
      await updateDoc(listRef, { updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Error toggling checklist item:', error);
    }
  }

  async _handleChecklistAdd(e) {
    const { itemId, text } = e.detail;

    if (!this.userId || !this.listId || !text.trim()) return;

    try {
      // Encontrar el item actual
      const item = this.items.find(i => i.id === itemId);
      const currentChecklist = item?.checklist || [];

      // Añadir nuevo elemento al checklist
      const updatedChecklist = [
        ...currentChecklist,
        { text: text.trim(), checked: false }
      ];

      const itemRef = doc(db, 'users', this.userId, 'lists', this.listId, 'items', itemId);
      await updateDoc(itemRef, {
        checklist: updatedChecklist,
        updatedAt: serverTimestamp()
      });

      // Actualizar timestamp de la lista
      const listRef = doc(db, 'users', this.userId, 'lists', this.listId);
      await updateDoc(listRef, { updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Error adding checklist item:', error);
    }
  }

  async _handleChecklistRemove(e) {
    const { itemId, checklistIndex } = e.detail;

    if (!this.userId || !this.listId) return;

    try {
      // Encontrar el item actual
      const item = this.items.find(i => i.id === itemId);
      if (!item || !item.checklist) return;

      // Crear una copia del checklist sin el elemento eliminado
      const updatedChecklist = item.checklist.filter((_, index) => index !== checklistIndex);

      // Recalcular estado del item padre
      const allChecked = updatedChecklist.length > 0 && updatedChecklist.every(i => i.checked);
      const someChecked = updatedChecklist.some(i => i.checked);

      const itemRef = doc(db, 'users', this.userId, 'lists', this.listId, 'items', itemId);
      await updateDoc(itemRef, {
        checklist: updatedChecklist,
        checked: allChecked,
        partiallyChecked: someChecked && !allChecked,
        updatedAt: serverTimestamp()
      });

      // Actualizar timestamp de la lista
      const listRef = doc(db, 'users', this.userId, 'lists', this.listId);
      await updateDoc(listRef, { updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Error removing checklist item:', error);
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
    this.editItemCategory = item.category || '';
    // Cargar datos de sublista
    this.editItemIsChecklist = item.isChecklist || false;
    this.editChecklistItems = item.checklist ? [...item.checklist] : [];
    this.editChecklistItemText = '';
  }

  _handleCancelEdit() {
    this.editingItem = null;
    this.editItemName = '';
    this.editItemQuantity = 1;
    this.editItemUnit = 'unidad';
    this.editItemNotes = '';
    this.editItemPriority = '';
    this.editItemCategory = '';
    this.editItemIsChecklist = false;
    this.editChecklistItems = [];
    this.editChecklistItemText = '';
    this._showNewCategoryForm = false;
  }

  async _handleSaveEdit(e) {
    e.preventDefault();

    if (!this.editingItem || !this.userId || !this.listId) return;

    const isAgnostic = this.listType === 'agnostic';

    try {
      const itemRef = doc(db, 'users', this.userId, 'lists', this.listId, 'items', this.editingItem.id);

      const updates = {
        name: this.editItemName.trim(),
        category: this.editItemCategory || null,
        updatedAt: serverTimestamp()
      };

      if (isAgnostic) {
        updates.notes = this.editItemNotes || null;
        updates.priority = this.editItemPriority || null;
        // Datos de sublista
        updates.isChecklist = this.editItemIsChecklist;
        updates.checklist = this.editItemIsChecklist ? this.editChecklistItems : null;
        // Recalcular estado checked si es sublista
        if (this.editItemIsChecklist && this.editChecklistItems.length > 0) {
          const checkedCount = this.editChecklistItems.filter(i => i.checked).length;
          const total = this.editChecklistItems.length;
          updates.checked = checkedCount === total;
          updates.partiallyChecked = checkedCount > 0 && checkedCount < total;
        }
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

  _findDuplicates(searchText) {
    if (!searchText || searchText.length < 2) {
      return [];
    }

    const normalizedSearch = searchText.toLowerCase().trim();
    const duplicates = this.items.filter(item => {
      const normalizedName = (item.name || '').toLowerCase();
      // Coincidencia exacta o si el nombre contiene el texto de búsqueda
      return normalizedName === normalizedSearch ||
             normalizedName.includes(normalizedSearch) ||
             normalizedSearch.includes(normalizedName);
    });

    return duplicates.slice(0, 3); // Máximo 3 sugerencias
  }

  _getCategoryIcon(categoryId) {
    const cat = this._categories.find(c => c.id === categoryId);
    if (cat) return cat.icon || '📦';

    // Fallback a categorías por defecto
    const defaultCat = DEFAULT_SHOPPING_CATEGORIES.find(c => c.id === categoryId);
    return defaultCat?.icon || '📦';
  }

  _getCategoryName(categoryId) {
    const cat = this._categories.find(c => c.id === categoryId);
    if (cat) return cat.name;

    // Fallback a categorías por defecto
    const defaultCat = DEFAULT_SHOPPING_CATEGORIES.find(c => c.id === categoryId);
    return defaultCat?.name || categoryId;
  }

  _getCategoryById(categoryId) {
    return this._categories.find(c => c.id === categoryId);
  }

  _handleNotesChange(e) {
    this.newItemNotes = e.target.value;
  }

  _handlePriorityChange(e) {
    this.newItemPriority = e.target.value;
  }

  _handleCategoryChange(e) {
    const value = e.target.value;
    if (value === '__new__') {
      this._openNewCategoryForm();
    } else {
      this.newItemCategory = value;
    }
  }

  _handleEditCategoryChange(e) {
    const value = e.target.value;
    if (value === '__new__') {
      this._openNewCategoryForm();
    } else {
      this.editItemCategory = value;
    }
  }

  _openNewCategoryForm() {
    this._showNewCategoryForm = true;
    this._newCategoryName = '';
    this._newCategoryIcon = '📦';
    const nextColor = getNextAvailableColor(this._categories);
    this._newCategoryBgColor = nextColor.bgColor;
    this._newCategoryTextColor = nextColor.textColor;
  }

  _closeNewCategoryForm() {
    this._showNewCategoryForm = false;
    this._newCategoryName = '';
  }

  _handleNewCategoryNameChange(e) {
    this._newCategoryName = e.target.value;
  }

  _handleNewCategoryIconChange(e) {
    this._newCategoryIcon = e.target.value;
  }

  _selectCategoryColor(color) {
    this._newCategoryBgColor = color.bgColor;
    this._newCategoryTextColor = color.textColor;
  }

  async _handleCreateCategory() {
    if (!this._newCategoryName.trim()) return;

    try {
      const groupId = getCurrentGroupId();
      if (!groupId) {
        console.error('No group ID found');
        return;
      }

      const newCategoryId = await createGroupCategory(groupId, {
        name: this._newCategoryName.trim(),
        icon: this.listType === 'shopping' ? this._newCategoryIcon : null,
        bgColor: this._newCategoryBgColor,
        textColor: this._newCategoryTextColor,
        listType: this.listType
      }, this.userId);

      // Recargar categorías
      await this._loadCategories();

      // Seleccionar la nueva categoría
      if (this.editingItem) {
        this.editItemCategory = newCategoryId;
      } else {
        this.newItemCategory = newCategoryId;
      }

      this._closeNewCategoryForm();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  }

  _handleIsChecklistChange(e) {
    this.newItemIsChecklist = e.target.checked;
    if (!e.target.checked) {
      this.newChecklistItems = [];
    }
  }

  _handleNewChecklistItemTextChange(e) {
    this.newChecklistItemText = e.target.value;
  }

  _handleAddChecklistBuilderItem(e) {
    e?.preventDefault();
    if (!this.newChecklistItemText.trim()) return;

    this.newChecklistItems = [
      ...this.newChecklistItems,
      { text: this.newChecklistItemText.trim(), checked: false }
    ];
    this.newChecklistItemText = '';
  }

  _handleRemoveChecklistBuilderItem(index) {
    this.newChecklistItems = this.newChecklistItems.filter((_, i) => i !== index);
  }

  _handleChecklistBuilderKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this._handleAddChecklistBuilderItem();
    }
  }

  // Métodos para el checklist builder en modo edición
  _handleEditIsChecklistChange(e) {
    this.editItemIsChecklist = e.target.checked;
    if (!this.editItemIsChecklist) {
      this.editChecklistItems = [];
    }
  }

  _handleEditChecklistItemTextChange(e) {
    this.editChecklistItemText = e.target.value;
  }

  _handleAddEditChecklistItem(e) {
    e?.preventDefault();
    if (!this.editChecklistItemText.trim()) return;

    this.editChecklistItems = [
      ...this.editChecklistItems,
      { text: this.editChecklistItemText.trim(), checked: false }
    ];
    this.editChecklistItemText = '';
  }

  _handleRemoveEditChecklistItem(index) {
    this.editChecklistItems = this.editChecklistItems.filter((_, i) => i !== index);
  }

  _handleEditChecklistBuilderKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this._handleAddEditChecklistItem();
    }
  }

  async _handleInputChange(e) {
    this.newItemName = e.target.value;
    this._selectedProduct = null;

    // Buscar duplicados en la lista actual
    this._duplicateWarnings = this._findDuplicates(e.target.value);

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

  _handleQuickAddInput(e) {
    this._quickAddValue = e.target.value;
    this._duplicateWarnings = this._findDuplicates(e.target.value);
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
    // Si es readonly, forzar modo shopping
    if (this.readonly && newMode === 'edit') {
      return;
    }
    this.mode = newMode;
  }

  async _markAllItems() {
    if (!this.userId || !this.listId || this.items.length === 0) return;

    const user = getCurrentUser();
    const uncheckedItems = this.items.filter(i => !i.checked);

    try {
      const promises = uncheckedItems.map(item => {
        const itemRef = doc(db, 'users', this.userId, 'lists', this.listId, 'items', item.id);
        return updateDoc(itemRef, {
          checked: true,
          checkedBy: user?.uid || null,
          checkedAt: serverTimestamp()
        });
      });

      await Promise.all(promises);

      // Actualizar timestamp de la lista
      const listRef = doc(db, 'users', this.userId, 'lists', this.listId);
      await updateDoc(listRef, { updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Error marking all items:', error);
    }
  }

  async _unmarkAllItems() {
    if (!this.userId || !this.listId || this.items.length === 0) return;

    const checkedItems = this.items.filter(i => i.checked);

    try {
      const promises = checkedItems.map(item => {
        const itemRef = doc(db, 'users', this.userId, 'lists', this.listId, 'items', item.id);
        return updateDoc(itemRef, {
          checked: false,
          checkedBy: null,
          checkedAt: null
        });
      });

      await Promise.all(promises);

      // Actualizar timestamp de la lista
      const listRef = doc(db, 'users', this.userId, 'lists', this.listId);
      await updateDoc(listRef, { updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Error unmarking all items:', error);
    }
  }

  async _handleQuickAdd(e) {
    e.preventDefault();
    const name = (this._quickAddValue || '').trim();
    if (!name || !this.userId || !this.listId) return;

    const isAgnostic = this.listType === 'agnostic';

    try {
      const itemsRef = collection(db, 'users', this.userId, 'lists', this.listId, 'items');

      const itemData = {
        name,
        category: null,
        checked: false,
        createdAt: serverTimestamp(),
        createdBy: this.userId,
        itemType: isAgnostic ? 'general' : 'shopping'
      };

      if (!isAgnostic) {
        itemData.quantity = 1;
        itemData.unit = 'unidad';
      }

      await addDoc(itemsRef, itemData);

      // Actualizar contador de la lista
      const listRef = doc(db, 'users', this.userId, 'lists', this.listId);
      await updateDoc(listRef, {
        itemCount: increment(1),
        updatedAt: serverTimestamp()
      });

      this._quickAddValue = '';
      this._duplicateWarnings = [];
    } catch (error) {
      console.error('Error adding quick item:', error);
    }
  }

  _handleTableRowClick(item, e) {
    // No hacer toggle si se clickea en botones de acción
    if (e.target.closest('.table-actions')) {
      return;
    }
    if (this.mode === 'shopping') {
      this._handleToggleItem({ detail: { itemId: item.id, checked: !item.checked } });
    }
  }

  _renderTableView() {
    const isAgnostic = this.listType === 'agnostic';
    const isShoppingMode = this.mode === 'shopping';
    const isEditMode = this.mode === 'edit';

    return html`
      <table class="items-table">
        <thead>
          <tr>
            ${isShoppingMode ? html`<th class="checkbox-cell"></th>` : ''}
            <th>Nombre</th>
            ${!isAgnostic ? html`<th class="hide-mobile">Cantidad</th>` : ''}
            ${this.groupByCategory ? html`<th class="hide-mobile">Categoría</th>` : ''}
            ${isEditMode ? html`<th class="table-actions"></th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${this._filteredItems.map(item => {
            const cat = this._getCategoryById(item.category);
            return html`
              <tr
                class="${item.checked && isShoppingMode ? 'checked' : ''}"
                @click=${(e) => this._handleTableRowClick(item, e)}
              >
                ${isShoppingMode ? html`
                  <td class="checkbox-cell">
                    <div
                      class="table-checkbox ${item.checked ? 'checked' : ''}"
                      @click=${(e) => e.stopPropagation()}
                    >
                      ${item.checked ? '✓' : ''}
                    </div>
                  </td>
                ` : ''}
                <td>${item.name}</td>
                ${!isAgnostic ? html`<td class="table-quantity hide-mobile">${item.quantity} ${item.unit}</td>` : ''}
                ${this.groupByCategory ? html`
                  <td class="hide-mobile">
                    ${cat ? html`<span>${cat.icon || ''} ${cat.name}</span>` : '—'}
                  </td>
                ` : ''}
                ${isEditMode ? html`
                  <td class="table-actions">
                    <button @click=${() => this._handleEditItem({ detail: { item } })} title="Editar">✏️</button>
                    <button class="danger" @click=${() => this._handleRemoveItem({ detail: { itemId: item.id } })} title="Eliminar">🗑️</button>
                  </td>
                ` : ''}
              </tr>
            `;
          })}
        </tbody>
      </table>
    `;
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
        ${!this.readonly ? html`
          <button
            class="mode-btn ${this.mode === 'edit' ? 'active' : ''}"
            @click=${() => this._setMode('edit')}
          >
            ✏️ Editar
          </button>
        ` : ''}
      </div>

      <!-- Quick add in shopping mode (solo si no es readonly) -->
      ${this.mode === 'shopping' && !this.readonly ? html`
        <div class="quick-add-section">
          <form class="quick-add-form" @submit=${this._handleQuickAdd}>
            <input
              type="text"
              class="quick-add-input"
              placeholder="${isAgnostic ? '+ Añadir item rápido...' : '+ Añadir producto rápido...'}"
              .value=${this._quickAddValue || ''}
              @input=${this._handleQuickAddInput}
            />
            <button type="submit" class="quick-add-btn" ?disabled=${!this._quickAddValue?.trim()}>
              +
            </button>
          </form>
          ${this._duplicateWarnings.length > 0 ? html`
            <div class="duplicate-warning">
              <div class="duplicate-warning-title">⚠️ Ya existe en la lista:</div>
              <div class="duplicate-warning-items">
                ${this._duplicateWarnings.map(item => html`
                  <span class="duplicate-warning-item">${item.name}</span>
                `)}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Progress (only in shopping mode) -->
      ${this.mode === 'shopping' ? html`
        <div class="progress-text">
          ${this._checkedCount} de ${this.items.length} items (${this._progress}%)
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${this._progress}%"></div>
        </div>
        ${this.items.length > 0 ? html`
          <div class="bulk-actions">
            <button
              class="bulk-btn"
              @click=${this._unmarkAllItems}
              ?disabled=${this._checkedCount === 0}
              title="Desmarcar todos los elementos"
            >
              ↺ Desmarcar todos
            </button>
            <button
              class="bulk-btn"
              @click=${this._markAllItems}
              ?disabled=${this._checkedCount === this.items.length}
              title="Marcar todos los elementos"
            >
              ✓ Marcar todos
            </button>
          </div>
        ` : ''}
      ` : ''}

      <div class="list-controls">
        <div class="view-toggle">
          <button
            class="view-toggle-btn ${this.viewMode === 'table' ? 'active' : ''}"
            @click=${() => this.viewMode = 'table'}
            title="Vista tabla"
          >☰</button>
          <button
            class="view-toggle-btn ${this.viewMode === 'list' ? 'active' : ''}"
            @click=${() => this.viewMode = 'list'}
            title="Vista lista"
          >▤</button>
        </div>
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
                  const cat = this._getCategoryById(product.category);
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
            ${this._duplicateWarnings.length > 0 ? html`
              <div class="duplicate-warning" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 50;">
                <div class="duplicate-warning-title">⚠️ Ya existe en la lista:</div>
                <div class="duplicate-warning-items">
                  ${this._duplicateWarnings.map(item => html`
                    <span class="duplicate-warning-item">${item.name}</span>
                  `)}
                </div>
              </div>
            ` : ''}
          </div>
          <!-- Selector de categoría -->
          <div class="category-select">
            <label>Categoría</label>
            <select .value=${this.newItemCategory} @change=${this._handleCategoryChange}>
              <option value="">Sin categoría</option>
              ${this._categories.map(cat => html`
                <option value="${cat.id}">
                  ${cat.icon ? `${cat.icon} ` : ''}${cat.name}
                </option>
              `)}
              <option value="__new__">+ Nueva categoría</option>
            </select>
          </div>
          ${isAgnostic ? html`
            <!-- Campos para listas agnósticas -->
            <div class="priority-select">
              <label>Prioridad</label>
              <select .value=${this.newItemPriority} @change=${this._handlePriorityChange}>
                <option value="">Sin prioridad</option>
                ${PRIORITIES.map(p => html`
                  <option value="${p.id}">${p.icon} ${p.name}</option>
                `)}
              </select>
            </div>
            <div class="checklist-option">
              <input
                type="checkbox"
                id="is-checklist"
                .checked=${this.newItemIsChecklist}
                @change=${this._handleIsChecklistChange}
              />
              <label for="is-checklist">Es sublista</label>
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
          <button type="submit" class="add-btn" ?disabled=${!this.newItemName.trim() || (this.newItemIsChecklist && this.newChecklistItems.length === 0)}>
            + Añadir
          </button>
        </form>
        ${isAgnostic && this.newItemIsChecklist ? html`
          <div class="checklist-builder">
            <div class="checklist-builder-title">Subelementos de "${this.newItemName || 'sublista'}"</div>
            ${this.newChecklistItems.length > 0 ? html`
              <div class="checklist-builder-items">
                ${this.newChecklistItems.map((item, index) => html`
                  <div class="checklist-builder-item">
                    <span>☐ ${item.text}</span>
                    <button type="button" @click=${() => this._handleRemoveChecklistBuilderItem(index)} title="Eliminar">✕</button>
                  </div>
                `)}
              </div>
            ` : ''}
            <div class="checklist-builder-add">
              <input
                type="text"
                placeholder="Añadir subelemento..."
                .value=${this.newChecklistItemText}
                @input=${this._handleNewChecklistItemTextChange}
                @keydown=${this._handleChecklistBuilderKeydown}
              />
              <button type="button" @click=${this._handleAddChecklistBuilderItem}>+ Añadir</button>
            </div>
          </div>
        ` : ''}
        ${this._showNewCategoryForm ? html`
          <div class="new-category-form">
            <div class="new-category-form-title">Nueva categoría</div>
            <div class="new-category-form-row">
              <input
                type="text"
                placeholder="Nombre de la categoría"
                .value=${this._newCategoryName}
                @input=${this._handleNewCategoryNameChange}
              />
              ${this.listType === 'shopping' ? html`
                <input
                  type="text"
                  placeholder="📦"
                  .value=${this._newCategoryIcon}
                  @input=${this._handleNewCategoryIconChange}
                  style="width: 50px; text-align: center;"
                  maxlength="4"
                />
              ` : ''}
            </div>
            <div class="new-category-form-row">
              <div class="color-picker">
                ${CATEGORY_COLORS.map(color => html`
                  <button
                    type="button"
                    class="color-option ${this._newCategoryBgColor === color.bgColor ? 'selected' : ''}"
                    style="background: ${color.bgColor}"
                    @click=${() => this._selectCategoryColor(color)}
                    title=${color.name}
                  ></button>
                `)}
              </div>
            </div>
            <div class="new-category-form-actions">
              <button type="button" class="btn-cancel-category" @click=${this._closeNewCategoryForm}>
                Cancelar
              </button>
              <button type="button" class="btn-create-category" @click=${this._handleCreateCategory}>
                Crear
              </button>
            </div>
          </div>
        ` : ''}
        </div>
      ` : ''}

      ${this.items.length === 0 ? html`
        <div class="empty-state">
          <div class="empty-state-icon">${this.mode === 'edit' ? '📝' : (isAgnostic ? '✅' : '🛒')}</div>
          <p>${this.mode === 'edit' ? (isAgnostic ? '¡Añade items a la lista!' : '¡Añade productos a la lista!') : 'La lista está vacía.'}</p>
        </div>
      ` : this.viewMode === 'table' ? html`
        ${this._renderTableView()}
      ` : html`
        ${Object.entries(this._groupedItems).map(([category, items]) => {
          const cat = this._getCategoryById(category);
          const headerStyle = cat?.bgColor ? `background: ${cat.bgColor}; color: ${cat.textColor || '#fff'}` : '';
          return html`
          <div class="category-group">
            ${this.groupByCategory && category !== 'todos' ? html`
              <div class="category-header" style="${headerStyle}">
                <span>${cat?.icon || '📦'}</span>
                <span>${cat?.name || category}</span>
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
                  @checklist-toggle=${this._handleChecklistToggle}
                  @checklist-add=${this._handleChecklistAdd}
                  @checklist-remove=${this._handleChecklistRemove}
                ></hc-list-item>
              `)}
            </div>
          </div>
        `})}
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
              <!-- Selector de categoría en edición -->
              <div class="form-group">
                <label>Categoría</label>
                <select
                  .value=${this.editItemCategory}
                  @change=${this._handleEditCategoryChange}
                >
                  <option value="">Sin categoría</option>
                  ${this._categories.map(cat => html`
                    <option value="${cat.id}">
                      ${cat.icon ? `${cat.icon} ` : ''}${cat.name}
                    </option>
                  `)}
                  <option value="__new__">+ Nueva categoría</option>
                </select>
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
                <div class="checklist-option">
                  <input
                    type="checkbox"
                    id="edit-is-checklist"
                    .checked=${this.editItemIsChecklist}
                    @change=${this._handleEditIsChecklistChange}
                  />
                  <label for="edit-is-checklist">Es sublista</label>
                </div>
                ${this.editItemIsChecklist ? html`
                  <div class="checklist-builder">
                    <div class="checklist-builder-title">Subelementos de "${this.editItemName || 'sublista'}"</div>
                    ${this.editChecklistItems.length > 0 ? html`
                      <div class="checklist-builder-items">
                        ${this.editChecklistItems.map((item, index) => html`
                          <div class="checklist-builder-item">
                            <span>${item.checked ? '☑' : '☐'} ${item.text}</span>
                            <button type="button" @click=${() => this._handleRemoveEditChecklistItem(index)} title="Eliminar">✕</button>
                          </div>
                        `)}
                      </div>
                    ` : ''}
                    <div class="checklist-builder-add">
                      <input
                        type="text"
                        placeholder="Añadir subelemento..."
                        .value=${this.editChecklistItemText}
                        @input=${this._handleEditChecklistItemTextChange}
                        @keydown=${this._handleEditChecklistBuilderKeydown}
                      />
                      <button type="button" @click=${this._handleAddEditChecklistItem}>+ Añadir</button>
                    </div>
                  </div>
                ` : ''}
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
              ${this._showNewCategoryForm ? html`
                <div class="new-category-form" style="margin-top: 1rem;">
                  <div class="new-category-form-title">Nueva categoría</div>
                  <div class="new-category-form-row">
                    <input
                      type="text"
                      placeholder="Nombre de la categoría"
                      .value=${this._newCategoryName}
                      @input=${this._handleNewCategoryNameChange}
                    />
                    ${this.listType === 'shopping' ? html`
                      <input
                        type="text"
                        placeholder="📦"
                        .value=${this._newCategoryIcon}
                        @input=${this._handleNewCategoryIconChange}
                        style="width: 50px; text-align: center;"
                        maxlength="4"
                      />
                    ` : ''}
                  </div>
                  <div class="new-category-form-row">
                    <div class="color-picker">
                      ${CATEGORY_COLORS.map(color => html`
                        <button
                          type="button"
                          class="color-option ${this._newCategoryBgColor === color.bgColor ? 'selected' : ''}"
                          style="background: ${color.bgColor}"
                          @click=${() => this._selectCategoryColor(color)}
                          title=${color.name}
                        ></button>
                      `)}
                    </div>
                  </div>
                  <div class="new-category-form-actions">
                    <button type="button" class="btn-cancel-category" @click=${this._closeNewCategoryForm}>
                      Cancelar
                    </button>
                    <button type="button" class="btn-create-category" @click=${this._handleCreateCategory}>
                      Crear
                    </button>
                  </div>
                </div>
              ` : ''}
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

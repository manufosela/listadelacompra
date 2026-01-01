/**
 * Categories Manager Component
 * Gestiona las categorías de un grupo para listas de compra y generales.
 */

import { LitElement, html, css } from '/js/vendor/lit.bundle.js';
import {
  DEFAULT_SHOPPING_CATEGORIES,
  CATEGORY_COLORS,
  getGroupCategories,
  createGroupCategory,
  updateGroupCategory,
  deleteGroupCategory,
  getNextAvailableColor
} from '/js/categories.js';

export class HcCategoriesManager extends LitElement {
  static properties = {
    groupId: { type: String },
    userId: { type: String },
    listType: { type: String },
    _categories: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _showModal: { type: Boolean, state: true },
    _editingCategory: { type: Object, state: true },
    _formName: { type: String, state: true },
    _formIcon: { type: String, state: true },
    _formBgColor: { type: String, state: true },
    _formTextColor: { type: String, state: true },
    _error: { type: String, state: true }
  };

  static styles = css`
    :host {
      display: block;
    }

    .categories-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm, 8px);
    }

    .category-item {
      display: flex;
      align-items: center;
      gap: var(--space-md, 12px);
      padding: var(--space-md, 12px);
      background: var(--color-bg, white);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: var(--radius-md, 8px);
    }

    .category-icon {
      font-size: 1.5rem;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm, 4px);
    }

    .category-badge {
      padding: 6px 12px;
      border-radius: var(--radius-full, 999px);
      font-size: var(--font-size-sm, 14px);
      font-weight: 500;
    }

    .category-info {
      flex: 1;
    }

    .category-name {
      font-weight: 500;
      color: var(--color-text, #1f2937);
    }

    .category-meta {
      font-size: var(--font-size-xs, 12px);
      color: var(--color-text-secondary, #6b7280);
      display: flex;
      align-items: center;
      gap: var(--space-xs, 4px);
    }

    .default-badge {
      background: var(--color-border, #e5e7eb);
      padding: 2px 6px;
      border-radius: var(--radius-sm, 4px);
      font-size: 10px;
      text-transform: uppercase;
    }

    .category-actions {
      display: flex;
      gap: var(--space-xs, 4px);
    }

    .btn-icon {
      padding: 8px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: var(--radius-sm, 4px);
      color: var(--color-text-secondary, #6b7280);
      transition: all 0.15s ease;
    }

    .btn-icon:hover {
      background: var(--color-border, #e5e7eb);
      color: var(--color-text, #1f2937);
    }

    .btn-icon.delete:hover {
      background: #fee2e2;
      color: #dc2626;
    }

    .btn-icon:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .add-category-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm, 8px);
      padding: var(--space-md, 12px);
      background: none;
      border: 2px dashed var(--color-border, #e5e7eb);
      border-radius: var(--radius-md, 8px);
      color: var(--color-text-secondary, #6b7280);
      font-size: var(--font-size-sm, 14px);
      cursor: pointer;
      transition: all 0.15s ease;
      width: 100%;
      margin-top: var(--space-sm, 8px);
    }

    .add-category-btn:hover {
      border-color: var(--color-primary, #2563eb);
      color: var(--color-primary, #2563eb);
      background: rgba(37, 99, 235, 0.05);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--space-md, 12px);
    }

    .modal {
      background: var(--color-bg, white);
      border-radius: var(--radius-lg, 12px);
      width: 100%;
      max-width: 400px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      padding: var(--space-lg, 16px);
      border-bottom: 1px solid var(--color-border, #e5e7eb);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-header h2 {
      font-size: var(--font-size-lg, 18px);
      margin: 0;
    }

    .modal-body {
      padding: var(--space-lg, 16px);
    }

    .form-group {
      margin-bottom: var(--space-md, 12px);
    }

    .form-group label {
      display: block;
      font-size: var(--font-size-sm, 14px);
      font-weight: 500;
      margin-bottom: var(--space-xs, 4px);
      color: var(--color-text, #1f2937);
    }

    .form-group input {
      width: 100%;
      padding: var(--space-sm, 8px) var(--space-md, 12px);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: var(--radius-md, 8px);
      font-size: var(--font-size-base, 16px);
      background: var(--color-bg, white);
      color: var(--color-text, #1f2937);
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--color-primary, #2563eb);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .color-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: var(--space-xs, 4px);
    }

    .color-option {
      width: 100%;
      aspect-ratio: 1;
      border: 2px solid transparent;
      border-radius: var(--radius-sm, 4px);
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    .color-option:hover {
      transform: scale(1.1);
    }

    .color-option.selected {
      border-color: var(--color-text, #1f2937);
      box-shadow: 0 0 0 2px white inset;
    }

    .preview-section {
      margin-top: var(--space-lg, 16px);
      padding: var(--space-md, 12px);
      background: var(--color-bg-secondary, #f9fafb);
      border-radius: var(--radius-md, 8px);
    }

    .preview-label {
      font-size: var(--font-size-xs, 12px);
      color: var(--color-text-secondary, #6b7280);
      margin-bottom: var(--space-sm, 8px);
    }

    .modal-footer {
      padding: var(--space-lg, 16px);
      border-top: 1px solid var(--color-border, #e5e7eb);
      display: flex;
      gap: var(--space-sm, 8px);
      justify-content: flex-end;
    }

    .btn {
      padding: var(--space-sm, 8px) var(--space-lg, 16px);
      border: none;
      border-radius: var(--radius-md, 8px);
      font-size: var(--font-size-sm, 14px);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-secondary {
      background: var(--color-border, #e5e7eb);
      color: var(--color-text, #1f2937);
    }

    .btn-secondary:hover {
      background: #d1d5db;
    }

    .btn-primary {
      background: var(--color-primary, #2563eb);
      color: white;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-danger {
      background: #dc2626;
      color: white;
    }

    .btn-danger:hover {
      background: #b91c1c;
    }

    .error-message {
      background: #fee2e2;
      color: #dc2626;
      padding: var(--space-sm, 8px) var(--space-md, 12px);
      border-radius: var(--radius-md, 8px);
      font-size: var(--font-size-sm, 14px);
      margin-bottom: var(--space-md, 12px);
    }

    .empty-state {
      text-align: center;
      padding: var(--space-2xl, 32px);
      color: var(--color-text-secondary, #6b7280);
    }

    .empty-state p {
      margin-bottom: var(--space-md, 12px);
    }

    .loading {
      text-align: center;
      padding: var(--space-2xl, 32px);
      color: var(--color-text-secondary, #6b7280);
    }

    /* Sección de categorías por defecto */
    .section-title {
      font-size: var(--font-size-sm, 14px);
      font-weight: 600;
      color: var(--color-text-secondary, #6b7280);
      margin-bottom: var(--space-sm, 8px);
      margin-top: var(--space-lg, 16px);
    }

    .section-title:first-child {
      margin-top: 0;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .category-item {
        background: #1e293b;
        border-color: #334155;
      }

      .category-name {
        color: #f1f5f9;
      }

      .category-meta {
        color: #94a3b8;
      }

      .default-badge {
        background: #334155;
        color: #94a3b8;
      }

      .btn-icon {
        color: #94a3b8;
      }

      .btn-icon:hover {
        background: #334155;
        color: #f1f5f9;
      }

      .add-category-btn {
        border-color: #334155;
        color: #94a3b8;
      }

      .add-category-btn:hover {
        border-color: #3b82f6;
        color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }

      .modal {
        background: #1e293b;
      }

      .modal-header {
        border-color: #334155;
      }

      .modal-header h2 {
        color: #f1f5f9;
      }

      .form-group label {
        color: #f1f5f9;
      }

      .form-group input {
        background: #0f172a;
        border-color: #334155;
        color: #f1f5f9;
      }

      .form-group input:focus {
        border-color: #3b82f6;
      }

      .preview-section {
        background: #0f172a;
      }

      .preview-label {
        color: #94a3b8;
      }

      .modal-footer {
        border-color: #334155;
      }

      .btn-secondary {
        background: #334155;
        color: #f1f5f9;
      }

      .btn-secondary:hover {
        background: #475569;
      }

      .section-title {
        color: #94a3b8;
      }
    }
  `;

  constructor() {
    super();
    this.groupId = null;
    this.userId = null;
    this.listType = 'shopping';
    this._categories = [];
    this._loading = true;
    this._showModal = false;
    this._editingCategory = null;
    this._formName = '';
    this._formIcon = '📦';
    this._formBgColor = CATEGORY_COLORS[0].bgColor;
    this._formTextColor = CATEGORY_COLORS[0].textColor;
    this._error = null;
  }

  updated(changedProperties) {
    if (changedProperties.has('groupId') || changedProperties.has('listType')) {
      if (this.groupId) {
        this._loadCategories();
      }
    }
  }

  async _loadCategories() {
    this._loading = true;
    this._error = null;

    try {
      const customCategories = await getGroupCategories(this.groupId, this.listType);
      this._categories = customCategories;
    } catch (error) {
      console.error('Error loading categories:', error);
      this._error = 'Error al cargar las categorías';
    } finally {
      this._loading = false;
    }
  }

  _openCreateModal() {
    this._editingCategory = null;
    this._formName = '';
    this._formIcon = '📦';

    // Obtener siguiente color disponible
    const nextColor = getNextAvailableColor(this._categories);
    this._formBgColor = nextColor.bgColor;
    this._formTextColor = nextColor.textColor;

    this._showModal = true;
    this._error = null;
  }

  _openEditModal(category) {
    this._editingCategory = category;
    this._formName = category.name;
    this._formIcon = category.icon || '📦';
    this._formBgColor = category.bgColor || CATEGORY_COLORS[0].bgColor;
    this._formTextColor = category.textColor || CATEGORY_COLORS[0].textColor;
    this._showModal = true;
    this._error = null;
  }

  _closeModal() {
    this._showModal = false;
    this._editingCategory = null;
    this._error = null;
  }

  _handleNameChange(e) {
    this._formName = e.target.value;
  }

  _handleIconChange(e) {
    this._formIcon = e.target.value;
  }

  _selectColor(color) {
    this._formBgColor = color.bgColor;
    this._formTextColor = color.textColor;
  }

  async _handleSave() {
    if (!this._formName.trim()) {
      this._error = 'El nombre es obligatorio';
      return;
    }

    try {
      if (this._editingCategory) {
        // Actualizar categoría existente
        await updateGroupCategory(this.groupId, this._editingCategory.id, {
          name: this._formName.trim(),
          icon: this.listType === 'shopping' ? this._formIcon : null,
          bgColor: this._formBgColor,
          textColor: this._formTextColor
        });
      } else {
        // Crear nueva categoría
        await createGroupCategory(this.groupId, {
          name: this._formName.trim(),
          icon: this._formIcon,
          bgColor: this._formBgColor,
          textColor: this._formTextColor,
          listType: this.listType
        }, this.userId);
      }

      await this._loadCategories();
      this._closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      this._error = 'Error al guardar la categoría';
    }
  }

  async _handleDelete(category) {
    if (!confirm(`¿Eliminar la categoría "${category.name}"? Los items que la usen quedarán sin categoría.`)) {
      return;
    }

    try {
      await deleteGroupCategory(this.groupId, category.id);
      await this._loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      this._error = 'Error al eliminar la categoría';
    }
  }

  _renderCategoryItem(category, isDefault = false) {
    const isShopping = this.listType === 'shopping';

    return html`
      <div class="category-item">
        ${isShopping ? html`
          <div class="category-icon" style="background: ${category.bgColor}">
            ${category.icon}
          </div>
        ` : html`
          <span class="category-badge" style="background: ${category.bgColor}; color: ${category.textColor}">
            ${category.name}
          </span>
        `}

        <div class="category-info">
          ${isShopping ? html`<div class="category-name">${category.name}</div>` : ''}
          <div class="category-meta">
            ${isDefault ? html`<span class="default-badge">Por defecto</span>` : ''}
          </div>
        </div>

        <div class="category-actions">
          <button
            class="btn-icon"
            @click=${() => this._openEditModal(category)}
            ?disabled=${isDefault}
            title=${isDefault ? 'No se puede editar' : 'Editar'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            class="btn-icon delete"
            @click=${() => this._handleDelete(category)}
            ?disabled=${isDefault}
            title=${isDefault ? 'No se puede eliminar' : 'Eliminar'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  _renderModal() {
    if (!this._showModal) return '';

    const isShopping = this.listType === 'shopping';
    const isEditing = !!this._editingCategory;

    return html`
      <div class="modal-overlay" @click=${(e) => e.target === e.currentTarget && this._closeModal()}>
        <div class="modal">
          <div class="modal-header">
            <h2>${isEditing ? 'Editar categoría' : 'Nueva categoría'}</h2>
            <button class="btn-icon" @click=${this._closeModal}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            ${this._error ? html`<div class="error-message">${this._error}</div>` : ''}

            <div class="form-group">
              <label for="category-name">Nombre</label>
              <input
                type="text"
                id="category-name"
                .value=${this._formName}
                @input=${this._handleNameChange}
                placeholder="Nombre de la categoría"
              />
            </div>

            ${isShopping ? html`
              <div class="form-group">
                <label for="category-icon">Emoji</label>
                <input
                  type="text"
                  id="category-icon"
                  .value=${this._formIcon}
                  @input=${this._handleIconChange}
                  placeholder="📦"
                  maxlength="4"
                />
              </div>
            ` : ''}

            <div class="form-group">
              <label>Color</label>
              <div class="color-grid">
                ${CATEGORY_COLORS.map(color => html`
                  <button
                    type="button"
                    class="color-option ${this._formBgColor === color.bgColor ? 'selected' : ''}"
                    style="background: ${color.bgColor}"
                    @click=${() => this._selectColor(color)}
                    title=${color.name}
                  ></button>
                `)}
              </div>
            </div>

            <div class="preview-section">
              <div class="preview-label">Vista previa</div>
              ${isShopping ? html`
                <div class="category-item" style="margin: 0; border: none; background: transparent; padding: 0;">
                  <div class="category-icon" style="background: ${this._formBgColor}">
                    ${this._formIcon}
                  </div>
                  <div class="category-info">
                    <div class="category-name">${this._formName || 'Nombre'}</div>
                  </div>
                </div>
              ` : html`
                <span class="category-badge" style="background: ${this._formBgColor}; color: ${this._formTextColor}">
                  ${this._formName || 'Nombre'}
                </span>
              `}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click=${this._closeModal}>Cancelar</button>
            <button class="btn btn-primary" @click=${this._handleSave}>
              ${isEditing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    if (this._loading) {
      return html`<div class="loading">Cargando categorías...</div>`;
    }

    const isShopping = this.listType === 'shopping';
    const defaultCategories = isShopping ? DEFAULT_SHOPPING_CATEGORIES : [];

    return html`
      ${this._error && !this._showModal ? html`<div class="error-message">${this._error}</div>` : ''}

      ${isShopping ? html`
        <div class="section-title">Categorías por defecto</div>
        <div class="categories-list">
          ${defaultCategories.map(cat => this._renderCategoryItem(cat, true))}
        </div>
      ` : ''}

      ${isShopping ? html`<div class="section-title">Categorías personalizadas</div>` : ''}

      ${this._categories.length === 0 && !isShopping ? html`
        <div class="empty-state">
          <p>No hay categorías personalizadas</p>
          <p>Crea una para organizar tus listas</p>
        </div>
      ` : html`
        <div class="categories-list">
          ${this._categories.map(cat => this._renderCategoryItem(cat, false))}
        </div>
      `}

      <button class="add-category-btn" @click=${this._openCreateModal}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nueva categoría
      </button>

      ${this._renderModal()}
    `;
  }
}

customElements.define('hc-categories-manager', HcCategoriesManager);

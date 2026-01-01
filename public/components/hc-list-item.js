import { LitElement, html, css } from '/js/vendor/lit.bundle.js';

export class HcListItem extends LitElement {
  static properties = {
    item: { type: Object },
    members: { type: Array },
    mode: { type: String }, // 'shopping' or 'edit'
    listType: { type: String }, // 'shopping' or 'agnostic'
    expanded: { type: Boolean, state: true },
    showAssignMenu: { type: Boolean, state: true },
    showChecklist: { type: Boolean, state: true },
    newChecklistItem: { type: String, state: true }
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

    .item.checked .item-name {
      text-decoration: line-through;
    }

    .item.clickable {
      cursor: pointer;
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

    .assignee {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.5rem;
      background: #eff6ff;
      border-radius: 9999px;
      font-size: 0.75rem;
      color: #2563eb;
    }

    .assignee-avatar {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #2563eb;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.625rem;
      font-weight: 600;
    }

    .assignee-avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .assign-wrapper {
      position: relative;
    }

    .assign-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      min-width: 180px;
      z-index: 100;
      overflow: hidden;
    }

    .assign-menu-header {
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: #64748b;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .assign-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      transition: background 0.15s ease;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-size: 0.875rem;
    }

    .assign-option:hover {
      background: #f8fafc;
    }

    .assign-option.selected {
      background: #eff6ff;
    }

    .assign-option .avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #64748b;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .assign-option .avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .assign-option.unassign {
      color: #dc2626;
      border-top: 1px solid #e2e8f0;
    }

    /* Estilos para listas agnósticas */
    .item.priority-high {
      border-left: 3px solid #dc2626;
    }

    .item.priority-medium {
      border-left: 3px solid #f59e0b;
    }

    .item.priority-low {
      border-left: 3px solid #10b981;
    }

    .checkbox-square {
      width: 20px;
      height: 20px;
      border: 2px solid #cbd5e1;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      flex-shrink: 0;
      font-size: 0.75rem;
    }

    .checkbox-square:hover {
      border-color: #2563eb;
    }

    .checkbox-square.checked {
      background: #2563eb;
      border-color: #2563eb;
      color: white;
    }

    .priority-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .priority-badge.high {
      background: #fef2f2;
      color: #dc2626;
    }

    .priority-badge.medium {
      background: #fffbeb;
      color: #d97706;
    }

    .priority-badge.low {
      background: #ecfdf5;
      color: #059669;
    }

    .item-notes-inline {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.25rem;
    }

    /* Estilos para sublistas con details/summary */
    .item-checklist {
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      background: white;
      transition: all 0.15s ease;
    }

    .item-checklist:hover {
      border-color: #cbd5e1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .item-checklist details {
      width: 100%;
    }

    .item-checklist summary {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      list-style: none;
      user-select: none;
      color: #1e293b;
    }

    .item-checklist summary::-webkit-details-marker {
      display: none;
    }

    .item-checklist summary::before {
      content: '▶';
      font-size: 0.625rem;
      color: #94a3b8;
      transition: transform 0.15s ease;
    }

    .item-checklist details[open] summary::before {
      transform: rotate(90deg);
    }

    .summary-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .summary-name {
      font-weight: 500;
      color: #1e293b;
    }

    .summary-progress {
      font-size: 0.75rem;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
    }

    .summary-progress.complete {
      background: #dcfce7;
      color: #166534;
    }

    .summary-progress.partial {
      background: #fef3c7;
      color: #92400e;
    }

    .checklist-content {
      padding: 0 1rem 0.75rem 2.25rem;
    }

    .checklist-items {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .checklist-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
      font-size: 0.875rem;
    }

    .checklist-item-checkbox {
      width: 16px;
      height: 16px;
      border: 1.5px solid #cbd5e1;
      border-radius: 3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      flex-shrink: 0;
      font-size: 0.625rem;
      background: white;
    }

    .checklist-item-checkbox:hover {
      border-color: #2563eb;
    }

    .checklist-item-checkbox.checked {
      background: #22c55e;
      border-color: #22c55e;
      color: white;
    }

    .checklist-item-text {
      flex: 1;
      color: #334155;
    }

    .checklist-item-text.checked {
      text-decoration: line-through;
      color: #94a3b8;
    }

    .checklist-item-remove {
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      border-radius: 3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      color: #94a3b8;
      opacity: 0;
      transition: all 0.15s ease;
    }

    .checklist-item:hover .checklist-item-remove {
      opacity: 1;
    }

    .checklist-item-remove:hover {
      background: #fef2f2;
      color: #dc2626;
    }

    .checklist-add {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .checklist-add-input {
      flex: 1;
      padding: 0.375rem 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      background: white;
      color: #1e293b;
    }

    .checklist-add-input::placeholder {
      color: #94a3b8;
    }

    .checklist-add-input:focus {
      outline: none;
      border-color: #2563eb;
    }

    .checklist-add-btn {
      padding: 0.375rem 0.5rem;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .checklist-add-btn:hover {
      background: #1d4ed8;
    }

    .checklist-add-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }

    /* Acciones en el summary */
    .summary-actions {
      display: flex;
      gap: 0.25rem;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .item-checklist:hover .summary-actions {
      opacity: 1;
    }

    @media (prefers-color-scheme: dark) {
      /* Estilos dark mode para items normales */
      .item {
        background: #1e293b;
        border-color: #334155;
        color: #f1f5f9;
      }

      .item:hover {
        border-color: #475569;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      .item.checked .item-name {
        text-decoration: line-through;
      }

      .item-name {
        color: #f1f5f9;
      }

      .item-quantity {
        color: #94a3b8;
      }

      .item-meta {
        color: #64748b;
      }

      .item-notes {
        color: #94a3b8;
        border-color: #334155;
      }

      .item-notes-inline {
        color: #94a3b8;
      }

      .checkbox {
        border-color: #475569;
      }

      .checkbox:hover {
        border-color: #22c55e;
      }

      .checkbox-square {
        border-color: #475569;
        background: #1e293b;
      }

      .checkbox-square:hover {
        border-color: #3b82f6;
      }

      .action-btn {
        color: #94a3b8;
      }

      .action-btn:hover {
        background: #334155;
        color: #f1f5f9;
      }

      .action-btn.danger:hover {
        background: #450a0a;
        color: #fca5a5;
      }

      .assignee {
        background: #1e3a5f;
        color: #93c5fd;
      }

      .assign-menu {
        background: #1e293b;
        border-color: #334155;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .assign-menu-header {
        color: #94a3b8;
        background: #0f172a;
        border-color: #334155;
      }

      .assign-option {
        color: #f1f5f9;
      }

      .assign-option:hover {
        background: #334155;
      }

      .assign-option.selected {
        background: #1e3a5f;
      }

      .assign-option.unassign {
        color: #fca5a5;
        border-color: #334155;
      }

      .priority-badge.high {
        background: #450a0a;
        color: #fca5a5;
      }

      .priority-badge.medium {
        background: #451a03;
        color: #fcd34d;
      }

      .priority-badge.low {
        background: #052e16;
        color: #6ee7b7;
      }

      /* Estilos dark mode para sublistas */
      .item-checklist {
        background: #1e293b;
        border-color: #334155;
      }

      .item-checklist:hover {
        border-color: #475569;
      }

      .item-checklist summary {
        color: #f1f5f9;
      }

      .item-checklist summary::before {
        color: #64748b;
      }

      .summary-name {
        color: #f1f5f9;
      }

      .summary-progress {
        background: #334155;
        color: #94a3b8;
      }

      .checklist-item-checkbox {
        background: #1e293b;
        border-color: #475569;
      }

      .checklist-item-text {
        color: #f1f5f9;
      }

      .checklist-item-text.checked {
        color: #64748b;
      }

      .checklist-item-remove {
        color: #64748b;
      }

      .checklist-add-input {
        background: #0f172a;
        color: #f1f5f9;
        border-color: #334155;
      }

      .checklist-add-input::placeholder {
        color: #64748b;
      }
    }
  `;

  constructor() {
    super();
    this.expanded = false;
    this.showAssignMenu = false;
    this.showChecklist = false;
    this.newChecklistItem = '';
    this.members = [];
    this.mode = 'shopping';
    this.listType = 'shopping';
    this._boundCloseMenu = this._closeMenuOnClickOutside.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._boundCloseMenu);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._boundCloseMenu);
  }

  _closeMenuOnClickOutside(e) {
    if (this.showAssignMenu && !this.shadowRoot.contains(e.target)) {
      this.showAssignMenu = false;
    }
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

  _handleItemClick(e) {
    // No hacer toggle si se clickea en botones de acción o menú de asignación
    if (e.target.closest('.item-actions') || e.target.closest('.assign-menu')) {
      return;
    }
    this._handleToggle();
  }

  _handleRemove() {
    this.dispatchEvent(new CustomEvent('remove', {
      detail: { itemId: this.item.id },
      bubbles: true,
      composed: true
    }));
  }

  _handleEdit() {
    this.dispatchEvent(new CustomEvent('edit', {
      detail: { item: this.item },
      bubbles: true,
      composed: true
    }));
  }

  _toggleExpanded() {
    this.expanded = !this.expanded;
  }

  _toggleAssignMenu(e) {
    e.stopPropagation();
    this.showAssignMenu = !this.showAssignMenu;
  }

  _handleAssign(memberId, e) {
    e.stopPropagation();
    this.showAssignMenu = false;

    this.dispatchEvent(new CustomEvent('assign', {
      detail: {
        itemId: this.item.id,
        assignedTo: memberId
      },
      bubbles: true,
      composed: true
    }));
  }

  _getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  _getAssignee() {
    if (!this.item.assignedTo || !this.members) return null;
    return this.members.find(m => m.id === this.item.assignedTo);
  }

  _getPriorityLabel(priority) {
    const labels = { high: 'Alta', medium: 'Media', low: 'Baja' };
    return labels[priority] || '';
  }

  // Métodos para sublista/checklist
  _hasChecklist() {
    return this.item?.checklist && this.item.checklist.length > 0;
  }

  _getChecklistState() {
    if (!this._hasChecklist()) return { checked: false, indeterminate: false };

    const checklist = this.item.checklist;
    const checkedCount = checklist.filter(i => i.checked).length;

    if (checkedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (checkedCount === checklist.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  }

  _getChecklistProgress() {
    if (!this._hasChecklist()) return '';
    const checklist = this.item.checklist;
    const checkedCount = checklist.filter(i => i.checked).length;
    return `${checkedCount}/${checklist.length}`;
  }

  _toggleChecklist() {
    this.showChecklist = !this.showChecklist;
  }

  _handleChecklistItemToggle(index) {
    this.dispatchEvent(new CustomEvent('checklist-toggle', {
      detail: {
        itemId: this.item.id,
        checklistIndex: index,
        checked: !this.item.checklist[index].checked
      },
      bubbles: true,
      composed: true
    }));
  }

  _handleChecklistItemRemove(index) {
    this.dispatchEvent(new CustomEvent('checklist-remove', {
      detail: {
        itemId: this.item.id,
        checklistIndex: index
      },
      bubbles: true,
      composed: true
    }));
  }

  _handleNewChecklistItemChange(e) {
    this.newChecklistItem = e.target.value;
  }

  _handleNewChecklistItemKeydown(e) {
    if (e.key === 'Enter' && this.newChecklistItem.trim()) {
      e.preventDefault();
      this._addChecklistItem();
    }
  }

  _addChecklistItem() {
    if (!this.newChecklistItem.trim()) return;

    this.dispatchEvent(new CustomEvent('checklist-add', {
      detail: {
        itemId: this.item.id,
        text: this.newChecklistItem.trim()
      },
      bubbles: true,
      composed: true
    }));

    this.newChecklistItem = '';
  }

  _renderChecklistItems() {
    const isEditMode = this.mode === 'edit';
    const checklist = this.item.checklist || [];

    return html`
      <div class="checklist-items">
        ${checklist.map((item, index) => html`
          <div class="checklist-item">
            <div
              class="checklist-item-checkbox ${item.checked ? 'checked' : ''}"
              @click=${() => this._handleChecklistItemToggle(index)}
              role="checkbox"
              aria-checked="${item.checked}"
              tabindex="0"
              @keydown=${(e) => e.key === 'Enter' && this._handleChecklistItemToggle(index)}
            >
              ${item.checked ? '✓' : ''}
            </div>
            <span class="checklist-item-text ${item.checked ? 'checked' : ''}">${item.text}</span>
            ${isEditMode ? html`
              <button
                class="checklist-item-remove"
                @click=${() => this._handleChecklistItemRemove(index)}
                title="Eliminar"
                aria-label="Eliminar ${item.text}"
              >
                ✕
              </button>
            ` : ''}
          </div>
        `)}
      </div>
      ${isEditMode ? html`
        <div class="checklist-add">
          <input
            type="text"
            class="checklist-add-input"
            placeholder="Añadir subelemento..."
            .value=${this.newChecklistItem}
            @input=${this._handleNewChecklistItemChange}
            @keydown=${this._handleNewChecklistItemKeydown}
          />
          <button
            class="checklist-add-btn"
            @click=${this._addChecklistItem}
            ?disabled=${!this.newChecklistItem.trim()}
          >
            + Añadir
          </button>
        </div>
      ` : ''}
    `;
  }

  render() {
    const { item } = this;
    if (!item) return null;

    const assignee = this._getAssignee();
    const hasMembers = this.members && this.members.length > 0;
    const isShoppingMode = this.mode === 'shopping';
    const isEditMode = this.mode === 'edit';
    const isAgnosticList = this.listType === 'agnostic';

    // Render para listas agnósticas
    if (isAgnosticList) {
      const priorityClass = item.priority ? `priority-${item.priority}` : '';
      const checklistState = this._getChecklistState();
      const hasChecklist = this._hasChecklist();
      const isChecklist = item.isChecklist && hasChecklist;

      // Si es una sublista, usar details/summary
      if (isChecklist) {
        const progressClass = checklistState.checked ? 'complete' : (checklistState.indeterminate ? 'partial' : '');

        return html`
          <div class="item-checklist ${priorityClass}">
            <details>
              <summary>
                <div class="summary-content">
                  <span class="summary-name">${item.name}</span>
                  ${item.priority ? html`
                    <span class="priority-badge ${item.priority}">
                      ${this._getPriorityLabel(item.priority)}
                    </span>
                  ` : ''}
                  <span class="summary-progress ${progressClass}">
                    ${this._getChecklistProgress()}
                  </span>
                </div>
                ${isEditMode ? html`
                  <div class="summary-actions">
                    <button class="action-btn" @click=${(e) => { e.preventDefault(); this._handleEdit(); }} title="Editar">
                      ✏️
                    </button>
                    <button class="action-btn danger" @click=${(e) => { e.preventDefault(); this._handleRemove(); }} title="Eliminar">
                      🗑️
                    </button>
                  </div>
                ` : ''}
              </summary>
              <div class="checklist-content">
                ${this._renderChecklistItems()}
              </div>
            </details>
          </div>
        `;
      }

      // Si es un item normal, usar checkbox
      return html`
        <div
          class="item ${item.checked && isShoppingMode ? 'checked' : ''} ${priorityClass} ${isShoppingMode ? 'clickable' : ''}"
          @click=${isShoppingMode ? this._handleItemClick : null}
        >
          <!-- Checkbox solo en modo usar, no en modo edición -->
          ${isShoppingMode ? html`
            <div
              class="checkbox-square ${item.checked ? 'checked' : ''}"
              @click=${(e) => e.stopPropagation()}
              role="checkbox"
              aria-checked="${item.checked}"
              tabindex="0"
              @keydown=${(e) => e.key === 'Enter' && this._handleToggle()}
            >
              ${item.checked ? '✓' : ''}
            </div>
          ` : ''}

          <div class="item-content">
            <div class="item-main">
              <span class="item-name">${item.name}</span>
              ${item.priority ? html`
                <span class="priority-badge ${item.priority}">
                  ${this._getPriorityLabel(item.priority)}
                </span>
              ` : ''}
              ${assignee && isShoppingMode ? html`
                <span class="assignee">
                  <span class="assignee-avatar">
                    ${assignee.photoURL
                      ? html`<img src="${assignee.photoURL}" alt="">`
                      : this._getInitials(assignee.displayName)}
                  </span>
                  ${assignee.displayName?.split(' ')[0] || 'Asignado'}
                </span>
              ` : ''}
            </div>

            ${item.notes ? html`
              <div class="item-notes-inline">📝 ${item.notes}</div>
            ` : ''}
          </div>

          <div class="item-actions" style="${isEditMode || (hasMembers && isShoppingMode) ? 'opacity: 1;' : ''}">
            <!-- Botón asignar en modo usar si hay miembros -->
            ${hasMembers && isShoppingMode ? html`
              <div class="assign-wrapper">
                <button class="action-btn" @click=${this._toggleAssignMenu} title="Asignar">
                  👤
                </button>
                ${this.showAssignMenu ? html`
                  <div class="assign-menu">
                    <div class="assign-menu-header">Asignar a</div>
                    ${this.members.map(member => html`
                      <button
                        class="assign-option ${item.assignedTo === member.id ? 'selected' : ''}"
                        @click=${(e) => this._handleAssign(member.id, e)}
                      >
                        <span class="avatar">
                          ${member.photoURL
                            ? html`<img src="${member.photoURL}" alt="">`
                            : this._getInitials(member.displayName)}
                        </span>
                        <span>${member.displayName || member.email}</span>
                      </button>
                    `)}
                    ${item.assignedTo ? html`
                      <button
                        class="assign-option unassign"
                        @click=${(e) => this._handleAssign(null, e)}
                      >
                        Quitar asignación
                      </button>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            ` : ''}
            ${isEditMode ? html`
              <button class="action-btn" @click=${this._handleEdit} title="Editar">
                ✏️
              </button>
              <button class="action-btn danger" @click=${this._handleRemove} title="Eliminar">
                🗑️
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Render para listas de compra (comportamiento original)
    return html`
      <div
        class="item ${item.checked && isShoppingMode ? 'checked' : ''} ${isShoppingMode ? 'clickable' : ''}"
        @click=${isShoppingMode ? this._handleItemClick : null}
      >
        <!-- Checkbox only in shopping mode -->
        ${isShoppingMode ? html`
          <div
            class="checkbox ${item.checked ? 'checked' : ''}"
            @click=${(e) => e.stopPropagation()}
            role="checkbox"
            aria-checked="${item.checked}"
            tabindex="0"
            @keydown=${(e) => e.key === 'Enter' && this._handleToggle()}
          >
            ${item.checked ? '✓' : ''}
          </div>
        ` : ''}

        <div class="item-content">
          <div class="item-main">
            <span class="item-name">${item.name || item.productName}</span>
            <span class="item-quantity">
              ${item.quantity} ${item.unit}
            </span>
            ${assignee && isShoppingMode ? html`
              <span class="assignee">
                <span class="assignee-avatar">
                  ${assignee.photoURL
                    ? html`<img src="${assignee.photoURL}" alt="">`
                    : this._getInitials(assignee.displayName)}
                </span>
                ${assignee.displayName?.split(' ')[0] || 'Asignado'}
              </span>
            ` : ''}
          </div>

          ${item.checked && item.checkedAt && isShoppingMode ? html`
            <div class="item-meta">
              Comprado ${item.checkedAt.toDate ? item.checkedAt.toDate().toLocaleTimeString() : new Date(item.checkedAt).toLocaleTimeString()}
            </div>
          ` : ''}

          ${this.expanded && item.notes ? html`
            <div class="item-notes">📝 ${item.notes}</div>
          ` : ''}
        </div>

        <div class="item-actions" style="${isEditMode ? 'opacity: 1;' : ''}">
          <!-- Assign button only in shopping mode -->
          ${hasMembers && isShoppingMode ? html`
            <div class="assign-wrapper">
              <button class="action-btn" @click=${this._toggleAssignMenu} title="Asignar">
                👤
              </button>
              ${this.showAssignMenu ? html`
                <div class="assign-menu">
                  <div class="assign-menu-header">Asignar a</div>
                  ${this.members.map(member => html`
                    <button
                      class="assign-option ${item.assignedTo === member.id ? 'selected' : ''}"
                      @click=${(e) => this._handleAssign(member.id, e)}
                    >
                      <span class="avatar">
                        ${member.photoURL
                          ? html`<img src="${member.photoURL}" alt="">`
                          : this._getInitials(member.displayName)}
                      </span>
                      <span>${member.displayName || member.email}</span>
                    </button>
                  `)}
                  ${item.assignedTo ? html`
                    <button
                      class="assign-option unassign"
                      @click=${(e) => this._handleAssign(null, e)}
                    >
                      Quitar asignación
                    </button>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}
          ${item.notes ? html`
            <button class="action-btn" @click=${this._toggleExpanded}>
              ${this.expanded ? '▲' : '▼'}
            </button>
          ` : ''}
          <!-- Edit and Delete buttons only in edit mode -->
          ${isEditMode ? html`
            <button class="action-btn" @click=${this._handleEdit} title="Editar">
              ✏️
            </button>
            <button class="action-btn danger" @click=${this._handleRemove} title="Eliminar">
              🗑️
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('hc-list-item', HcListItem);

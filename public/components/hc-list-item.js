import { LitElement, html, css } from '/js/vendor/lit.bundle.js';

export class HcListItem extends LitElement {
  static properties = {
    item: { type: Object },
    members: { type: Array },
    mode: { type: String }, // 'shopping' or 'edit'
    expanded: { type: Boolean, state: true },
    showAssignMenu: { type: Boolean, state: true }
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
  `;

  constructor() {
    super();
    this.expanded = false;
    this.showAssignMenu = false;
    this.members = [];
    this.mode = 'shopping';
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

  render() {
    const { item } = this;
    if (!item) return null;

    const assignee = this._getAssignee();
    const hasMembers = this.members && this.members.length > 0;
    const isShoppingMode = this.mode === 'shopping';
    const isEditMode = this.mode === 'edit';

    return html`
      <div class="item ${item.checked && isShoppingMode ? 'checked' : ''}">
        <!-- Checkbox only in shopping mode -->
        ${isShoppingMode ? html`
          <div
            class="checkbox ${item.checked ? 'checked' : ''}"
            @click=${this._handleToggle}
          >
            ${item.checked ? '✓' : ''}
          </div>
        ` : ''}

        <div class="item-content" @click=${this._toggleExpanded}>
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
          <!-- Delete button only in edit mode -->
          ${isEditMode ? html`
            <button class="action-btn danger" @click=${this._handleRemove}>
              🗑️
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('hc-list-item', HcListItem);

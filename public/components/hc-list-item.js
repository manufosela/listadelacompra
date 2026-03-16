import { LitElement, html, css } from '/js/vendor/lit.bundle.js';
import { UNITS } from '/js/db.js';

export class HcListItem extends LitElement {
  static properties = {
    item: { type: Object },
    members: { type: Array },
    mode: { type: String }, // 'shopping' or 'edit'
    listType: { type: String }, // 'shopping' or 'agnostic'
    card: { type: Boolean }, // Modo tarjeta (grid)
    expanded: { type: Boolean, state: true },
    showAssignMenu: { type: Boolean, state: true },
    showChecklist: { type: Boolean, state: true },
    newChecklistItem: { type: String, state: true },
    newChecklistItemQuantity: { type: Number, state: true },
    newChecklistItemUnit: { type: String, state: true },
    imageModalUrl: { type: String, state: true }
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
      background: var(--color-bg, #fffbf8);
      border: 1px solid var(--color-border, #ede4dd);
      border-radius: 0.5rem;
      transition: all 0.15s ease;
    }

    .item:hover {
      border-color: var(--color-border-dark, #ddd1c9);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .item.checked .item-name {
      text-decoration: line-through;
    }

    .item.clickable {
      cursor: pointer;
    }

    /* Modo tarjeta (card) */
    .item.card {
      flex-direction: column;
      align-items: stretch;
      padding: 0.875rem;
      min-height: 90px;
    }

    .item.card .checkbox {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 24px;
      height: 24px;
    }

    .item.card .item-content {
      padding-right: 2rem;
    }

    .item.card .item-main {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }

    .item.card .item-name {
      font-size: 0.9375rem;
      white-space: normal;
      line-height: 1.3;
    }

    .item-image {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      object-fit: cover;
      border: 1px solid var(--color-border, #ede4dd);
      cursor: zoom-in;
      transition: transform 0.15s ease;
    }

    .item-image:hover {
      transform: scale(1.1);
    }

    .item-image.card {
      width: 36px;
      height: 36px;
    }

    .image-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100000;
      cursor: zoom-out;
      animation: fade-in 0.2s ease;
    }

    .image-modal-content {
      max-width: 90vw;
      max-height: 90vh;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .item.card .item-quantity {
      font-size: 0.8125rem;
      color: var(--color-text-secondary, #7a6e6a);
    }

    .item.card .item-actions {
      margin-top: auto;
      padding-top: 0.5rem;
      opacity: 1;
      justify-content: flex-end;
    }

    .item.card .item-meta {
      margin-top: 0.375rem;
    }

    .item.card.checked {
      opacity: 0.7;
      background: var(--color-bg-secondary, #fff5ee);
    }

    .checkbox {
      width: 22px;
      height: 22px;
      border: 2px solid var(--color-border-dark, #ddd1c9);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .checkbox:hover {
      border-color: var(--color-success, #6bbe86);
    }

    .checkbox.checked {
      background: var(--color-success, #6bbe86);
      border-color: var(--color-success, #6bbe86);
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
      color: var(--color-text-secondary, #7a6e6a);
      white-space: nowrap;
    }

    .item-meta {
      font-size: 0.75rem;
      color: var(--color-text-tertiary, #a89e9a);
      margin-top: 0.25rem;
    }

    .item-notes {
      font-size: 0.875rem;
      color: var(--color-text-secondary, #7a6e6a);
      font-style: italic;
      margin-top: 0.25rem;
      padding-top: 0.25rem;
      border-top: 1px dashed var(--color-border, #ede4dd);
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
      background: var(--color-bg-tertiary, #ffede3);
    }

    .action-btn.danger:hover {
      background: var(--color-danger-bg, rgba(217, 107, 107, 0.12));
    }

    .assignee {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.5rem;
      background: var(--color-primary-bg, rgba(224, 123, 92, 0.1));
      border-radius: 9999px;
      font-size: 0.75rem;
      color: var(--color-primary, #e07b5c);
    }

    .assignee-avatar {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--color-primary, #e07b5c);
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
      background: var(--color-bg, #fffbf8);
      border: 1px solid var(--color-border, #ede4dd);
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
      color: var(--color-text-secondary, #7a6e6a);
      background: var(--color-bg-secondary, #fff5ee);
      border-bottom: 1px solid var(--color-border, #ede4dd);
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
      background: var(--color-bg-secondary, #fff5ee);
    }

    .assign-option.selected {
      background: var(--color-primary-bg, rgba(224, 123, 92, 0.1));
    }

    .assign-option .avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--color-text-secondary, #7a6e6a);
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
      color: var(--color-danger, #d96b6b);
      border-top: 1px solid var(--color-border, #ede4dd);
    }

    /* Estilos para listas agnósticas */
    .item.priority-high {
      border-left: 3px solid var(--color-danger, #d96b6b);
    }

    .item.priority-medium {
      border-left: 3px solid var(--color-warning, #e8ac4e);
    }

    .item.priority-low {
      border-left: 3px solid var(--color-success, #6bbe86);
    }

    .checkbox-square {
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-border-dark, #ddd1c9);
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
      border-color: var(--color-primary, #e07b5c);
    }

    .checkbox-square.checked {
      background: var(--color-primary, #e07b5c);
      border-color: var(--color-primary, #e07b5c);
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
      background: var(--color-danger-bg, rgba(217, 107, 107, 0.12));
      color: var(--color-danger, #d96b6b);
    }

    .priority-badge.medium {
      background: var(--color-warning-bg, rgba(232, 172, 78, 0.12));
      color: var(--color-warning, #e8ac4e);
    }

    .priority-badge.low {
      background: var(--color-success-bg, rgba(107, 190, 134, 0.12));
      color: var(--color-success, #6bbe86);
    }

    .item-notes-inline {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #7a6e6a);
      margin-top: 0.25rem;
    }

    /* Estilos para sublistas con details/summary */
    .item-checklist {
      border: 1px solid var(--color-border, #ede4dd);
      border-radius: 0.5rem;
      background: var(--color-bg, #fffbf8);
      transition: all 0.15s ease;
    }

    .item-checklist:hover {
      border-color: var(--color-border-dark, #ddd1c9);
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
      color: var(--color-text, #3a302c);
    }

    .item-checklist summary::-webkit-details-marker {
      display: none;
    }

    .item-checklist summary::before {
      content: '▶';
      font-size: 0.625rem;
      color: var(--color-text-tertiary, #a89e9a);
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
      color: var(--color-text, #3a302c);
    }

    .summary-progress {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #7a6e6a);
      background: var(--color-bg-tertiary, #ffede3);
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
      background: var(--color-bg, #fffbf8);
    }

    .checklist-item-checkbox:hover {
      border-color: var(--color-primary, #e07b5c);
    }

    .checklist-item-checkbox.checked {
      background: var(--color-success, #6bbe86);
      border-color: var(--color-success, #6bbe86);
      color: white;
    }

    .checklist-item-text {
      flex: 1;
      color: #334155;
    }

    .checklist-item-text.checked {
      text-decoration: line-through;
      color: var(--color-text-tertiary, #a89e9a);
    }

    .checklist-item-qty {
      font-size: 0.8125rem;
      color: var(--color-text-secondary, #7a6e6a);
      margin-left: 0.5rem;
      white-space: nowrap;
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
      color: var(--color-text-tertiary, #a89e9a);
      opacity: 0;
      transition: all 0.15s ease;
    }

    .checklist-item:hover .checklist-item-remove {
      opacity: 1;
    }

    .checklist-item-remove:hover {
      background: var(--color-danger-bg, rgba(217, 107, 107, 0.12));
      color: var(--color-danger, #d96b6b);
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
      border: 1px solid var(--color-border, #ede4dd);
      border-radius: 0.25rem;
      font-size: 0.875rem;
      background: var(--color-bg, #fffbf8);
      color: var(--color-text, #3a302c);
    }

    .checklist-add-qty,
    .checklist-add-unit {
      padding: 0.375rem 0.5rem;
      border: 1px solid var(--color-border, #ede4dd);
      border-radius: 0.25rem;
      font-size: 0.875rem;
      background: var(--color-bg, #fffbf8);
      color: var(--color-text, #3a302c);
    }

    .checklist-add-qty {
      width: 70px;
    }

    .checklist-add-unit {
      width: 120px;
    }

    .checklist-add-input::placeholder {
      color: var(--color-text-tertiary, #a89e9a);
    }

    .checklist-add-input:focus {
      outline: none;
      border-color: var(--color-primary, #e07b5c);
    }

    .checklist-add-btn {
      padding: 0.375rem 0.5rem;
      background: var(--color-primary, #e07b5c);
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
        color: var(--color-text-tertiary, #a89e9a);
      }

      .item-meta {
        color: var(--color-text-secondary, #7a6e6a);
      }

      .item-notes {
        color: var(--color-text-tertiary, #a89e9a);
        border-color: #334155;
      }

      .item-notes-inline {
        color: var(--color-text-tertiary, #a89e9a);
      }

      .checkbox {
        border-color: #475569;
      }

      .checkbox:hover {
        border-color: var(--color-success, #6bbe86);
      }

      .checkbox-square {
        border-color: #475569;
        background: #1e293b;
      }

      .checkbox-square:hover {
        border-color: #3b82f6;
      }

      .action-btn {
        color: var(--color-text-tertiary, #a89e9a);
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

      /* Card mode dark */
      .item.card.checked {
        background: #0f172a;
      }

      .assign-menu {
        background: #1e293b;
        border-color: #334155;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .assign-menu-header {
        color: var(--color-text-tertiary, #a89e9a);
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
        color: var(--color-text-secondary, #7a6e6a);
      }

      .summary-name {
        color: #f1f5f9;
      }

      .summary-progress {
        background: #334155;
        color: var(--color-text-tertiary, #a89e9a);
      }

      .checklist-item-checkbox {
        background: #1e293b;
        border-color: #475569;
      }

      .checklist-item-text {
        color: #f1f5f9;
      }

      .checklist-item-text.checked {
        color: var(--color-text-secondary, #7a6e6a);
      }

      .checklist-item-remove {
        color: var(--color-text-secondary, #7a6e6a);
      }

      .checklist-add-input {
        background: #0f172a;
        color: #f1f5f9;
        border-color: #334155;
      }

      .checklist-add-input::placeholder {
        color: var(--color-text-secondary, #7a6e6a);
      }

      .checklist-add-qty,
      .checklist-add-unit {
        background: #0f172a;
        color: #f1f5f9;
        border-color: #334155;
      }
    }
  `;

  constructor() {
    super();
    this.expanded = false;
    this.showAssignMenu = false;
    this.showChecklist = false;
    this.newChecklistItem = '';
    this.newChecklistItemQuantity = 1;
    this.newChecklistItemUnit = 'unidad';
    this.members = [];
    this.mode = 'shopping';
    this.listType = 'shopping';
    this.imageModalUrl = null;
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
    // Usar composedPath para Shadow DOM - buscar en toda la ruta del evento
    const path = e.composedPath();
    const clickedOnInteractive = path.some(el =>
      el.classList?.contains('checkbox') ||
      el.classList?.contains('checkbox-square') ||
      el.classList?.contains('item-actions') ||
      el.classList?.contains('assign-menu') ||
      el.classList?.contains('item-image') ||
      el.classList?.contains('action-btn')
    );
    if (clickedOnInteractive) {
      return;
    }
    this._handleToggle();
  }

  _showImageModal(url, e) {
    e.preventDefault();
    e.stopPropagation();
    this.imageModalUrl = url;
  }

  _hideImageModal() {
    this.imageModalUrl = null;
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

  _handleChecklistItemUpdate(index, updates) {
    this.dispatchEvent(new CustomEvent('checklist-update', {
      detail: {
        itemId: this.item.id,
        checklistIndex: index,
        ...updates
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

    const detail = {
      itemId: this.item.id,
      text: this.newChecklistItem.trim()
    };

    if (this.listType === 'shopping') {
      detail.quantity = this.newChecklistItemQuantity || 1;
      detail.unit = this.newChecklistItemUnit || 'unidad';
    }

    this.dispatchEvent(new CustomEvent('checklist-add', {
      detail,
      bubbles: true,
      composed: true
    }));

    this.newChecklistItem = '';
    this.newChecklistItemQuantity = 1;
    this.newChecklistItemUnit = 'unidad';
  }

  _renderChecklistItems() {
    const isEditMode = this.mode === 'edit';
    const isShoppingList = this.listType === 'shopping';
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
            ${isEditMode ? html`
              <input
                type="text"
                class="checklist-add-input"
                .value=${item.text}
                @change=${(e) => this._handleChecklistItemUpdate(index, { text: e.target.value })}
              />
              ${isShoppingList ? html`
                <input
                  type="number"
                  min="1"
                  class="checklist-add-qty"
                  .value=${item.quantity ?? 1}
                  @change=${(e) => this._handleChecklistItemUpdate(index, { quantity: e.target.value })}
                />
                <select
                  class="checklist-add-unit"
                  .value=${item.unit || 'unidad'}
                  @change=${(e) => this._handleChecklistItemUpdate(index, { unit: e.target.value })}
                >
                  ${UNITS.map(unit => html`
                    <option value="${unit.id}">${unit.name}</option>
                  `)}
                </select>
              ` : ''}
            ` : html`
              <span class="checklist-item-text ${item.checked ? 'checked' : ''}">${item.text}</span>
              ${isShoppingList ? html`
                <span class="checklist-item-qty">${item.quantity ?? 1} ${item.unit || 'unidad'}</span>
              ` : ''}
            `}
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
          ${isShoppingList ? html`
            <input
              type="number"
              min="1"
              class="checklist-add-qty"
              .value=${this.newChecklistItemQuantity}
              @input=${(e) => this.newChecklistItemQuantity = parseInt(e.target.value) || 1}
            />
            <select
              class="checklist-add-unit"
              .value=${this.newChecklistItemUnit}
              @change=${(e) => this.newChecklistItemUnit = e.target.value}
            >
              ${UNITS.map(unit => html`
                <option value="${unit.id}">${unit.name}</option>
              `)}
            </select>
          ` : ''}
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
    const priorityClass = item.priority ? `priority-${item.priority}` : '';
    const checklistState = this._getChecklistState();
    const hasChecklist = this._hasChecklist();
    const isChecklist = item.isChecklist && hasChecklist;

    // Si es una sublista, usar details/summary (para cualquier tipo de lista)
    if (isChecklist) {
      const progressClass = checklistState.checked ? 'complete' : (checklistState.indeterminate ? 'partial' : '');

      return html`
        <div class="item-checklist ${isAgnosticList ? priorityClass : ''}">
          <details>
            <summary>
              <div class="summary-content">
                <span class="summary-name">${item.name}</span>
                ${isAgnosticList && item.priority ? html`
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

    // Render para listas agnósticas
    if (isAgnosticList) {
      return html`
        <div
          class="item ${item.checked && isShoppingMode ? 'checked' : ''} ${priorityClass} ${this.card ? 'card' : ''}"
          style="${this.card ? 'position: relative;' : ''}"
        >
          <!-- Checkbox solo en modo usar, no en modo edición -->
          ${isShoppingMode ? html`
            <div
              class="checkbox-square ${item.checked ? 'checked' : ''}"
              @click=${(e) => { e.stopPropagation(); this._handleToggle(); }}
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
    const productImageUrl = item.productImageUrl || item.imageUrl || null;
    return html`
      <div
        class="item ${item.checked && isShoppingMode ? 'checked' : ''} ${this.card ? 'card' : ''}"
        style="${this.card ? 'position: relative;' : ''}"
      >
        <!-- Checkbox only in shopping mode -->
        ${isShoppingMode ? html`
          <div
            class="checkbox ${item.checked ? 'checked' : ''}"
            @click=${(e) => { e.stopPropagation(); this._handleToggle(); }}
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
            ${productImageUrl ? html`
              <img
                class="item-image ${this.card ? 'card' : ''}"
                src="${productImageUrl}"
                alt=""
                @click=${(e) => this._showImageModal(productImageUrl, e)}
                role="button"
                tabindex="0"
                aria-label="Ver imagen ampliada"
                @keydown=${(e) => e.key === 'Enter' && this._showImageModal(productImageUrl, e)}
              >
            ` : ''}
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

      ${this.imageModalUrl ? html`
        <div
          class="image-modal-backdrop"
          @click=${this._hideImageModal}
          role="dialog"
          aria-label="Imagen ampliada"
        >
          <img
            class="image-modal-content"
            src="${this.imageModalUrl}"
            alt="Imagen del producto ampliada"
            @click=${(e) => e.stopPropagation()}
          >
        </div>
      ` : ''}
    `;
  }
}

if (!customElements.get('hc-list-item')) {
  customElements.define('hc-list-item', HcListItem);
}

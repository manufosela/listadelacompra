import { LitElement, html, css } from '/js/vendor/lit.bundle.js';
import { eventBus } from '/js/event-bus.js';
import {
  getUserGroups,
  getCurrentGroupId,
  setCurrentGroup,
  getGroup
} from '/js/group.js';
import { getCurrentUser } from '/js/auth.js';

export class HcGroupSelector extends LitElement {
  static properties = {
    groups: { type: Array, state: true },
    currentGroup: { type: Object, state: true },
    open: { type: Boolean, state: true },
    loading: { type: Boolean, state: true }
  };

  static styles = css`
    :host {
      position: relative;
      display: inline-block;
    }

    .selector-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: transparent;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.15s ease;
    }

    .selector-button:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .group-icon {
      font-size: 1.25rem;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .group-icon-img {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      object-fit: cover;
    }

    .group-item-icon {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .group-item-icon img {
      width: 28px;
      height: 28px;
      border-radius: 4px;
      object-fit: cover;
    }

    .chevron {
      transition: transform 0.15s ease;
    }

    .chevron.open {
      transform: rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 0.5rem;
      min-width: 240px;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 100;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.15s ease;
    }

    .dropdown.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #64748b;
    }

    .group-list {
      max-height: 200px;
      overflow-y: auto;
    }

    .group-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .group-item:hover {
      background: #f8fafc;
    }

    .group-item.active {
      background: #eff6ff;
    }

    .group-name {
      flex: 1;
      font-weight: 500;
    }

    .group-role {
      font-size: 0.75rem;
      color: #64748b;
      padding: 0.125rem 0.5rem;
      background: #f1f5f9;
      border-radius: 9999px;
    }

    .check-icon {
      color: #2563eb;
    }

    .dropdown-footer {
      padding: 0.5rem;
      border-top: 1px solid #e2e8f0;
    }

    .create-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: transparent;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      color: #2563eb;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .create-button:hover {
      background: #eff6ff;
    }

    .empty-state {
      padding: 1.5rem;
      text-align: center;
      color: #64748b;
    }

    .empty-state p {
      margin-bottom: 1rem;
    }

    .loading {
      padding: 0.5rem 1rem;
      color: #64748b;
    }

    @media (prefers-color-scheme: dark) {
      .selector-button {
        color: #f1f5f9;
        border-color: #475569;
      }

      .selector-button:hover {
        background: #334155;
        border-color: #64748b;
      }

      .dropdown {
        background: #1e293b;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }

      .dropdown-header {
        border-color: #334155;
        color: #94a3b8;
      }

      .group-item {
        color: #f1f5f9;
      }

      .group-item:hover {
        background: #334155;
      }

      .group-item.active {
        background: #1e3a5f;
      }

      .group-role {
        color: #94a3b8;
        background: #334155;
      }

      .check-icon {
        color: #60a5fa;
      }

      .dropdown-footer {
        border-color: #334155;
      }

      .create-button {
        color: #60a5fa;
      }

      .create-button:hover {
        background: #1e3a5f;
      }

      .empty-state {
        color: #94a3b8;
      }

      .loading {
        color: #94a3b8;
      }
    }
  `;

  constructor() {
    super();
    this._componentId = `group-selector-${Math.random().toString(36).substr(2, 9)}`;
    this.groups = [];
    this.currentGroup = null;
    this.open = false;
    this.loading = true;
  }

  async connectedCallback() {
    super.connectedCallback();

    this._handleClickOutside = (e) => {
      if (this.open && !this.contains(e.target)) {
        this.open = false;
      }
    };
    document.addEventListener('click', this._handleClickOutside);

    // Registrar componente
    eventBus.registerComponent(this._componentId);

    // Esperar a que el usuario esté autenticado
    const user = getCurrentUser();
    if (user) {
      await this._loadGroups();
    } else {
      // Escuchar evento de auth ready
      window.addEventListener('auth-ready', async () => {
        await this._loadGroups();
      }, { once: true });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleClickOutside);
    eventBus.unregisterComponent(this._componentId);
  }

  async _loadGroups() {
    this.loading = true;
    try {
      this.groups = await getUserGroups();

      // Cargar grupo actual
      const currentId = getCurrentGroupId();
      if (currentId) {
        this.currentGroup = await getGroup(currentId);
      } else if (this.groups.length > 0) {
        // Si no hay grupo seleccionado, usar el primero
        this.currentGroup = this.groups[0];
        setCurrentGroup(this.groups[0].id);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
    this.loading = false;
  }

  _toggleDropdown(e) {
    e.stopPropagation();
    this.open = !this.open;
  }

  _selectGroup(group) {
    this.currentGroup = group;
    setCurrentGroup(group.id);
    this.open = false;

    // Notificar cambio via Event Bus
    eventBus.emit('group:changed', {
      senderId: this._componentId,
      groupId: group.id,
      group: group
    });
  }

  _openCreateModal() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('create-group', {
      bubbles: true,
      composed: true
    }));
  }

  _openJoinModal() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('join-group', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">...</div>`;
    }

    const user = getCurrentUser();

    return html`
      <button class="selector-button" @click=${this._toggleDropdown}>
        <span class="group-icon">
          ${this.currentGroup?.iconUrl
            ? html`<img src="${this.currentGroup.iconUrl}" alt="" class="group-icon-img" />`
            : html`🏠`
          }
        </span>
        <span>${this.currentGroup?.name || 'Seleccionar grupo'}</span>
        <span class="chevron ${this.open ? 'open' : ''}">▼</span>
      </button>

      <div class="dropdown ${this.open ? 'open' : ''}">
        ${this.groups.length > 0 ? html`
          <div class="dropdown-header">Mis grupos</div>
          <div class="group-list">
            ${this.groups.map(h => html`
              <button
                class="group-item ${this.currentGroup?.id === h.id ? 'active' : ''}"
                @click=${() => this._selectGroup(h)}
              >
                <span class="group-item-icon">
                  ${h.iconUrl
                    ? html`<img src="${h.iconUrl}" alt="" />`
                    : html`🏠`
                  }
                </span>
                <span class="group-name">${h.name}</span>
                <span class="group-role">
                  ${h.members[user?.uid]?.role || 'member'}
                </span>
                ${this.currentGroup?.id === h.id ? html`
                  <span class="check-icon">✓</span>
                ` : ''}
              </button>
            `)}
          </div>
        ` : html`
          <div class="empty-state">
            <p>No perteneces a ningún grupo todavía.</p>
          </div>
        `}

        <div class="dropdown-footer">
          <button class="create-button" @click=${this._openCreateModal}>
            ➕ Crear nuevo grupo
          </button>
          <button class="create-button" @click=${this._openJoinModal}>
            🔗 Unirse con código
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('hc-group-selector', HcGroupSelector);

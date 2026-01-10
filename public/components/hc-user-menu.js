import { LitElement, html, css } from '/js/vendor/lit.bundle.js';
import { eventBus } from '/js/event-bus.js';
import { signOut, onAuthStateChanged } from '/js/auth.js';

export class HcUserMenu extends LitElement {
  static properties = {
    user: { type: Object, state: true },
    open: { type: Boolean, state: true },
    imageError: { type: Boolean, state: true }
  };

  static styles = css`
    :host {
      position: relative;
      display: inline-block;
    }

    .user-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: transparent;
      border: none;
      border-radius: 9999px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .user-button:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      color: #64748b;
    }

    .dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 0.5rem;
      min-width: 200px;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
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

    .user-info {
      padding: 1rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .user-name {
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .user-email {
      font-size: 0.875rem;
      color: #64748b;
    }

    .dropdown-menu {
      padding: 0.5rem 0;
    }

    .dropdown-item {
      display: block;
      width: 100%;
      padding: 0.5rem 1rem;
      text-align: left;
      background: transparent;
      border: none;
      font-size: 0.875rem;
      color: inherit;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;
    }

    .dropdown-item:hover {
      background: #f8fafc;
    }

    .dropdown-item.danger {
      color: #ef4444;
    }
  `;

  constructor() {
    super();
    this._componentId = `user-menu-${Math.random().toString(36).substr(2, 9)}`;
    this.user = null;
    this.open = false;
    this.imageError = false;
  }

  connectedCallback() {
    super.connectedCallback();

    // Escuchar cambios de autenticación
    this._unsubscribe = onAuthStateChanged((user) => {
      this.user = user;
      this.imageError = false; // Reset error on user change
      // Notificar cambio de usuario via Event Bus
      eventBus.emit('user:changed', {
        senderId: this._componentId,
        user: user
      });
    });

    // Cerrar dropdown al hacer clic fuera
    this._handleClickOutside = (e) => {
      if (this.open && !this.contains(e.target)) {
        this.open = false;
      }
    };
    document.addEventListener('click', this._handleClickOutside);

    // Registrar componente como listo
    eventBus.registerComponent(this._componentId);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribe) this._unsubscribe();
    document.removeEventListener('click', this._handleClickOutside);
    eventBus.unregisterComponent(this._componentId);
  }

  _toggleDropdown(e) {
    e.stopPropagation();
    this.open = !this.open;
  }

  async _handleSignOut() {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  _getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  render() {
    if (!this.user) {
      return html`<div class="loading"></div>`;
    }

    const photoURL = this.user.photoURL;
    const hasValidPhoto = photoURL && typeof photoURL === 'string' && photoURL.startsWith('http') && !this.imageError;

    return html`
      <button class="user-button" @click=${this._toggleDropdown}>
        ${hasValidPhoto
          ? html`<img
              class="avatar"
              src=${photoURL}
              alt="Avatar"
              referrerpolicy="no-referrer"
              @error=${() => { this.imageError = true; }}
            />`
          : html`<div class="avatar-placeholder">${this._getInitials(this.user.displayName)}</div>`
        }
      </button>

      <div class="dropdown ${this.open ? 'open' : ''}">
        <div class="user-info">
          <div class="user-name">${this.user.displayName || 'Usuario'}</div>
          <div class="user-email">${this.user.email}</div>
        </div>
        <div class="dropdown-menu">
          <a href="/app/settings" class="dropdown-item">Configuración</a>
          <a href="/app/settings/groups" class="dropdown-item">Gestionar grupos</a>
          <button class="dropdown-item danger" @click=${this._handleSignOut}>
            Cerrar sesión
          </button>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('hc-user-menu')) {
  customElements.define('hc-user-menu', HcUserMenu);
}

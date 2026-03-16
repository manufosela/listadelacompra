import { LitElement, html, css } from '/js/vendor/lit.bundle.js';
import { eventBus } from '/js/event-bus.js';
import {
  getGroupMembers,
  removeMember,
  updateMemberRole,
  generateGroupInvite,
  isAdmin,
  getCurrentGroupId
} from '/js/group.js';
import { getCurrentUser } from '/js/auth.js';

export class HcMemberManager extends LitElement {
  static properties = {
    groupId: { type: String, attribute: 'group-id' },
    members: { type: Array, state: true },
    isCurrentUserAdmin: { type: Boolean, state: true },
    inviteCode: { type: String, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true }
  };

  static styles = css`
    :host {
      display: block;
    }

    .member-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .member-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--color-bg-secondary, #fff5ee);
      border-radius: 0.5rem;
    }

    .member-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .member-avatar-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--color-border, #ede4dd);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      color: var(--color-text-secondary, #7a6e6a);
    }

    .member-info {
      flex: 1;
    }

    .member-name {
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .creator-badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      background: #fef3c7;
      color: #92400e;
      border-radius: 9999px;
    }

    .member-email {
      font-size: 0.875rem;
      color: var(--color-text-secondary, #7a6e6a);
    }

    .member-role {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .member-role.admin {
      background: #dbeafe;
      color: #1e40af;
    }

    .member-role.member {
      background: var(--color-bg-tertiary, #ffede3);
      color: #475569;
    }

    .member-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--color-border, #ede4dd);
      border-radius: 0.375rem;
      background: var(--color-bg, #fffbf8);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .action-btn:hover {
      background: var(--color-bg-secondary, #fff5ee);
    }

    .action-btn.danger:hover {
      background: #fef2f2;
      border-color: #fecaca;
      color: var(--color-danger, #d96b6b);
    }

    .invite-section {
      margin-top: 2rem;
      padding: 1.5rem;
      background: var(--color-bg-secondary, #fff5ee);
      border-radius: 0.5rem;
    }

    .invite-section h3 {
      margin-bottom: 1rem;
      font-size: 1rem;
    }

    .invite-code {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .code-display {
      font-family: monospace;
      font-size: 1.5rem;
      letter-spacing: 0.25rem;
      padding: 0.75rem 1.5rem;
      background: var(--color-bg, #fffbf8);
      border: 2px dashed var(--color-border-dark, #ddd1c9);
      border-radius: 0.5rem;
    }

    .copy-btn {
      padding: 0.5rem 1rem;
      background: var(--color-primary, #e07b5c);
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .copy-btn:hover {
      background: var(--color-primary-dark, #c9624a);
    }

    .generate-btn {
      padding: 0.5rem 1rem;
      background: var(--color-bg, #fffbf8);
      border: 1px solid var(--color-border, #ede4dd);
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .generate-btn:hover {
      background: var(--color-bg-secondary, #fff5ee);
    }

    .error-message {
      padding: 1rem;
      background: #fef2f2;
      color: var(--color-danger, #d96b6b);
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .loading {
      padding: 2rem;
      text-align: center;
      color: var(--color-text-secondary, #7a6e6a);
    }
  `;

  constructor() {
    super();
    this._componentId = `member-manager-${Math.random().toString(36).substr(2, 9)}`;
    this.members = [];
    this.isCurrentUserAdmin = false;
    this.inviteCode = '';
    this.loading = true;
    this.error = '';

    // Bind handlers
    this._handleGroupChanged = this._handleGroupChanged.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    // Escuchar cambios de grupo
    eventBus.on('group:changed', this._handleGroupChanged);
    window.addEventListener('group-changed', () => this._loadData());

    // Cargar miembros
    this._loadData();

    // Registrar componente
    eventBus.registerComponent(this._componentId);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    eventBus.off('group:changed', this._handleGroupChanged);
    eventBus.unregisterComponent(this._componentId);
  }

  _handleGroupChanged(payload) {
    this.groupId = payload.groupId;
    this._loadData();
  }

  async _loadData() {
    const hId = this.groupId || getCurrentGroupId();
    if (!hId) {
      this.loading = false;
      this.members = [];
      return;
    }

    this.loading = true;
    try {
      this.members = await getGroupMembers(hId);
      this.isCurrentUserAdmin = await isAdmin(hId);
    } catch (error) {
      console.error('Error loading members:', error);
      this.error = error.message;
    }
    this.loading = false;
  }

  async _generateInvite() {
    const hId = this.groupId || getCurrentGroupId();
    try {
      this.inviteCode = await generateGroupInvite(hId);
    } catch (error) {
      this.error = error.message;
    }
  }

  async _copyInviteCode() {
    try {
      await navigator.clipboard.writeText(this.inviteCode);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  }

  async _removeMember(userId) {
    if (!confirm('¿Estás seguro de que quieres eliminar a este miembro?')) return;

    const hId = this.groupId || getCurrentGroupId();
    try {
      await removeMember(hId, userId);
      await this._loadData();
    } catch (error) {
      this.error = error.message;
    }
  }

  async _toggleRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const hId = this.groupId || getCurrentGroupId();

    try {
      await updateMemberRole(hId, userId, newRole);
      await this._loadData();
    } catch (error) {
      this.error = error.message;
    }
  }

  _getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Cargando miembros...</div>`;
    }

    const hId = this.groupId || getCurrentGroupId();
    if (!hId) {
      return html`
        <div class="empty-state" style="text-align: center; padding: 2rem; color: var(--color-text-secondary, #7a6e6a);">
          <p>No tienes un grupo configurado.</p>
          <p style="margin-top: 0.5rem;">Crea o únete a un grupo para ver los miembros.</p>
        </div>
      `;
    }

    if (this.members.length === 0 && !this.error) {
      return html`
        <div class="empty-state" style="text-align: center; padding: 2rem; color: var(--color-text-secondary, #7a6e6a);">
          <p>No hay miembros en este grupo.</p>
        </div>
      `;
    }

    const currentUser = getCurrentUser();

    return html`
      ${this.error ? html`
        <div class="error-message">${this.error}</div>
      ` : ''}

      <div class="member-list">
        ${this.members.map(member => html`
          <div class="member-item">
            ${member.photoURL
              ? html`<img class="member-avatar" src=${member.photoURL} alt="" />`
              : html`<div class="member-avatar-placeholder">${this._getInitials(member.displayName)}</div>`
            }

            <div class="member-info">
              <div class="member-name">
                ${member.displayName || member.email}
                ${member.isCreator ? html`<span class="creator-badge">Creador</span>` : ''}
              </div>
              <div class="member-email">${member.email}</div>
            </div>

            <span class="member-role ${member.role}">${member.role}</span>

            ${this.isCurrentUserAdmin && member.id !== currentUser?.uid && !member.isCreator ? html`
              <div class="member-actions">
                <button
                  class="action-btn"
                  @click=${() => this._toggleRole(member.id, member.role)}
                >
                  ${member.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                </button>
                <button
                  class="action-btn danger"
                  @click=${() => this._removeMember(member.id)}
                >
                  Eliminar
                </button>
              </div>
            ` : ''}
          </div>
        `)}
      </div>

      ${this.isCurrentUserAdmin ? html`
        <div class="invite-section">
          <h3>Invitar miembros</h3>

          ${this.inviteCode ? html`
            <div class="invite-code">
              <span class="code-display">${this.inviteCode}</span>
              <button class="copy-btn" @click=${this._copyInviteCode}>
                📋 Copiar
              </button>
            </div>
            <p style="font-size: 0.875rem; color: var(--color-text-secondary, #7a6e6a);">
              Este código expira en 48 horas.
            </p>
          ` : html`
            <button class="generate-btn" @click=${this._generateInvite}>
              🔗 Generar código de invitación
            </button>
          `}
        </div>
      ` : ''}
    `;
  }
}

if (!customElements.get('hc-group-manager')) {
  customElements.define('hc-group-manager', HcMemberManager);
}

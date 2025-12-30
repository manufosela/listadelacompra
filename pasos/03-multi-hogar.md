# Fase 3: Sistema Multi-Hogar

## Objetivo

Implementar el sistema de "casas" (households) que permite a múltiples usuarios compartir listas de la compra, con roles de admin y member, e invitaciones por código.

---

## Paso 3.1: Household Service

### Crear `public/js/household.js`

```javascript
/**
 * Household Service
 * Gestiona casas/hogares, miembros, invitaciones y permisos.
 */

import { db } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

/**
 * Genera un código de invitación aleatorio
 * @returns {string} Código de 6 caracteres
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin caracteres confusos
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Crea un nuevo hogar
 * @param {string} name - Nombre del hogar
 * @returns {Promise<Object>} Hogar creado
 */
export async function createHousehold(name) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const householdRef = doc(collection(db, 'households'));
  const householdId = householdRef.id;

  const householdData = {
    name,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    members: {
      [user.uid]: {
        role: 'admin',
        joinedAt: serverTimestamp(),
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      }
    },
    inviteCodes: {}
  };

  // Crear hogar y actualizar usuario en una transacción batch
  const batch = writeBatch(db);
  
  batch.set(householdRef, householdData);
  
  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    householdIds: arrayUnion(householdId)
  });

  await batch.commit();

  // Guardar como hogar activo
  setCurrentHousehold(householdId);

  return { id: householdId, ...householdData };
}

/**
 * Obtiene los hogares del usuario actual
 * @returns {Promise<Array>} Lista de hogares
 */
export async function getUserHouseholds() {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) return [];

  const householdIds = userDoc.data().householdIds || [];
  if (householdIds.length === 0) return [];

  const households = await Promise.all(
    householdIds.map(async (id) => {
      const householdDoc = await getDoc(doc(db, 'households', id));
      if (householdDoc.exists()) {
        return { id: householdDoc.id, ...householdDoc.data() };
      }
      return null;
    })
  );

  return households.filter(Boolean);
}

/**
 * Obtiene un hogar por ID
 * @param {string} householdId - ID del hogar
 * @returns {Promise<Object|null>} Hogar o null
 */
export async function getHousehold(householdId) {
  const householdDoc = await getDoc(doc(db, 'households', householdId));
  if (householdDoc.exists()) {
    return { id: householdDoc.id, ...householdDoc.data() };
  }
  return null;
}

/**
 * Obtiene el hogar actual del localStorage
 * @returns {string|null} ID del hogar actual
 */
export function getCurrentHouseholdId() {
  return localStorage.getItem('hc_current_household');
}

/**
 * Establece el hogar actual
 * @param {string} householdId - ID del hogar
 */
export function setCurrentHousehold(householdId) {
  localStorage.setItem('hc_current_household', householdId);
  window.dispatchEvent(new CustomEvent('household-changed', { 
    detail: { householdId } 
  }));
}

/**
 * Genera un código de invitación para el hogar
 * @param {string} householdId - ID del hogar
 * @param {number} expiresInHours - Horas hasta expiración (default 48)
 * @returns {Promise<string>} Código de invitación
 */
export async function generateHouseholdInvite(householdId, expiresInHours = 48) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  // Verificar que es admin
  const household = await getHousehold(householdId);
  if (!household || household.members[user.uid]?.role !== 'admin') {
    throw new Error('Only admins can generate invite codes');
  }

  const code = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const householdRef = doc(db, 'households', householdId);
  await updateDoc(householdRef, {
    [`inviteCodes.${code}`]: {
      createdAt: serverTimestamp(),
      expiresAt: expiresAt,
      createdBy: user.uid
    }
  });

  return code;
}

/**
 * Une al usuario actual a un hogar usando código de invitación
 * @param {string} code - Código de invitación
 * @returns {Promise<Object>} Hogar al que se unió
 */
export async function joinHouseholdWithCode(code) {
  const user = getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  const normalizedCode = code.toUpperCase().trim();

  // Buscar hogar con este código
  const householdsRef = collection(db, 'households');
  const snapshot = await getDocs(householdsRef);
  
  let targetHousehold = null;
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const inviteData = data.inviteCodes?.[normalizedCode];
    
    if (inviteData) {
      // Verificar que no ha expirado
      const expiresAt = inviteData.expiresAt?.toDate?.() || new Date(inviteData.expiresAt);
      if (expiresAt > new Date()) {
        targetHousehold = { id: docSnap.id, ...data };
        break;
      }
    }
  }

  if (!targetHousehold) {
    throw new Error('Invalid or expired invite code');
  }

  // Verificar que no es ya miembro
  if (targetHousehold.members[user.uid]) {
    throw new Error('Already a member of this household');
  }

  // Añadir como miembro
  const batch = writeBatch(db);
  
  const householdRef = doc(db, 'households', targetHousehold.id);
  batch.update(householdRef, {
    [`members.${user.uid}`]: {
      role: 'member',
      joinedAt: serverTimestamp(),
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL
    }
  });

  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    householdIds: arrayUnion(targetHousehold.id)
  });

  await batch.commit();

  // Establecer como hogar activo
  setCurrentHousehold(targetHousehold.id);

  return targetHousehold;
}

/**
 * Añade un miembro por email (solo admins)
 * @param {string} householdId - ID del hogar
 * @param {string} email - Email del usuario a añadir
 * @param {string} role - Rol ('admin' o 'member')
 */
export async function addMemberByEmail(householdId, email, role = 'member') {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('No authenticated user');

  // Verificar permisos de admin
  if (!(await isAdmin(householdId))) {
    throw new Error('Only admins can add members');
  }

  // Buscar usuario por email
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email.toLowerCase()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('No user found with that email');
  }

  const targetUser = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

  // Verificar que no es ya miembro
  const household = await getHousehold(householdId);
  if (household.members[targetUser.id]) {
    throw new Error('User is already a member');
  }

  // Añadir miembro
  const batch = writeBatch(db);
  
  const householdRef = doc(db, 'households', householdId);
  batch.update(householdRef, {
    [`members.${targetUser.id}`]: {
      role,
      joinedAt: serverTimestamp(),
      displayName: targetUser.displayName,
      email: targetUser.email,
      photoURL: targetUser.photoURL
    }
  });

  const userRef = doc(db, 'users', targetUser.id);
  batch.update(userRef, {
    householdIds: arrayUnion(householdId)
  });

  await batch.commit();
}

/**
 * Elimina un miembro del hogar
 * @param {string} householdId - ID del hogar
 * @param {string} userId - ID del usuario a eliminar
 */
export async function removeMember(householdId, userId) {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('No authenticated user');

  const household = await getHousehold(householdId);
  
  // Solo admins pueden eliminar, o el usuario puede eliminarse a sí mismo
  const isCurrentUserAdmin = household.members[currentUser.uid]?.role === 'admin';
  const isRemovingSelf = userId === currentUser.uid;
  
  if (!isCurrentUserAdmin && !isRemovingSelf) {
    throw new Error('Only admins can remove members');
  }

  // No se puede eliminar al creador del hogar
  if (userId === household.createdBy && !isRemovingSelf) {
    throw new Error('Cannot remove the household creator');
  }

  // Eliminar miembro
  const batch = writeBatch(db);
  
  const householdRef = doc(db, 'households', householdId);
  
  // Crear nuevo objeto members sin el usuario
  const newMembers = { ...household.members };
  delete newMembers[userId];
  
  batch.update(householdRef, { members: newMembers });

  const userRef = doc(db, 'users', userId);
  batch.update(userRef, {
    householdIds: arrayRemove(householdId)
  });

  await batch.commit();

  // Si el usuario se eliminó a sí mismo, limpiar hogar actual
  if (isRemovingSelf && getCurrentHouseholdId() === householdId) {
    localStorage.removeItem('hc_current_household');
  }
}

/**
 * Actualiza el rol de un miembro
 * @param {string} householdId - ID del hogar
 * @param {string} userId - ID del usuario
 * @param {string} newRole - Nuevo rol ('admin' o 'member')
 */
export async function updateMemberRole(householdId, userId, newRole) {
  if (!(await isAdmin(householdId))) {
    throw new Error('Only admins can change roles');
  }

  const household = await getHousehold(householdId);
  
  // No se puede cambiar rol del creador
  if (userId === household.createdBy) {
    throw new Error('Cannot change the role of the household creator');
  }

  const householdRef = doc(db, 'households', householdId);
  await updateDoc(householdRef, {
    [`members.${userId}.role`]: newRole
  });
}

/**
 * Verifica si el usuario actual es admin del hogar
 * @param {string} householdId - ID del hogar
 * @returns {Promise<boolean>}
 */
export async function isAdmin(householdId) {
  const user = getCurrentUser();
  if (!user) return false;

  const household = await getHousehold(householdId);
  return household?.members[user.uid]?.role === 'admin';
}

/**
 * Verifica si el usuario actual es miembro del hogar
 * @param {string} householdId - ID del hogar
 * @returns {Promise<boolean>}
 */
export async function isMember(householdId) {
  const user = getCurrentUser();
  if (!user) return false;

  const household = await getHousehold(householdId);
  return !!household?.members[user.uid];
}

/**
 * Obtiene los miembros de un hogar formateados
 * @param {string} householdId - ID del hogar
 * @returns {Promise<Array>} Lista de miembros
 */
export async function getHouseholdMembers(householdId) {
  const household = await getHousehold(householdId);
  if (!household) return [];

  return Object.entries(household.members).map(([id, data]) => ({
    id,
    ...data,
    isCreator: id === household.createdBy
  }));
}
```

---

## Paso 3.2: Componente Household Selector

### Crear `public/components/hc-household-selector.js`

```javascript
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/nickg/lit@3.1.0/lit-all.min.js';
import { eventBus } from '/js/event-bus.js';
import { 
  getUserHouseholds, 
  getCurrentHouseholdId, 
  setCurrentHousehold,
  getHousehold 
} from '/js/household.js';

export class HcHouseholdSelector extends LitElement {
  static properties = {
    households: { type: Array, state: true },
    currentHousehold: { type: Object, state: true },
    open: { type: Boolean, state: true },
    loading: { type: Boolean, state: true }
  };

  constructor() {
    super();
    this._componentId = `household-selector-${Math.random().toString(36).substr(2, 9)}`;
    this.households = [];
    this.currentHousehold = null;
    this.open = false;
    this.loading = true;
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadHouseholds();
    
    // Cerrar dropdown al hacer clic fuera
    this._handleClickOutside = (e) => {
      if (this.open && !this.contains(e.target)) {
        this.open = false;
      }
    };
    document.addEventListener('click', this._handleClickOutside);
    
    // Registrar componente
    eventBus.registerComponent(this._componentId);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleClickOutside);
    eventBus.unregisterComponent(this._componentId);
  }

  async _selectHousehold(household) {
    setCurrentHousehold(household.id);
    this.currentHousehold = household;
    this.open = false;
    
    // Notificar cambio via Event Bus
    eventBus.emit('household:changed', {
      senderId: this._componentId,
      householdId: household.id,
      household: household
    });
  }

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
    
    .house-icon {
      font-size: 1.25rem;
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
    
    .household-list {
      max-height: 200px;
      overflow-y: auto;
    }
    
    .household-item {
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
    
    .household-item:hover {
      background: #f8fafc;
    }
    
    .household-item.active {
      background: #eff6ff;
    }
    
    .household-name {
      flex: 1;
      font-weight: 500;
    }
    
    .household-role {
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
  `;

  constructor() {
    super();
    this.households = [];
    this.currentHousehold = null;
    this.open = false;
    this.loading = true;
  }

  async connectedCallback() {
    super.connectedCallback();
    await this._loadHouseholds();
    
    this._handleClickOutside = (e) => {
      if (this.open && !this.contains(e.target)) {
        this.open = false;
      }
    };
    document.addEventListener('click', this._handleClickOutside);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleClickOutside);
  }

  async _loadHouseholds() {
    this.loading = true;
    try {
      this.households = await getUserHouseholds();
      
      // Cargar hogar actual
      const currentId = getCurrentHouseholdId();
      if (currentId) {
        this.currentHousehold = await getHousehold(currentId);
      } else if (this.households.length > 0) {
        // Si no hay hogar seleccionado, usar el primero
        this.currentHousehold = this.households[0];
        setCurrentHousehold(this.households[0].id);
      }
    } catch (error) {
      console.error('Error loading households:', error);
    }
    this.loading = false;
  }

  _toggleDropdown(e) {
    e.stopPropagation();
    this.open = !this.open;
  }

  _selectHousehold(household) {
    this.currentHousehold = household;
    setCurrentHousehold(household.id);
    this.open = false;
  }

  _openCreateModal() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('create-household', {
      bubbles: true,
      composed: true
    }));
  }

  _openJoinModal() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('join-household', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">...</div>`;
    }

    return html`
      <button class="selector-button" @click=${this._toggleDropdown}>
        <span class="house-icon">🏠</span>
        <span>${this.currentHousehold?.name || 'Seleccionar casa'}</span>
        <span class="chevron ${this.open ? 'open' : ''}">▼</span>
      </button>
      
      <div class="dropdown ${this.open ? 'open' : ''}">
        ${this.households.length > 0 ? html`
          <div class="dropdown-header">Mis casas</div>
          <div class="household-list">
            ${this.households.map(h => html`
              <button 
                class="household-item ${this.currentHousehold?.id === h.id ? 'active' : ''}"
                @click=${() => this._selectHousehold(h)}
              >
                <span class="household-name">${h.name}</span>
                <span class="household-role">
                  ${h.members[window.auth?.currentUser?.uid]?.role || 'member'}
                </span>
                ${this.currentHousehold?.id === h.id ? html`
                  <span class="check-icon">✓</span>
                ` : ''}
              </button>
            `)}
          </div>
        ` : html`
          <div class="empty-state">
            <p>No perteneces a ninguna casa todavía.</p>
          </div>
        `}
        
        <div class="dropdown-footer">
          <button class="create-button" @click=${this._openCreateModal}>
            ➕ Crear nueva casa
          </button>
          <button class="create-button" @click=${this._openJoinModal}>
            🔗 Unirse con código
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('hc-household-selector', HcHouseholdSelector);
```

---

## Paso 3.3: Componente Member Manager

### Crear `public/components/hc-member-manager.js`

```javascript
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/nickg/lit@3.1.0/lit-all.min.js';
import { eventBus } from '/js/event-bus.js';
import {
  getHouseholdMembers,
  removeMember,
  updateMemberRole,
  generateHouseholdInvite,
  isAdmin,
  getCurrentHouseholdId
} from '/js/household.js';
import { getCurrentUser } from '/js/auth.js';

export class HcMemberManager extends LitElement {
  static properties = {
    householdId: { type: String, attribute: 'household-id' },
    members: { type: Array, state: true },
    isCurrentUserAdmin: { type: Boolean, state: true },
    inviteCode: { type: String, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true }
  };

  constructor() {
    super();
    this._componentId = `member-manager-${Math.random().toString(36).substr(2, 9)}`;
    this.members = [];
    this.isCurrentUserAdmin = false;
    this.inviteCode = null;
    this.loading = true;
    this.error = null;
    
    // Bind handlers
    this._handleHouseholdChanged = this._handleHouseholdChanged.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Escuchar cambios de hogar
    eventBus.on('household:changed', this._handleHouseholdChanged);
    
    // Cargar miembros
    this._loadMembers();
    
    // Registrar componente
    eventBus.registerComponent(this._componentId);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    eventBus.off('household:changed', this._handleHouseholdChanged);
    eventBus.unregisterComponent(this._componentId);
  }

  _handleHouseholdChanged(payload) {
    this.householdId = payload.householdId;
    this._loadMembers();
  }

  // Notificar cuando cambian los miembros
  _notifyMembersChanged() {
    eventBus.emit('members:changed', {
      senderId: this._componentId,
      householdId: this.householdId,
      members: this.members
    });
  }

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
      background: #f8fafc;
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
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      color: #64748b;
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
      color: #64748b;
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
      background: #f1f5f9;
      color: #475569;
    }
    
    .member-actions {
      display: flex;
      gap: 0.5rem;
    }
    
    .action-btn {
      padding: 0.375rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      background: white;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .action-btn:hover {
      background: #f8fafc;
    }
    
    .action-btn.danger:hover {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
    }
    
    .invite-section {
      margin-top: 2rem;
      padding: 1.5rem;
      background: #f8fafc;
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
      background: white;
      border: 2px dashed #cbd5e1;
      border-radius: 0.5rem;
    }
    
    .copy-btn {
      padding: 0.5rem 1rem;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
    }
    
    .copy-btn:hover {
      background: #1d4ed8;
    }
    
    .generate-btn {
      padding: 0.5rem 1rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
    }
    
    .generate-btn:hover {
      background: #f8fafc;
    }
    
    .error-message {
      padding: 1rem;
      background: #fef2f2;
      color: #dc2626;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }
  `;

  constructor() {
    super();
    this.members = [];
    this.isCurrentUserAdmin = false;
    this.inviteCode = '';
    this.loading = true;
    this.error = '';
  }

  async connectedCallback() {
    super.connectedCallback();
    await this._loadData();
    
    // Escuchar cambios de hogar
    window.addEventListener('household-changed', () => this._loadData());
  }

  async _loadData() {
    const hId = this.householdId || getCurrentHouseholdId();
    if (!hId) return;

    this.loading = true;
    try {
      this.members = await getHouseholdMembers(hId);
      this.isCurrentUserAdmin = await isAdmin(hId);
    } catch (error) {
      console.error('Error loading members:', error);
      this.error = error.message;
    }
    this.loading = false;
  }

  async _generateInvite() {
    const hId = this.householdId || getCurrentHouseholdId();
    try {
      this.inviteCode = await generateHouseholdInvite(hId);
    } catch (error) {
      this.error = error.message;
    }
  }

  async _copyInviteCode() {
    try {
      await navigator.clipboard.writeText(this.inviteCode);
      // Podríamos mostrar un toast aquí
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  }

  async _removeMember(userId) {
    if (!confirm('¿Estás seguro de que quieres eliminar a este miembro?')) return;
    
    const hId = this.householdId || getCurrentHouseholdId();
    try {
      await removeMember(hId, userId);
      await this._loadData();
    } catch (error) {
      this.error = error.message;
    }
  }

  async _toggleRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const hId = this.householdId || getCurrentHouseholdId();
    
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
      return html`<div>Cargando miembros...</div>`;
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
            <p style="font-size: 0.875rem; color: #64748b;">
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

customElements.define('hc-member-manager', HcMemberManager);
```

---

## Paso 3.4: Página de Configuración del Hogar

### Crear `src/pages/app/settings/household.astro`

```astro
---
import AppLayout from '../../../layouts/AppLayout.astro';
---

<AppLayout title="Gestionar Casa">
  <div class="settings-page">
    <header class="page-header">
      <h1>Gestionar Casa</h1>
      <p>Administra los miembros y configuración de tu hogar.</p>
    </header>
    
    <section class="settings-section">
      <h2>Información del hogar</h2>
      <div id="household-info" class="info-card">
        <p>Cargando...</p>
      </div>
    </section>
    
    <section class="settings-section">
      <h2>Miembros</h2>
      <hc-member-manager></hc-member-manager>
    </section>
  </div>
  
  <!-- Modal para crear casa -->
  <dialog id="create-household-modal" class="modal">
    <form method="dialog" class="modal-content">
      <h2>Crear nueva casa</h2>
      <div class="form-group">
        <label for="household-name">Nombre de la casa</label>
        <input type="text" id="household-name" placeholder="Ej: Casa de Madrid" required />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="cancel-create">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="confirm-create">Crear</button>
      </div>
    </form>
  </dialog>
  
  <!-- Modal para unirse con código -->
  <dialog id="join-household-modal" class="modal">
    <form method="dialog" class="modal-content">
      <h2>Unirse a una casa</h2>
      <div class="form-group">
        <label for="invite-code">Código de invitación</label>
        <input type="text" id="invite-code" placeholder="XXXXXX" maxlength="6" required />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="cancel-join">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="confirm-join">Unirse</button>
      </div>
    </form>
  </dialog>
</AppLayout>

<script type="module">
  import '/components/hc-member-manager.js';
  import { 
    getHousehold, 
    getCurrentHouseholdId, 
    createHousehold,
    joinHouseholdWithCode 
  } from '/js/household.js';
  
  // Cargar info del hogar
  window.addEventListener('auth-ready', async () => {
    const householdId = getCurrentHouseholdId();
    const infoContainer = document.getElementById('household-info');
    
    if (householdId) {
      const household = await getHousehold(householdId);
      if (household) {
        infoContainer.innerHTML = `
          <div class="info-row">
            <span class="info-label">Nombre:</span>
            <span class="info-value">${household.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Miembros:</span>
            <span class="info-value">${Object.keys(household.members).length}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Creada:</span>
            <span class="info-value">${household.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</span>
          </div>
        `;
      }
    } else {
      infoContainer.innerHTML = `
        <p>No tienes una casa seleccionada.</p>
        <button class="btn btn-primary" id="create-first-household">Crear mi primera casa</button>
      `;
    }
  });
  
  // Manejar modales
  const createModal = document.getElementById('create-household-modal');
  const joinModal = document.getElementById('join-household-modal');
  
  document.addEventListener('create-household', () => createModal.showModal());
  document.addEventListener('join-household', () => joinModal.showModal());
  
  document.getElementById('cancel-create')?.addEventListener('click', () => createModal.close());
  document.getElementById('cancel-join')?.addEventListener('click', () => joinModal.close());
  
  // Crear casa
  createModal.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('household-name').value;
    
    try {
      await createHousehold(name);
      window.location.reload();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });
  
  // Unirse con código
  joinModal.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('invite-code').value;
    
    try {
      await joinHouseholdWithCode(code);
      window.location.reload();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });
</script>

<style>
  .settings-page {
    max-width: 800px;
  }
  
  .page-header {
    margin-bottom: var(--space-xl);
  }
  
  .page-header h1 {
    margin-bottom: var(--space-xs);
  }
  
  .page-header p {
    color: var(--color-text-secondary);
  }
  
  .settings-section {
    margin-bottom: var(--space-xl);
  }
  
  .settings-section h2 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-md);
  }
  
  .info-card {
    padding: var(--space-lg);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
  }
  
  .info-row {
    display: flex;
    gap: var(--space-md);
    padding: var(--space-sm) 0;
  }
  
  .info-row:not(:last-child) {
    border-bottom: 1px solid var(--color-border);
  }
  
  .info-label {
    font-weight: 500;
    min-width: 100px;
  }
  
  .info-value {
    color: var(--color-text-secondary);
  }
  
  .modal {
    border: none;
    border-radius: var(--radius-lg);
    padding: 0;
    max-width: 400px;
    width: 90%;
  }
  
  .modal::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
  
  .modal-content {
    padding: var(--space-xl);
  }
  
  .modal-content h2 {
    margin-bottom: var(--space-lg);
  }
  
  .form-group {
    margin-bottom: var(--space-lg);
  }
  
  .form-group label {
    display: block;
    margin-bottom: var(--space-xs);
    font-weight: 500;
  }
  
  .form-group input {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
  }
  
  .modal-actions {
    display: flex;
    gap: var(--space-sm);
    justify-content: flex-end;
  }
</style>
```

---

## Paso 3.5: Commit de la fase

```bash
git add .
git commit -m "feat(household): implement multi-household system

- Add household service with CRUD operations
- Implement invite code generation and joining
- Create member management with role updates
- Add hc-household-selector component
- Add hc-member-manager component
- Create household settings page with modals
- Support admin/member roles and permissions"
```

---

## ✅ Checklist de la Fase 3

- [ ] Household service implementado
- [ ] Crear/obtener/actualizar hogares
- [ ] Generar códigos de invitación
- [ ] Unirse con código
- [ ] Gestión de miembros (añadir/eliminar/cambiar rol)
- [ ] Componente hc-household-selector
- [ ] Componente hc-member-manager
- [ ] Página de configuración del hogar
- [ ] Modales para crear/unirse a casas
- [ ] Persistencia del hogar actual en localStorage

---

## 🔗 Siguiente Fase

→ [04-listas-compra.md](./04-listas-compra.md)

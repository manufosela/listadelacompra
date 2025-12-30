# Fase 2: Autenticación y Sistema de Usuarios

## Objetivo

Implementar autenticación con Google y Email/Password usando Firebase Auth, crear perfiles de usuario en Firestore, y proteger rutas de la aplicación.

---

## Paso 2.1: Firebase Config

> **NOTA**: El fichero `public/js/firebase-config.js` se genera automáticamente desde `.env` usando el script `pnpm run generate:config`. Ver Fase 1 para detalles.

El fichero generado incluye las instancias de Firebase necesarias:

```javascript
// AUTO-GENERATED - Ver scripts/generate-firebase-config.js
export const auth;      // Firebase Auth
export const db;        // Firestore
export const storage;   // Storage
export const functions; // Cloud Functions
```

---

## Paso 2.2: Auth Service

### Crear `public/js/auth.js`

```javascript
/**
 * Authentication Service
 * Maneja login con Google, Email/Password, logout y gestión de estado.
 */

import { auth, db } from './firebase-config.js';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

const googleProvider = new GoogleAuthProvider();

// Añadir scopes adicionales si necesario
googleProvider.addScope('email');
googleProvider.addScope('profile');

/**
 * Inicia sesión con Google
 * @returns {Promise<User>} Usuario autenticado
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Crear o actualizar perfil de usuario
    await createOrUpdateUserProfile(user);
    
    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Inicia sesión con email y contraseña
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña
 * @returns {Promise<User>} Usuario autenticado
 */
export async function signInWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    // Actualizar perfil de usuario
    await createOrUpdateUserProfile(user);
    
    return user;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
}

/**
 * Registra un nuevo usuario con email y contraseña
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña
 * @param {string} displayName - Nombre a mostrar
 * @returns {Promise<User>} Usuario creado
 */
export async function signUpWithEmail(email, password, displayName) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    // Actualizar displayName en Auth
    await updateProfile(user, { displayName });
    
    // Crear perfil de usuario en Firestore
    await createOrUpdateUserProfile(user);
    
    return user;
  } catch (error) {
    console.error('Error signing up with email:', error);
    throw error;
  }
}

/**
 * Cierra sesión
 */
export async function signOut() {
  try {
    // Limpiar estado local
    localStorage.removeItem('hc_current_household');
    
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Obtiene el usuario actual
 * @returns {User|null} Usuario actual o null
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Observable del estado de autenticación
 * @param {Function} callback - Función a ejecutar cuando cambia el estado
 * @returns {Function} Función para cancelar la suscripción
 */
export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Crea o actualiza el perfil del usuario en Firestore
 * @param {User} user - Usuario de Firebase Auth
 */
async function createOrUpdateUserProfile(user) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // Crear nuevo perfil
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      householdIds: []
    });
    console.log('✅ User profile created');
  } else {
    // Actualizar datos que pueden haber cambiado
    await updateDoc(userRef, {
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: serverTimestamp()
    });
  }
}

/**
 * Obtiene el perfil del usuario desde Firestore
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object|null>} Perfil del usuario o null
 */
export async function getUserProfile(userId) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() };
  }
  
  return null;
}

/**
 * Espera a que se resuelva el estado de autenticación
 * @returns {Promise<User|null>} Usuario autenticado o null
 */
export function waitForAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean}
 */
export function isAuthenticated() {
  return auth.currentUser !== null;
}
```

---

## Paso 2.3: Página de Login

### Crear `src/pages/login.astro`

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Iniciar Sesión">
  <main class="login-page">
    <div class="login-card">
      <div class="login-header">
        <img src="/assets/logo.svg" alt="HomeCart" class="logo" />
        <h1>Bienvenido a HomeCart</h1>
        <p>Gestiona tus listas de la compra en familia</p>
      </div>
      
      <div class="login-body">
        <!-- Login con Google -->
        <button id="google-signin-btn" data-testid="google-signin-btn" class="btn btn-google">
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <div class="divider">
          <span>o</span>
        </div>

        <!-- Toggle para mostrar formulario email -->
        <button id="email-toggle" data-testid="email-login-toggle" class="btn btn-secondary">
          Iniciar sesión con email
        </button>

        <!-- Formulario Email/Password (oculto por defecto) -->
        <form id="email-form" class="email-form" hidden>
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              data-testid="email-input"
              placeholder="tu@email.com" 
              required 
            />
          </div>
          
          <div class="form-group">
            <label for="password">Contraseña</label>
            <input 
              type="password" 
              id="password" 
              data-testid="password-input"
              placeholder="Tu contraseña" 
              required 
              minlength="6"
            />
          </div>

          <button type="submit" data-testid="login-submit" class="btn btn-primary">
            Iniciar sesión
          </button>

          <p class="register-link">
            ¿No tienes cuenta? <a href="/register">Regístrate</a>
          </p>
        </form>
        
        <div id="error-message" data-testid="login-error" class="error-message" hidden></div>
      </div>
      
      <div class="login-footer">
        <p>Al continuar, aceptas nuestros <a href="/terms">Términos de Servicio</a> y <a href="/privacy">Política de Privacidad</a>.</p>
      </div>
    </div>
  </main>
</BaseLayout>

<script type="module">
  import { signInWithGoogle, signInWithEmail, onAuthStateChanged } from '/js/auth.js';
  
  const googleBtn = document.getElementById('google-signin-btn');
  const emailToggle = document.getElementById('email-toggle');
  const emailForm = document.getElementById('email-form');
  const errorMessage = document.getElementById('error-message');
  
  // Verificar si ya está autenticado
  onAuthStateChanged((user) => {
    if (user) {
      window.location.href = '/app';
    }
  });

  // Toggle formulario email
  emailToggle.addEventListener('click', () => {
    emailForm.hidden = !emailForm.hidden;
    emailToggle.textContent = emailForm.hidden 
      ? 'Iniciar sesión con email' 
      : 'Ocultar formulario';
  });
  
  // Login con Google
  googleBtn.addEventListener('click', async () => {
    googleBtn.disabled = true;
    googleBtn.textContent = 'Conectando...';
    errorMessage.hidden = true;
    
    try {
      await signInWithGoogle();
    } catch (error) {
      showError(error);
      googleBtn.disabled = false;
      googleBtn.innerHTML = `<svg class="google-icon" viewBox="0 0 24 24">...</svg> Continuar con Google`;
    }
  });

  // Login con Email
  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = emailForm.querySelector('[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Iniciando sesión...';
    errorMessage.hidden = true;
    
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      showError(error);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Iniciar sesión';
    }
  });

  function showError(error) {
    let message = 'Error al iniciar sesión. Inténtalo de nuevo.';
    
    const errorMessages = {
      'auth/popup-closed-by-user': 'Has cerrado la ventana de login.',
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
      'auth/user-not-found': 'No existe una cuenta con este email.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-email': 'Email no válido.',
      'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
      'auth/invalid-credential': 'Credenciales inválidas.'
    };
    
    message = errorMessages[error.code] || message;
    
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }
</script>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
    background: var(--color-bg-secondary);
  }
  
  .login-card {
    background: var(--color-bg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    padding: var(--space-xl);
    width: 100%;
    max-width: 400px;
    text-align: center;
  }
  
  .login-header .logo {
    width: 64px;
    height: 64px;
    margin-bottom: var(--space-md);
  }
  
  .login-header h1 {
    font-size: var(--font-size-xl);
    margin-bottom: var(--space-xs);
  }
  
  .login-header p {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-xl);
  }
  
  .btn-google {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    width: 100%;
    padding: var(--space-md) var(--space-lg);
    background: white;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .btn-google:hover {
    background: var(--color-bg-secondary);
    box-shadow: var(--shadow-sm);
  }
  
  .btn-google:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .google-icon {
    width: 20px;
    height: 20px;
  }

  .divider {
    display: flex;
    align-items: center;
    margin: var(--space-lg) 0;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--color-border);
  }

  .divider span {
    padding: 0 var(--space-md);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .email-form {
    margin-top: var(--space-lg);
    text-align: left;
  }

  .form-group {
    margin-bottom: var(--space-md);
  }

  .form-group label {
    display: block;
    margin-bottom: var(--space-xs);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .form-group input {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .email-form .btn-primary {
    width: 100%;
    margin-top: var(--space-md);
  }

  .register-link {
    margin-top: var(--space-md);
    text-align: center;
    font-size: var(--font-size-sm);
  }

  .register-link a {
    color: var(--color-primary);
    text-decoration: none;
  }

  .register-link a:hover {
    text-decoration: underline;
  }
  
  .error-message {
    margin-top: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-danger);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }
  
  .login-footer {
    margin-top: var(--space-xl);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--color-border);
  }
  
  .login-footer p {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
  
  .login-footer a {
    color: var(--color-primary);
    text-decoration: none;
  }
  
  .login-footer a:hover {
    text-decoration: underline;
  }
</style>
```

---

## Paso 2.4: Auth Guard Component

### Crear `src/components/AuthGuard.astro`

```astro
---
/**
 * AuthGuard Component
 * Protege páginas que requieren autenticación.
 * Muestra un loader mientras verifica y redirige si no está autenticado.
 */

interface Props {
  redirectTo?: string;
}

const { redirectTo = '/login' } = Astro.props;
---

<div id="auth-guard" class="auth-guard" data-redirect={redirectTo}>
  <div class="auth-loading">
    <div class="spinner"></div>
    <p>Verificando sesión...</p>
  </div>
</div>

<div id="auth-content" class="auth-content" hidden>
  <slot />
</div>

<script type="module">
  import { waitForAuth } from '/js/auth.js';
  
  const authGuard = document.getElementById('auth-guard');
  const authContent = document.getElementById('auth-content');
  const redirectTo = authGuard.dataset.redirect;
  
  async function checkAuth() {
    const user = await waitForAuth();
    
    if (user) {
      // Usuario autenticado, mostrar contenido
      authGuard.hidden = true;
      authContent.hidden = false;
      
      // Disparar evento para que los componentes hijos sepan que hay usuario
      window.dispatchEvent(new CustomEvent('auth-ready', { detail: { user } }));
    } else {
      // No autenticado, redirigir
      window.location.href = redirectTo;
    }
  }
  
  checkAuth();
</script>

<style>
  .auth-guard {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .auth-loading {
    text-align: center;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto var(--space-md);
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .auth-loading p {
    color: var(--color-text-secondary);
  }
  
  .auth-content {
    min-height: 100vh;
  }
</style>
```

---

## Paso 2.5: Layout de la App

### Crear `src/layouts/AppLayout.astro`

```astro
---
import BaseLayout from './BaseLayout.astro';
import AuthGuard from '../components/AuthGuard.astro';
import Header from '../components/Header.astro';
import Navigation from '../components/Navigation.astro';

interface Props {
  title: string;
}

const { title } = Astro.props;
---

<BaseLayout title={title}>
  <AuthGuard>
    <div class="app-container">
      <Header />
      <Navigation />
      <main class="app-main">
        <slot />
      </main>
    </div>
  </AuthGuard>
</BaseLayout>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  .app-main {
    flex: 1;
    padding: var(--space-lg);
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }
  
  @media (min-width: 768px) {
    .app-container {
      flex-direction: row;
    }
    
    .app-main {
      margin-left: 240px; /* Ancho del sidebar */
    }
  }
</style>
```

---

## Paso 2.6: Dashboard Inicial

### Crear `src/pages/app/index.astro`

```astro
---
import AppLayout from '../../layouts/AppLayout.astro';
---

<AppLayout title="Dashboard">
  <div class="dashboard">
    <header class="dashboard-header">
      <h1>¡Hola!</h1>
      <p id="user-greeting">Cargando...</p>
    </header>
    
    <section class="dashboard-quick-actions">
      <h2>Acciones rápidas</h2>
      <div class="action-grid">
        <a href="/app/lists/new" class="action-card">
          <span class="action-icon">📝</span>
          <span class="action-label">Nueva lista</span>
        </a>
        <a href="/app/lists" class="action-card">
          <span class="action-icon">🛒</span>
          <span class="action-label">Mis listas</span>
        </a>
        <a href="/app/purchases/upload" class="action-card">
          <span class="action-icon">📸</span>
          <span class="action-label">Escanear ticket</span>
        </a>
        <a href="/app/stats" class="action-card">
          <span class="action-icon">📊</span>
          <span class="action-label">Estadísticas</span>
        </a>
      </div>
    </section>
    
    <section class="dashboard-lists">
      <h2>Listas pendientes</h2>
      <div id="pending-lists">
        <p class="empty-state">Cargando listas...</p>
      </div>
    </section>
  </div>
</AppLayout>

<script type="module">
  import { getCurrentUser, getUserProfile } from '/js/auth.js';
  
  window.addEventListener('auth-ready', async (event) => {
    const { user } = event.detail;
    
    // Mostrar saludo personalizado
    const greeting = document.getElementById('user-greeting');
    const displayName = user.displayName?.split(' ')[0] || 'Usuario';
    greeting.textContent = `¿Qué quieres comprar hoy, ${displayName}?`;
    
    // Aquí cargaremos las listas pendientes en la siguiente fase
  });
</script>

<style>
  .dashboard {
    max-width: 800px;
  }
  
  .dashboard-header {
    margin-bottom: var(--space-xl);
  }
  
  .dashboard-header h1 {
    font-size: 2rem;
    margin-bottom: var(--space-xs);
  }
  
  .dashboard-header p {
    color: var(--color-text-secondary);
    font-size: var(--font-size-lg);
  }
  
  .dashboard-quick-actions {
    margin-bottom: var(--space-xl);
  }
  
  .dashboard-quick-actions h2 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-md);
  }
  
  .action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-md);
  }
  
  .action-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-lg);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--color-text);
    transition: all var(--transition-fast);
  }
  
  .action-card:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-sm);
    transform: translateY(-2px);
  }
  
  .action-icon {
    font-size: 2rem;
  }
  
  .action-label {
    font-size: var(--font-size-sm);
    font-weight: 500;
  }
  
  .dashboard-lists h2 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-md);
  }
  
  .empty-state {
    color: var(--color-text-secondary);
    text-align: center;
    padding: var(--space-xl);
  }
</style>
```

---

## Paso 2.7: Componente de Usuario (Lit)

### Crear `public/components/hc-user-menu.js`

```javascript
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/nickg/lit@3.1.0/lit-all.min.js';
import { eventBus } from '/js/event-bus.js';
import { signOut, getCurrentUser, onAuthStateChanged } from '/js/auth.js';

export class HcUserMenu extends LitElement {
  static properties = {
    user: { type: Object, state: true },
    open: { type: Boolean, state: true }
  };

  constructor() {
    super();
    this._componentId = `user-menu-${Math.random().toString(36).substr(2, 9)}`;
  }

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
    this.user = null;
    this.open = false;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Escuchar cambios de autenticación
    this._unsubscribe = onAuthStateChanged((user) => {
      this.user = user;
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

    return html`
      <button class="user-button" @click=${this._toggleDropdown}>
        ${this.user.photoURL 
          ? html`<img class="avatar" src=${this.user.photoURL} alt="Avatar" />`
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
          <a href="/app/settings/household" class="dropdown-item">Gestionar casa</a>
          <button class="dropdown-item danger" @click=${this._handleSignOut}>
            Cerrar sesión
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('hc-user-menu', HcUserMenu);
```

---

## Paso 2.8: Commit de la fase

```bash
git add .
git commit -m "feat(auth): implement Google authentication with Firebase

- Add Firebase config with emulator support
- Create auth service with signIn/signOut
- Add login page with Google button
- Create AuthGuard component for protected routes
- Implement user profile creation in Firestore
- Add AppLayout with auth protection
- Create hc-user-menu Lit component"
```

---

## ✅ Checklist de la Fase 2

- [ ] Firebase config creado con soporte para emuladores
- [ ] Auth service implementado (signIn, signOut, onAuthStateChanged)
- [ ] Página de login con botón de Google
- [ ] Manejo de errores de autenticación
- [ ] AuthGuard protegiendo rutas
- [ ] Perfil de usuario creado en Firestore al primer login
- [ ] AppLayout con autenticación requerida
- [ ] Dashboard básico mostrando info del usuario
- [ ] Componente hc-user-menu para logout

---

## 🔗 Siguiente Fase

→ [03-multi-hogar.md](./03-multi-hogar.md)

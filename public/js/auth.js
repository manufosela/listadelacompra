/**
 * Authentication Service
 * Maneja login con Google, Email/Password, logout y gestión de estado.
 *
 * Arquitectura:
 * - Estado centralizado: authResolved, currentUser
 * - Evento 'auth-ready' se dispara UNA SOLA VEZ cuando Firebase Auth resuelve
 * - Las páginas consultan isAuthResolved() y getCurrentUser() directamente
 * - Solo escuchan 'auth-ready' si auth aún no está resuelto (primera carga)
 */

import { auth, db } from './firebase-config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
import { getFromCache, setInCache, invalidateCache, clearAllCache } from './cache.js';

const googleProvider = new GoogleAuthProvider();

googleProvider.addScope('email');
googleProvider.addScope('profile');

// Estado centralizado de autenticación
let authResolved = false;
let currentUser = null;
let authReadyFired = false;

/**
 * Detecta si el navegador es móvil
 * @returns {boolean}
 */
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 768);
}

/**
 * Inicia sesión con Google
 * Siempre intenta popup primero (funciona en navegadores modernos incluso en móvil)
 * Si el popup falla, usa redirect como fallback
 * @returns {Promise<User>} Usuario autenticado
 */
export async function signInWithGoogle() {
  try {
    // Intentar popup primero (funciona en la mayoría de navegadores modernos)
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Crear o actualizar perfil de usuario
    await createOrUpdateUserProfile(user);

    return user;
  } catch (error) {
    // Si el popup falla, usar redirect como fallback
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      console.log('Popup falló, usando redirect como fallback...');
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Procesa el resultado del redirect de Google (si existe)
 * Debe llamarse al cargar la página de login
 * @returns {Promise<User|null>}
 */
export async function handleGoogleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await createOrUpdateUserProfile(result.user);
      return result.user;
    }
    return null;
  } catch (error) {
    console.error('Error processing Google redirect:', error);
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
    // Limpiar todo el cache y estado local
    clearAllCache();
    localStorage.removeItem('hc_current_group');
    currentUser = null;
    authResolved = false;
    authReadyFired = false;

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
  return currentUser;
}

/**
 * Indica si el estado de autenticación ya fue resuelto por Firebase
 * @returns {boolean}
 */
export function isAuthResolved() {
  return authResolved;
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
      groupIds: []
    });
    console.log('User profile created');
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
 * Espera a que se resuelva el estado de autenticación con timeout
 * @param {number} timeout - Tiempo máximo de espera en ms (default 10s)
 * @returns {Promise<User|null>} Usuario autenticado o null
 * @throws {Error} Si el timeout expira
 */
export function waitForAuth(timeout = 10000) {
  return new Promise((resolve, reject) => {
    // Si auth ya resolvió, retornar el estado actual
    if (authResolved) {
      resolve(currentUser);
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error('Auth timeout: Firebase no respondió a tiempo'));
    }, timeout);

    // Si no, esperar al evento auth-ready
    window.addEventListener('auth-ready', (e) => {
      clearTimeout(timeoutId);
      resolve(e.detail.user);
    }, { once: true });
  });
}

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean}
 */
export function isAuthenticated() {
  return auth.currentUser !== null;
}

// Listener principal de Firebase Auth
// Se ejecuta una vez cuando Firebase resuelve el estado de autenticación
// Dispara 'auth-ready' UNA SOLA VEZ
onAuthStateChanged((user) => {
  currentUser = user;
  authResolved = true;

  if (user) {
    // Cachear datos básicos del usuario en sessionStorage
    setInCache('user', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    }, '', { strategy: 'session', ttl: 0 });
  } else {
    invalidateCache('user');
  }

  // Disparar evento auth-ready UNA SOLA VEZ
  if (!authReadyFired) {
    authReadyFired = true;
    window.dispatchEvent(new CustomEvent('auth-ready', {
      detail: { user }
    }));
  }
});

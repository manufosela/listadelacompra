/**
 * Gestión del tema claro/oscuro
 * Soporta: preferencia del sistema, preferencia manual, persistencia en localStorage
 */

/** @type {typeof globalThis} */
const globalScope = globalThis;

const STORAGE_KEY = 'theme-preference';

/**
 * Obtiene la preferencia guardada en localStorage
 * @returns {'light' | 'dark' | null}
 */
export function getSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Obtiene la preferencia del sistema
 * @returns {'light' | 'dark'}
 */
export function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Obtiene el tema efectivo (guardado o del sistema)
 * @returns {'light' | 'dark'}
 */
export function getEffectiveTheme() {
  const saved = getSavedTheme();
  return saved || getSystemTheme();
}

/**
 * Aplica el tema al documento
 * @param {'light' | 'dark'} theme
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Guarda la preferencia del usuario
 * @param {'light' | 'dark' | null} theme - null para usar preferencia del sistema
 */
export function saveTheme(theme) {
  try {
    if (theme === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  } catch {
    // localStorage no disponible
  }
}

/**
 * Alterna entre tema claro y oscuro
 * @returns {'light' | 'dark'} El nuevo tema aplicado
 */
export function toggleTheme() {
  const current = getEffectiveTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  saveTheme(next);
  applyTheme(next);
  return next;
}

/**
 * Establece un tema específico
 * @param {'light' | 'dark'} theme
 */
export function setTheme(theme) {
  saveTheme(theme);
  applyTheme(theme);
}

/**
 * Resetea al tema del sistema (borra preferencia manual)
 */
export function useSystemTheme() {
  saveTheme(null);
  applyTheme(getSystemTheme());
}

/**
 * Comprueba si hay preferencia manual guardada
 * @returns {boolean}
 */
export function hasManualPreference() {
  return getSavedTheme() !== null;
}

/**
 * Inicializa el sistema de temas
 * - Aplica el tema correcto
 * - Escucha cambios en la preferencia del sistema
 */
export function initTheme() {
  // Aplicar tema inicial
  applyTheme(getEffectiveTheme());

  // Escuchar cambios en la preferencia del sistema
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    // Solo actualizar si no hay preferencia manual
    if (!hasManualPreference()) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

// Auto-inicializar si se carga como script normal (no módulo)
if (typeof globalScope !== 'undefined' && !globalScope.__themeInitialized) {
  globalScope.__themeInitialized = true;
  initTheme();
}

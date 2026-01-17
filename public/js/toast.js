/**
 * Toast Notification System
 * Sistema de notificaciones no intrusivas.
 *
 * Uso:
 *   import { toast } from '/js/toast.js';
 *   toast.success('Operación completada');
 *   toast.error('Algo salió mal');
 *   toast.info('Información importante');
 *   toast.warning('Advertencia');
 */

// Crear contenedor si no existe
function getContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    // Usar popover para renderizar en top layer (sobre dialogs nativos)
    container.setAttribute('popover', 'manual');
    document.body.appendChild(container);
    // Mostrar el popover para activar el top layer
    container.showPopover();
  }
  return container;
}

// Inyectar estilos si no existen
function injectStyles() {
  if (document.getElementById('toast-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'toast-styles';
  styles.textContent = `
    #toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 100000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
      max-width: calc(100vw - 3rem);
      /* Reset estilos por defecto de popover */
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      overflow: visible;
    }

    @media (max-width: 480px) {
      #toast-container {
        bottom: 1rem;
        right: 1rem;
        left: 1rem;
        max-width: none;
      }
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-radius: 0.5rem;
      background: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      pointer-events: auto;
      animation: toast-in 0.3s ease;
      max-width: 380px;
      border-left: 4px solid;
    }

    .toast.removing {
      animation: toast-out 0.2s ease forwards;
    }

    .toast-icon {
      flex-shrink: 0;
      font-size: 1.25rem;
      line-height: 1;
    }

    .toast-content {
      flex: 1;
      min-width: 0;
    }

    .toast-message {
      font-size: 0.9375rem;
      color: #1f2937;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .toast-close {
      flex-shrink: 0;
      background: none;
      border: none;
      padding: 0.25rem;
      cursor: pointer;
      color: #9ca3af;
      font-size: 1.25rem;
      line-height: 1;
      transition: color 0.15s;
    }

    .toast-close:hover {
      color: #4b5563;
    }

    /* Tipos */
    .toast.success {
      border-left-color: #10b981;
      background: #f0fdf4;
    }
    .toast.success .toast-icon { color: #10b981; }

    .toast.error {
      border-left-color: #ef4444;
      background: #fef2f2;
    }
    .toast.error .toast-icon { color: #ef4444; }

    .toast.warning {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }
    .toast.warning .toast-icon { color: #f59e0b; }

    .toast.info {
      border-left-color: #3b82f6;
      background: #eff6ff;
    }
    .toast.info .toast-icon { color: #3b82f6; }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes toast-out {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }

    @media (max-width: 480px) {
      .toast {
        max-width: none;
      }

      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes toast-out {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(100%);
        }
      }
    }
  `;
  document.head.appendChild(styles);
}

const ICONS = {
  success: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
  error: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
  warning: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
  info: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
};

/**
 * Muestra una notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {Object} options - Opciones
 * @param {string} options.type - Tipo: 'success', 'error', 'warning', 'info'
 * @param {number} options.duration - Duración en ms (0 = no auto-cerrar)
 */
function show(message, { type = 'info', duration = 4000 } = {}) {
  injectStyles();
  const container = getContainer();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
    <div class="toast-content">
      <p class="toast-message">${escapeHtml(message)}</p>
    </div>
    <button class="toast-close" aria-label="Cerrar">&times;</button>
  `;

  // Cerrar al hacer click
  toast.querySelector('.toast-close').addEventListener('click', () => remove(toast));

  container.appendChild(toast);

  // Auto-cerrar
  if (duration > 0) {
    setTimeout(() => remove(toast), duration);
  }

  return toast;
}

function remove(toast) {
  if (!toast || toast.classList.contains('removing')) return;
  toast.classList.add('removing');
  setTimeout(() => toast.remove(), 200);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// API pública
export const toast = {
  show,
  success: (message, options = {}) => show(message, { ...options, type: 'success' }),
  error: (message, options = {}) => show(message, { ...options, type: 'error', duration: options.duration ?? 6000 }),
  warning: (message, options = {}) => show(message, { ...options, type: 'warning', duration: options.duration ?? 5000 }),
  info: (message, options = {}) => show(message, { ...options, type: 'info' })
};

// Exponer globalmente para uso desde HTML inline
/** @type {typeof globalThis} */
const globalScope = globalThis;
globalScope.toast = toast;

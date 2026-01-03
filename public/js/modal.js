/**
 * Modal System
 * Sistema de modales para confirmaciones y diálogos.
 *
 * Uso:
 *   import { modal } from '/js/modal.js';
 *
 *   // Confirmación simple
 *   if (await modal.confirm('¿Eliminar este elemento?')) {
 *     // Usuario confirmó
 *   }
 *
 *   // Con opciones
 *   const result = await modal.confirm({
 *     title: 'Eliminar producto',
 *     message: '¿Estás seguro? Esta acción no se puede deshacer.',
 *     confirmText: 'Eliminar',
 *     cancelText: 'Cancelar',
 *     danger: true
 *   });
 */

// Inyectar estilos
function injectStyles() {
  if (document.getElementById('modal-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'modal-styles';
  styles.textContent = `
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100001;
      padding: 1rem;
      animation: modal-fade-in 0.2s ease;
    }

    .modal-overlay.closing {
      animation: modal-fade-out 0.15s ease forwards;
    }

    .modal-dialog {
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      max-width: 400px;
      width: 100%;
      animation: modal-slide-in 0.2s ease;
    }

    .modal-overlay.closing .modal-dialog {
      animation: modal-slide-out 0.15s ease forwards;
    }

    .modal-header {
      padding: 1.25rem 1.5rem 0;
    }

    .modal-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .modal-body {
      padding: 0.75rem 1.5rem 1.5rem;
    }

    .modal-message {
      color: #4b5563;
      font-size: 0.9375rem;
      line-height: 1.5;
      margin: 0;
    }

    .modal-footer {
      display: flex;
      gap: 0.75rem;
      padding: 0 1.5rem 1.5rem;
      justify-content: flex-end;
    }

    .modal-btn {
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      border: 1px solid transparent;
    }

    .modal-btn:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    }

    .modal-btn-cancel {
      background: white;
      border-color: #d1d5db;
      color: #374151;
    }

    .modal-btn-cancel:hover {
      background: #f3f4f6;
    }

    .modal-btn-confirm {
      background: #3b82f6;
      color: white;
    }

    .modal-btn-confirm:hover {
      background: #2563eb;
    }

    .modal-btn-confirm.danger {
      background: #ef4444;
    }

    .modal-btn-confirm.danger:hover {
      background: #dc2626;
    }

    .modal-btn-confirm.danger:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3);
    }

    @keyframes modal-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modal-fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes modal-slide-in {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes modal-slide-out {
      from {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      to {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
    }
  `;
  document.head.appendChild(styles);
}

/**
 * Muestra un modal de confirmación
 * @param {string|Object} options - Mensaje o objeto de opciones
 * @returns {Promise<boolean>} true si confirma, false si cancela
 */
function confirm(options) {
  injectStyles();

  // Normalizar opciones
  const config = typeof options === 'string'
    ? { message: options }
    : options;

  const {
    title = 'Confirmar',
    message = '¿Estás seguro?',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    danger = false
  } = config;

  return new Promise((resolve) => {
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-title">${escapeHtml(title)}</h2>
        </div>
        <div class="modal-body">
          <p class="modal-message">${escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn modal-btn-cancel" data-action="cancel">
            ${escapeHtml(cancelText)}
          </button>
          <button class="modal-btn modal-btn-confirm ${danger ? 'danger' : ''}" data-action="confirm">
            ${escapeHtml(confirmText)}
          </button>
        </div>
      </div>
    `;

    // Manejar acciones
    const close = (result) => {
      overlay.classList.add('closing');
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 150);
    };

    // Click en botones
    overlay.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'confirm') close(true);
      if (action === 'cancel') close(false);
    });

    // Click fuera del modal = cancelar
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });

    // Escape = cancelar
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        close(false);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Añadir al DOM y enfocar botón confirmar
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-btn-confirm').focus();
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// API pública
export const modal = {
  confirm
};

// Exponer globalmente
globalThis.modal = modal;

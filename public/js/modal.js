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
    .confirm-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: none;
      border-radius: 0.75rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      max-width: 400px;
      width: calc(100% - 2rem);
      padding: 0;
      animation: modal-slide-in 0.2s ease;
    }

    .confirm-dialog::backdrop {
      background: rgba(0, 0, 0, 0.5);
      animation: modal-fade-in 0.2s ease;
    }

    .confirm-dialog.closing {
      animation: modal-slide-out 0.15s ease forwards;
    }

    .confirm-dialog.closing::backdrop {
      animation: modal-fade-out 0.15s ease forwards;
    }

    .confirm-dialog .modal-header {
      padding: 1.25rem 1.5rem 0;
    }

    .confirm-dialog .modal-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .confirm-dialog .modal-body {
      padding: 0.75rem 1.5rem 1.5rem;
    }

    .confirm-dialog .modal-message {
      color: #4b5563;
      font-size: 0.9375rem;
      line-height: 1.5;
      margin: 0;
    }

    .confirm-dialog .modal-footer {
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
        transform: translate(-50%, -50%) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }

    @keyframes modal-slide-out {
      from {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      to {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.95);
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
    // Crear dialog nativo (se renderiza en top layer)
    const dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">${escapeHtml(title)}</h2>
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
    `;

    // Manejar acciones
    const close = (result) => {
      dialog.classList.add('closing');
      setTimeout(() => {
        dialog.close();
        dialog.remove();
        resolve(result);
      }, 150);
    };

    // Click en botones
    dialog.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'confirm') close(true);
      if (action === 'cancel') close(false);
    });

    // Click en backdrop (fuera del dialog) = cancelar
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) close(false);
    });

    // Cancelar con Escape (evento nativo del dialog)
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      close(false);
    });

    // Añadir al DOM, mostrar y enfocar botón confirmar
    document.body.appendChild(dialog);
    dialog.showModal();
    dialog.querySelector('.modal-btn-confirm').focus();
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
/** @type {typeof globalThis} */
const globalScope = globalThis;
globalScope.modal = modal;

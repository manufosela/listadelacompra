/**
 * Image Cropper Modal
 * Modal para seleccionar, previsualizar y recortar imágenes en formato cuadrado.
 *
 * Uso:
 *   import { openImageCropper } from '/js/image-cropper.js';
 *
 *   const result = await openImageCropper({
 *     title: 'Cambiar icono',
 *     size: 200
 *   });
 *
 *   if (result) {
 *     // result.blob - Blob de la imagen recortada
 *     // result.dataUrl - Data URL para preview
 *   }
 */

// Inyectar estilos
function injectStyles() {
  if (document.getElementById('image-cropper-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'image-cropper-styles';
  styles.textContent = `
    .cropper-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100002;
      padding: 1rem;
      animation: cropper-fade-in 0.2s ease;
    }

    .cropper-overlay.closing {
      animation: cropper-fade-out 0.15s ease forwards;
    }

    .cropper-dialog {
      background: var(--color-bg, white);
      border-radius: 1rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-width: 400px;
      width: 100%;
      animation: cropper-slide-in 0.2s ease;
      overflow: hidden;
    }

    .cropper-overlay.closing .cropper-dialog {
      animation: cropper-slide-out 0.15s ease forwards;
    }

    .cropper-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--color-border, #e5e7eb);
    }

    .cropper-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text, #111827);
      margin: 0;
    }

    .cropper-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 50%;
      cursor: pointer;
      color: var(--color-text-secondary, #6b7280);
      transition: all 0.15s;
    }

    .cropper-close:hover {
      background: var(--color-bg-secondary, #f3f4f6);
      color: var(--color-text, #111827);
    }

    .cropper-body {
      padding: 1.25rem;
    }

    /* Estado inicial: botón de seleccionar */
    .cropper-select-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 2.5rem 1rem;
      border: 2px dashed var(--color-border, #d1d5db);
      border-radius: 0.75rem;
      background: var(--color-bg-secondary, #f9fafb);
      cursor: pointer;
      transition: all 0.2s;
    }

    .cropper-select-area:hover {
      border-color: var(--color-primary, #3b82f6);
      background: rgba(59, 130, 246, 0.05);
    }

    .cropper-select-area svg {
      color: var(--color-text-tertiary, #9ca3af);
    }

    .cropper-select-area span {
      font-size: 0.875rem;
      color: var(--color-text-secondary, #6b7280);
    }

    /* Estado con imagen: preview y controles */
    .cropper-preview-container {
      display: none;
    }

    .cropper-preview-container.active {
      display: block;
    }

    .cropper-preview-wrapper {
      position: relative;
      width: 200px;
      height: 200px;
      margin: 0 auto 1rem;
      border-radius: 0.75rem;
      overflow: hidden;
      background: #000;
    }

    .cropper-preview-img {
      position: absolute;
      top: 50%;
      left: 50%;
      transform-origin: center;
      max-width: none;
      pointer-events: none;
    }

    .cropper-controls {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .cropper-control-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .cropper-control-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-secondary, #6b7280);
      width: 50px;
      flex-shrink: 0;
    }

    .cropper-slider {
      flex: 1;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: var(--color-border, #e5e7eb);
      border-radius: 2px;
      outline: none;
    }

    .cropper-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      background: var(--color-primary, #3b82f6);
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.15s;
    }

    .cropper-slider::-webkit-slider-thumb:hover {
      transform: scale(1.1);
    }

    .cropper-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      background: var(--color-primary, #3b82f6);
      border: none;
      border-radius: 50%;
      cursor: pointer;
    }

    .cropper-change-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-secondary, #6b7280);
      background: var(--color-bg-secondary, #f3f4f6);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.15s;
    }

    .cropper-change-btn:hover {
      background: var(--color-bg-tertiary, #e5e7eb);
    }

    .cropper-footer {
      display: flex;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--color-border, #e5e7eb);
      justify-content: flex-end;
    }

    .cropper-btn {
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      border: 1px solid transparent;
    }

    .cropper-btn:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    }

    .cropper-btn-cancel {
      background: var(--color-bg, white);
      border-color: var(--color-border, #d1d5db);
      color: var(--color-text, #374151);
    }

    .cropper-btn-cancel:hover {
      background: var(--color-bg-secondary, #f3f4f6);
    }

    .cropper-btn-save {
      background: var(--color-primary, #3b82f6);
      color: white;
    }

    .cropper-btn-save:hover {
      background: #2563eb;
    }

    .cropper-btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @keyframes cropper-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes cropper-fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes cropper-slide-in {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes cropper-slide-out {
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
 * Abre el modal de recorte de imagen
 * @param {Object} options - Opciones de configuración
 * @param {string} options.title - Título del modal
 * @param {number} options.size - Tamaño del cuadrado resultante (default 200)
 * @returns {Promise<{blob: Blob, dataUrl: string}|null>} Resultado o null si cancela
 */
export function openImageCropper(options = {}) {
  injectStyles();

  const { title = 'Editar imagen', size = 200 } = options;

  return new Promise((resolve) => {
    let imageFile = null;
    let imageElement = null;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let naturalWidth = 0;
    let naturalHeight = 0;

    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'cropper-overlay';
    overlay.innerHTML = `
      <div class="cropper-dialog" role="dialog" aria-modal="true" aria-labelledby="cropper-title">
        <div class="cropper-header">
          <h2 class="cropper-title" id="cropper-title">${title}</h2>
          <button class="cropper-close" data-action="close" aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="cropper-body">
          <!-- Estado inicial: seleccionar imagen -->
          <label class="cropper-select-area" id="select-area">
            <input type="file" accept="image/*" hidden id="file-input" />
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Haz clic para seleccionar una imagen</span>
          </label>

          <!-- Estado con imagen: preview y controles -->
          <div class="cropper-preview-container" id="preview-container">
            <div class="cropper-preview-wrapper" id="preview-wrapper">
              <img class="cropper-preview-img" id="preview-img" alt="Preview" />
            </div>
            <div class="cropper-controls">
              <div class="cropper-control-row">
                <span class="cropper-control-label">Zoom</span>
                <input type="range" class="cropper-slider" id="zoom-slider" min="100" max="300" value="100" />
              </div>
              <div class="cropper-control-row">
                <button class="cropper-change-btn" id="change-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Cambiar imagen
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="cropper-footer">
          <button class="cropper-btn cropper-btn-cancel" data-action="cancel">Cancelar</button>
          <button class="cropper-btn cropper-btn-save" data-action="save" disabled>Guardar</button>
        </div>
      </div>
    `;

    // Referencias
    const fileInput = overlay.querySelector('#file-input');
    const selectArea = overlay.querySelector('#select-area');
    const previewContainer = overlay.querySelector('#preview-container');
    const previewWrapper = overlay.querySelector('#preview-wrapper');
    const previewImg = overlay.querySelector('#preview-img');
    const zoomSlider = overlay.querySelector('#zoom-slider');
    const changeBtn = overlay.querySelector('#change-btn');
    const saveBtn = overlay.querySelector('[data-action="save"]');

    // Cerrar modal
    const close = (result = null) => {
      overlay.classList.add('closing');
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 150);
    };

    // Actualizar posición de la imagen
    const updateImagePosition = () => {
      if (!imageElement) return;

      const wrapperSize = 200;
      const scaledWidth = naturalWidth * scale;
      const scaledHeight = naturalHeight * scale;

      // Limitar offset para que la imagen siempre cubra el área
      const maxOffsetX = Math.max(0, (scaledWidth - wrapperSize) / 2);
      const maxOffsetY = Math.max(0, (scaledHeight - wrapperSize) / 2);

      offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX));
      offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY));

      previewImg.style.width = `${scaledWidth}px`;
      previewImg.style.height = `${scaledHeight}px`;
      previewImg.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    };

    // Cargar imagen
    const loadImage = (file) => {
      imageFile = file;
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          imageElement = img;
          naturalWidth = img.naturalWidth;
          naturalHeight = img.naturalHeight;

          // Calcular escala inicial para cubrir el área
          const wrapperSize = 200;
          const minScale = Math.max(wrapperSize / naturalWidth, wrapperSize / naturalHeight);
          scale = minScale;

          // Resetear controles
          zoomSlider.min = Math.round(minScale * 100);
          zoomSlider.max = Math.round(minScale * 100 * 3);
          zoomSlider.value = Math.round(minScale * 100);
          offsetX = 0;
          offsetY = 0;

          previewImg.src = e.target.result;
          updateImagePosition();

          // Mostrar preview, ocultar selector
          selectArea.style.display = 'none';
          previewContainer.classList.add('active');
          saveBtn.disabled = false;
        };
        img.src = e.target.result;
      };

      reader.readAsDataURL(file);
    };

    // Eventos de archivo
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) loadImage(file);
    });

    changeBtn.addEventListener('click', () => fileInput.click());

    // Evento de zoom
    zoomSlider.addEventListener('input', (e) => {
      scale = parseInt(e.target.value, 10) / 100;
      updateImagePosition();
    });

    // Eventos de arrastre para mover la imagen
    previewWrapper.addEventListener('mousedown', (e) => {
      if (!imageElement) return;
      isDragging = true;
      dragStartX = e.clientX - offsetX;
      dragStartY = e.clientY - offsetY;
      previewWrapper.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      offsetX = e.clientX - dragStartX;
      offsetY = e.clientY - dragStartY;
      updateImagePosition();
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      previewWrapper.style.cursor = 'grab';
    });

    // Touch events para móvil
    previewWrapper.addEventListener('touchstart', (e) => {
      if (!imageElement || e.touches.length !== 1) return;
      isDragging = true;
      const touch = e.touches[0];
      dragStartX = touch.clientX - offsetX;
      dragStartY = touch.clientY - offsetY;
    });

    document.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      offsetX = touch.clientX - dragStartX;
      offsetY = touch.clientY - dragStartY;
      updateImagePosition();
    });

    document.addEventListener('touchend', () => {
      isDragging = false;
    });

    // Generar imagen recortada
    const generateCroppedImage = () => {
      return new Promise((res) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = size;
        canvas.height = size;

        // Calcular qué parte de la imagen original dibujar
        const wrapperSize = 200;
        const scaledWidth = naturalWidth * scale;
        const scaledHeight = naturalHeight * scale;

        // Centro del área visible
        const centerX = scaledWidth / 2 - offsetX;
        const centerY = scaledHeight / 2 - offsetY;

        // Área visible en coordenadas de imagen escalada
        const visibleLeft = centerX - wrapperSize / 2;
        const visibleTop = centerY - wrapperSize / 2;

        // Convertir a coordenadas de imagen original
        const sourceX = visibleLeft / scale;
        const sourceY = visibleTop / scale;
        const sourceSize = wrapperSize / scale;

        ctx.drawImage(
          imageElement,
          sourceX, sourceY, sourceSize, sourceSize,
          0, 0, size, size
        );

        canvas.toBlob((blob) => {
          const dataUrl = canvas.toDataURL('image/webp', 0.85);
          res({ blob, dataUrl });
        }, 'image/webp', 0.85);
      });
    };

    // Botones de acción
    overlay.addEventListener('click', async (e) => {
      const action = e.target.dataset?.action || e.target.closest('[data-action]')?.dataset?.action;

      if (action === 'close' || action === 'cancel') {
        close(null);
      } else if (action === 'save' && imageElement) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Procesando...';
        const result = await generateCroppedImage();
        close(result);
      }
    });

    // Click fuera del modal = cancelar
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });

    // Escape = cancelar
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        close(null);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Añadir al DOM
    document.body.appendChild(overlay);

    // Cursor grab para el preview
    previewWrapper.style.cursor = 'grab';
  });
}

// Exponer globalmente
globalThis.openImageCropper = openImageCropper;

import { LitElement, html, css } from '/js/vendor/lit.bundle.js';
import { processTicketImage, compressImage } from '/js/openai-service.js';

export class HcTicketScanner extends LitElement {
  static properties = {
    imagePreview: { state: true },
    processing: { state: true },
    result: { state: true },
    step: { state: true },
    error: { state: true },
    editingIndex: { state: true }
  };

  static styles = css`
    :host {
      display: block;
      max-width: 600px;
      margin: 0 auto;
    }

    .capture-area {
      border: 2px dashed #cbd5e1;
      border-radius: 1rem;
      padding: 3rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .capture-area:hover {
      border-color: #2563eb;
      background: #f8fafc;
    }

    .capture-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .capture-text {
      font-size: 1.125rem;
      color: #64748b;
      margin-bottom: 0.5rem;
    }

    .capture-hint {
      font-size: 0.875rem;
      color: #94a3b8;
    }

    input[type="file"] {
      display: none;
    }

    .preview-container {
      text-align: center;
    }

    .preview-image {
      max-width: 100%;
      max-height: 400px;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.15s ease;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
      border: none;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: white;
      border: 1px solid #e2e8f0;
      color: #64748b;
    }

    .btn-secondary:hover {
      background: #f8fafc;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .processing-container {
      text-align: center;
      padding: 3rem;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .processing-text {
      color: #64748b;
      font-size: 1.125rem;
    }

    .review-container {
      background: white;
      border-radius: 0.75rem;
      padding: 1.5rem;
      border: 1px solid #e2e8f0;
    }

    .review-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .review-store {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .review-date {
      color: #64748b;
      font-size: 0.875rem;
    }

    .review-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .review-item:last-child {
      border-bottom: none;
    }

    .item-name {
      font-weight: 500;
    }

    .item-details {
      font-size: 0.875rem;
      color: #64748b;
    }

    .item-price {
      font-weight: 500;
      white-space: nowrap;
    }

    .review-total {
      display: flex;
      justify-content: space-between;
      padding: 1rem 0;
      margin-top: 0.5rem;
      border-top: 2px solid #e2e8f0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .error-container {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      padding: 1rem;
      color: #dc2626;
      margin-bottom: 1rem;
    }

    .success-container {
      text-align: center;
      padding: 3rem;
    }

    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .success-text {
      font-size: 1.25rem;
      color: #166534;
      margin-bottom: 1rem;
    }

    .review-item {
      cursor: pointer;
      transition: background 0.15s ease;
      border-radius: 0.25rem;
      padding: 0.75rem;
      margin: 0 -0.75rem;
    }

    .review-item:hover {
      background: #f8fafc;
    }

    .review-item.editing {
      background: #eff6ff;
      cursor: default;
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem 0;
    }

    .edit-row {
      display: flex;
      gap: 0.5rem;
    }

    .edit-input {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }

    .edit-input:focus {
      outline: none;
      border-color: #2563eb;
    }

    .edit-input.small {
      width: 70px;
      flex: none;
    }

    .edit-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .btn-xs {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }

    .btn-danger {
      background: #fee2e2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .btn-danger:hover {
      background: #fecaca;
    }

    .add-item-btn {
      display: block;
      width: 100%;
      padding: 0.75rem;
      margin-top: 0.5rem;
      border: 1px dashed #cbd5e1;
      border-radius: 0.5rem;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.15s ease;
    }

    .add-item-btn:hover {
      border-color: #2563eb;
      color: #2563eb;
      background: #f8fafc;
    }

    .edit-hint {
      font-size: 0.75rem;
      color: #94a3b8;
      text-align: center;
      margin-top: 0.5rem;
    }

    .store-input,
    .total-input {
      font-size: inherit;
      font-weight: inherit;
      border: none;
      border-bottom: 1px dashed #cbd5e1;
      background: transparent;
      padding: 0.25rem;
    }

    .store-input:focus,
    .total-input:focus {
      outline: none;
      border-bottom-color: #2563eb;
    }

    .store-input {
      width: 150px;
    }

    .total-input {
      width: 100px;
      text-align: right;
    }
  `;

  constructor() {
    super();
    this.step = 'capture';
    this.error = null;
    this.editingIndex = -1;
  }

  async _handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    this.error = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target.result;
      this.step = 'preview';
    };
    reader.readAsDataURL(file);
    this._file = file;
  }

  async _process() {
    this.step = 'processing';
    this.error = null;

    try {
      const base64 = await compressImage(this._file);
      this.result = await processTicketImage(base64);
      this.step = 'review';
    } catch (e) {
      console.error('Error processing ticket:', e);
      this.error = e.message || 'Error al procesar el ticket. Intenta con otra foto.';
      this.step = 'preview';
    }
  }

  _confirm() {
    this.dispatchEvent(new CustomEvent('ticket-confirmed', {
      detail: { ticketData: this.result },
      bubbles: true,
      composed: true
    }));
    this.step = 'done';
  }

  _reset() {
    this.step = 'capture';
    this.imagePreview = null;
    this.result = null;
    this.error = null;
    this._file = null;
    this.editingIndex = -1;
  }

  _startEditing(index, e) {
    e.stopPropagation();
    this.editingIndex = index;
  }

  _stopEditing() {
    this.editingIndex = -1;
  }

  _updateItem(index, field, value) {
    if (!this.result?.items) return;

    const items = [...this.result.items];
    items[index] = { ...items[index], [field]: value };

    // Recalcular precio total del item si cambia cantidad o precio unitario
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = parseFloat(items[index].quantity) || 1;
      const price = parseFloat(items[index].unitPrice) || items[index].totalPrice / qty || 0;
      items[index].totalPrice = qty * price;
    }

    this.result = { ...this.result, items };
  }

  _updateStore(e) {
    this.result = { ...this.result, store: e.target.value };
  }

  _updateTotal(e) {
    const value = parseFloat(e.target.value) || 0;
    this.result = { ...this.result, total: value };
  }

  _deleteItem(index, e) {
    e.stopPropagation();
    if (!this.result?.items) return;

    const items = this.result.items.filter((_, i) => i !== index);
    this.result = { ...this.result, items };
    this.editingIndex = -1;

    // Recalcular total
    const total = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    this.result = { ...this.result, total };
  }

  _addItem() {
    const items = [...(this.result?.items || []), {
      name: 'Nuevo producto',
      quantity: 1,
      unit: 'ud',
      totalPrice: 0
    }];
    this.result = { ...this.result, items };
    this.editingIndex = items.length - 1;
  }

  _recalculateTotal() {
    if (!this.result?.items) return;
    const total = this.result.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    this.result = { ...this.result, total };
  }

  render() {
    if (this.step === 'capture') {
      return html`
        <div class="capture-area" @click=${() => this.shadowRoot.getElementById('file').click()}>
          <div class="capture-icon">📸</div>
          <p class="capture-text">Haz clic para subir foto del ticket</p>
          <p class="capture-hint">Acepta fotos de la cámara o de la galería</p>
          <input type="file" id="file" accept="image/*" capture="environment" @change=${this._handleFile} />
        </div>
      `;
    }

    if (this.step === 'preview') {
      return html`
        <div class="preview-container">
          ${this.error ? html`
            <div class="error-container">${this.error}</div>
          ` : ''}
          <img class="preview-image" src=${this.imagePreview} alt="Preview del ticket" />
          <div class="actions">
            <button class="btn btn-secondary" @click=${this._reset}>Cancelar</button>
            <button class="btn btn-primary" @click=${this._process}>🤖 Procesar con IA</button>
          </div>
        </div>
      `;
    }

    if (this.step === 'processing') {
      return html`
        <div class="processing-container">
          <div class="spinner"></div>
          <p class="processing-text">Analizando ticket con IA...</p>
          <p style="color: #94a3b8; font-size: 0.875rem;">Esto puede tardar unos segundos</p>
        </div>
      `;
    }

    if (this.step === 'review') {
      return html`
        <div class="review-container">
          <div class="review-header">
            <input
              class="store-input"
              type="text"
              .value=${this.result.store || ''}
              placeholder="Tienda"
              @input=${this._updateStore}
            />
            <span class="review-date">${this.result.date || 'Fecha no detectada'}</span>
          </div>

          ${this.result.items?.map((item, index) => html`
            <div
              class="review-item ${this.editingIndex === index ? 'editing' : ''}"
              @click=${(e) => this.editingIndex !== index && this._startEditing(index, e)}
            >
              ${this.editingIndex === index ? html`
                <div class="edit-form" @click=${(e) => e.stopPropagation()}>
                  <input
                    class="edit-input"
                    type="text"
                    .value=${item.name}
                    placeholder="Nombre del producto"
                    @input=${(e) => this._updateItem(index, 'name', e.target.value)}
                  />
                  <div class="edit-row">
                    <input
                      class="edit-input small"
                      type="number"
                      step="0.01"
                      min="0"
                      .value=${item.quantity || 1}
                      @input=${(e) => this._updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                    />
                    <input
                      class="edit-input"
                      type="text"
                      .value=${item.unit || 'ud'}
                      placeholder="Unidad"
                      style="width: 80px; flex: none;"
                      @input=${(e) => this._updateItem(index, 'unit', e.target.value)}
                    />
                    <input
                      class="edit-input"
                      type="number"
                      step="0.01"
                      min="0"
                      .value=${item.totalPrice || 0}
                      placeholder="Precio"
                      @input=${(e) => {
                        this._updateItem(index, 'totalPrice', parseFloat(e.target.value) || 0);
                        this._recalculateTotal();
                      }}
                    />
                    <span style="align-self: center;">€</span>
                  </div>
                  <div class="edit-actions">
                    <button class="btn btn-xs btn-danger" @click=${(e) => this._deleteItem(index, e)}>
                      Eliminar
                    </button>
                    <button class="btn btn-xs btn-secondary" @click=${this._stopEditing}>
                      Cerrar
                    </button>
                  </div>
                </div>
              ` : html`
                <div>
                  <div class="item-name">${item.name}</div>
                  <div class="item-details">
                    ${item.quantity} ${item.unit}
                    ${item.brand ? ` · ${item.brand}` : ''}
                  </div>
                </div>
                <span class="item-price">${item.totalPrice?.toFixed(2) || '0.00'}€</span>
              `}
            </div>
          `) || html`<p>No se detectaron productos</p>`}

          <button class="add-item-btn" @click=${this._addItem}>
            + Añadir producto
          </button>

          <p class="edit-hint">Toca un producto para editarlo</p>

          <div class="review-total">
            <span>Total</span>
            <input
              class="total-input"
              type="number"
              step="0.01"
              min="0"
              .value=${this.result.total || 0}
              @input=${this._updateTotal}
            />€
          </div>
        </div>

        <div class="actions" style="margin-top: 1.5rem;">
          <button class="btn btn-secondary" @click=${this._reset}>Cancelar</button>
          <button class="btn btn-primary" @click=${this._confirm}>✓ Guardar compra</button>
        </div>
      `;
    }

    // Done state
    return html`
      <div class="success-container">
        <div class="success-icon">✅</div>
        <p class="success-text">¡Ticket guardado correctamente!</p>
        <button class="btn btn-primary" @click=${this._reset}>Escanear otro ticket</button>
      </div>
    `;
  }
}

customElements.define('hc-ticket-scanner', HcTicketScanner);

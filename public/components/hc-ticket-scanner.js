/**
 * Ticket Scanner Component
 * Componente para escanear y procesar tickets de compra
 */

import { LitElement, html, css } from '/js/vendor/lit.bundle.js';
import { processTicket, applyTicketToList } from '/js/tickets.js';
import { getCurrentGroupId } from '/js/group.js';

// Cargar pdf.js dinámicamente
let pdfjsLib = null;
async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
  return pdfjsLib;
}

export class HcTicketScanner extends LitElement {
  static properties = {
    listId: { type: String, attribute: 'list-id' },
    userId: { type: String, attribute: 'user-id' },
    listItems: { type: Array },

    // Estado interno
    _isOpen: { type: Boolean, state: true },
    _step: { type: String, state: true }, // 'upload' | 'processing' | 'review' | 'applying' | 'done'
    _ticketData: { type: Object, state: true },
    _error: { type: String, state: true },
    _results: { type: Object, state: true },
  };

  constructor() {
    super();
    this.listItems = [];
    this._isOpen = false;
    this._step = 'upload';
    this._ticketData = null;
    this._error = null;
    this._results = null;
  }

  static styles = css`
    :host {
      display: block;
    }

    .scan-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .scan-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .scan-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal {
      background: var(--color-bg, #fff);
      border-radius: 1rem;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-border, #e5e7eb);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      color: var(--color-text, #1f2937);
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--color-text-secondary, #6b7280);
      padding: 0.25rem;
      line-height: 1;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .upload-zone {
      border: 2px dashed var(--color-border, #d1d5db);
      border-radius: 0.75rem;
      padding: 3rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .upload-zone:hover {
      border-color: var(--color-primary, #6366f1);
      background: rgba(99, 102, 241, 0.05);
    }

    .upload-zone.dragover {
      border-color: var(--color-primary, #6366f1);
      background: rgba(99, 102, 241, 0.1);
    }

    .upload-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .upload-text {
      color: var(--color-text, #374151);
      margin-bottom: 0.5rem;
    }

    .upload-hint {
      color: var(--color-text-secondary, #6b7280);
      font-size: 0.875rem;
    }

    .hidden-input {
      display: none;
    }

    .processing {
      text-align: center;
      padding: 3rem 2rem;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid var(--color-border, #e5e7eb);
      border-top-color: var(--color-primary, #6366f1);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .processing-text {
      color: var(--color-text, #374151);
      font-size: 1.1rem;
    }

    .processing-hint {
      color: var(--color-text-secondary, #6b7280);
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .ticket-summary {
      background: var(--color-bg-secondary, #f9fafb);
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0;
    }

    .summary-label {
      color: var(--color-text-secondary, #6b7280);
    }

    .summary-value {
      font-weight: 500;
      color: var(--color-text, #1f2937);
    }

    .items-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .items-header h3 {
      margin: 0;
      font-size: 1rem;
      color: var(--color-text, #1f2937);
    }

    .ticket-items {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .ticket-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--color-bg, #fff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 0.5rem;
    }

    .item-status {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      flex-shrink: 0;
    }

    .status-matched { background: #dcfce7; color: #16a34a; }
    .status-unmatched { background: #fef3c7; color: #d97706; }
    .status-new { background: #dbeafe; color: #2563eb; }
    .status-ignored { background: #f3f4f6; color: #6b7280; }

    .item-info {
      flex: 1;
      min-width: 0;
    }

    .item-name {
      font-weight: 500;
      color: var(--color-text, #1f2937);
      margin-bottom: 0.25rem;
    }

    .item-match {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #6b7280);
    }

    .item-match-name {
      color: #16a34a;
      font-weight: 500;
    }

    .item-price {
      font-weight: 600;
      color: var(--color-text, #1f2937);
      white-space: nowrap;
    }

    .item-actions {
      display: flex;
      gap: 0.25rem;
    }

    .item-action-btn {
      background: none;
      border: none;
      padding: 0.25rem;
      cursor: pointer;
      font-size: 1rem;
      opacity: 0.6;
      transition: opacity 0.2s;
    }

    .item-action-btn:hover {
      opacity: 1;
    }

    .match-selector {
      margin-top: 0.5rem;
    }

    .match-selector select {
      width: 100%;
      padding: 0.375rem 0.5rem;
      border: 1px solid var(--color-border, #d1d5db);
      border-radius: 0.375rem;
      font-size: 0.875rem;
      background: var(--color-bg, #fff);
      color: var(--color-text, #1f2937);
    }

    .modal-footer {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--color-border, #e5e7eb);
    }

    .btn {
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary {
      background: var(--color-bg-secondary, #f3f4f6);
      border: 1px solid var(--color-border, #d1d5db);
      color: var(--color-text, #374151);
    }

    .btn-secondary:hover {
      background: var(--color-border, #e5e7eb);
    }

    .btn-primary {
      background: var(--color-primary, #6366f1);
      border: none;
      color: white;
    }

    .btn-primary:hover {
      background: #4f46e5;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .done {
      text-align: center;
      padding: 2rem;
    }

    .done-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .done-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text, #1f2937);
      margin-bottom: 0.5rem;
    }

    .done-stats {
      color: var(--color-text-secondary, #6b7280);
    }

    @media (prefers-color-scheme: dark) {
      .modal { background: #1e293b; }
      .modal-header { border-color: #334155; }
      .modal-header h2 { color: #f1f5f9; }
      .close-btn { color: #94a3b8; }
      .upload-zone { border-color: #475569; }
      .upload-zone:hover { border-color: #818cf8; background: rgba(129, 140, 248, 0.1); }
      .upload-text { color: #f1f5f9; }
      .ticket-summary { background: #334155; }
      .ticket-item { background: #1e293b; border-color: #475569; }
      .item-name, .item-price, .summary-value { color: #f1f5f9; }
      .summary-label, .item-match { color: #94a3b8; }
      .modal-footer { border-color: #334155; }
      .btn-secondary { background: #334155; border-color: #475569; color: #f1f5f9; }
      .match-selector select { background: #334155; border-color: #475569; color: #f1f5f9; }
      .error { background: #450a0a; border-color: #7f1d1d; color: #fca5a5; }
      .done-title { color: #f1f5f9; }
    }
  `;

  open() {
    this._isOpen = true;
    this._step = 'upload';
    this._ticketData = null;
    this._error = null;
    this._results = null;
  }

  close() {
    this._isOpen = false;
  }

  async _handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      await this._processFile(file);
    }
  }

  _handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  }

  _handleDragLeave(e) {
    e.currentTarget.classList.remove('dragover');
  }

  async _handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      await this._processFile(file);
    }
  }

  async _convertPdfToImage(file) {
    const pdfjs = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const scale = 2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    });
  }

  async _processFile(file) {
    let imageFile = file;

    if (file.type === 'application/pdf') {
      this._step = 'processing';
      this._error = null;
      try {
        imageFile = await this._convertPdfToImage(file);
      } catch (error) {
        console.error('Error converting PDF:', error);
        this._error = 'Error al convertir el PDF';
        this._step = 'upload';
        return;
      }
    }

    await this._processImage(imageFile);
  }

  async _processImage(file) {
    this._step = 'processing';
    this._error = null;

    try {
      const groupId = getCurrentGroupId();
      if (!groupId) {
        throw new Error('No hay grupo seleccionado');
      }

      const result = await processTicket({
        imageFile: file,
        groupId,
        listId: this.listId,
        userId: this.userId
      });

      if (!result.success) {
        throw new Error(result.error || 'Error procesando ticket');
      }

      const data = result.data;
      if (result.listItemCount === 0) {
        data.items = data.items.map(item => ({ ...item, status: 'new' }));
      }

      this._ticketData = data;
      this._step = 'review';
    } catch (error) {
      console.error('Error processing ticket:', error);
      this._error = error.message || 'Error al procesar el ticket';
      this._step = 'upload';
    }
  }

  _toggleItemStatus(index) {
    const items = [...this._ticketData.items];
    const item = items[index];

    if (item.status === 'matched' || item.status === 'unmatched') {
      item.status = 'new';
      item.matchedListItemId = null;
      item.matchedListItemName = null;
    } else if (item.status === 'new') {
      item.status = 'ignored';
    } else {
      if (item.matchConfidence >= 0.4) {
        item.status = 'matched';
      } else {
        item.status = 'unmatched';
      }
    }

    this._ticketData = { ...this._ticketData, items };
  }

  _handleMatchChange(index, listItemId) {
    const items = [...this._ticketData.items];
    const item = items[index];

    if (listItemId === '') {
      item.status = 'new';
      item.matchedListItemId = null;
      item.matchedListItemName = null;
    } else {
      const listItem = this.listItems.find(li => li.id === listItemId);
      item.status = 'matched';
      item.matchedListItemId = listItemId;
      item.matchedListItemName = listItem?.name || '';
    }

    this._ticketData = { ...this._ticketData, items };
  }

  async _applyTicket() {
    this._step = 'applying';

    try {
      const results = await applyTicketToList({
        userId: this.userId,
        listId: this.listId,
        ticketItems: this._ticketData.items,
        listItems: this.listItems,
        ticketMeta: {
          store: this._ticketData.store,
          date: this._ticketData.date,
          total: this._ticketData.total
        }
      });

      this._results = results;
      this._step = 'done';

      this.dispatchEvent(new CustomEvent('ticket-applied', {
        detail: { results, ticketData: this._ticketData },
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      console.error('Error applying ticket:', error);
      this._error = error.message || 'Error al aplicar el ticket';
      this._step = 'review';
    }
  }

  _renderUploadStep() {
    return html`
      <div class="modal-body">
        ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        <div
          class="upload-zone"
          @click=${() => this.shadowRoot.getElementById('file-input').click()}
          @dragover=${this._handleDragOver}
          @dragleave=${this._handleDragLeave}
          @drop=${this._handleDrop}
        >
          <div class="upload-icon">📷</div>
          <div class="upload-text">Haz clic o arrastra una foto o PDF del ticket</div>
          <div class="upload-hint">JPG, PNG, PDF</div>
        </div>
        <input type="file" id="file-input" class="hidden-input" accept="image/*,application/pdf" capture="environment" @change=${this._handleFileSelect} />
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click=${this.close}>Cancelar</button>
      </div>
    `;
  }

  _renderProcessingStep() {
    return html`
      <div class="modal-body">
        <div class="processing">
          <div class="spinner"></div>
          <div class="processing-text">Analizando ticket...</div>
          <div class="processing-hint">Esto puede tardar unos segundos</div>
        </div>
      </div>
    `;
  }

  _renderReviewStep() {
    const data = this._ticketData;
    const activeItems = data.items.filter(i => i.status !== 'ignored');

    return html`
      <div class="modal-body">
        ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        <div class="ticket-summary">
          ${data.store ? html`<div class="summary-row"><span class="summary-label">Tienda</span><span class="summary-value">${data.store}</span></div>` : ''}
          ${data.date ? html`<div class="summary-row"><span class="summary-label">Fecha</span><span class="summary-value">${data.date}</span></div>` : ''}
          <div class="summary-row"><span class="summary-label">Total</span><span class="summary-value">${data.total?.toFixed(2) || '?'} €</span></div>
        </div>
        <div class="items-header"><h3>Productos detectados (${activeItems.length})</h3></div>
        <div class="ticket-items">
          ${data.items.map((item, index) => this._renderTicketItem(item, index))}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click=${() => { this._step = 'upload'; }}>Volver</button>
        <button class="btn btn-primary" @click=${this._applyTicket} ?disabled=${activeItems.length === 0}>
          Aplicar ${activeItems.length} productos
        </button>
      </div>
    `;
  }

  _renderTicketItem(item, index) {
    const statusIcons = { matched: '✓', unmatched: '?', new: '+', ignored: '✕' };
    return html`
      <div class="ticket-item">
        <div class="item-status status-${item.status}">${statusIcons[item.status]}</div>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          ${item.status === 'matched' ? html`<div class="item-match">→ <span class="item-match-name">${item.matchedListItemName}</span></div>` : ''}
          ${item.status === 'new' ? html`<div class="item-match">Se añadirá como nuevo</div>` : ''}
          ${item.status === 'unmatched' && this.listItems.length > 0 ? html`
            <div class="match-selector">
              <select @change=${(e) => this._handleMatchChange(index, e.target.value)}>
                <option value="">Añadir como nuevo</option>
                ${this.listItems.map(li => html`<option value="${li.id}">${li.name}</option>`)}
              </select>
            </div>
          ` : ''}
        </div>
        <div class="item-price">${item.totalPrice?.toFixed(2) || item.unitPrice?.toFixed(2) || '?'} €</div>
        <div class="item-actions">
          <button class="item-action-btn" @click=${() => this._toggleItemStatus(index)} title="${item.status === 'ignored' ? 'Incluir' : 'Excluir'}">
            ${item.status === 'ignored' ? '↩' : '🗑'}
          </button>
        </div>
      </div>
    `;
  }

  _renderApplyingStep() {
    return html`
      <div class="modal-body">
        <div class="processing">
          <div class="spinner"></div>
          <div class="processing-text">Aplicando cambios...</div>
        </div>
      </div>
    `;
  }

  _renderDoneStep() {
    const r = this._results;
    return html`
      <div class="modal-body">
        <div class="done">
          <div class="done-icon">✅</div>
          <div class="done-title">Ticket procesado</div>
          <div class="done-stats">
            ${r.updated > 0 ? html`<div>${r.updated} productos actualizados</div>` : ''}
            ${r.created > 0 ? html`<div>${r.created} productos añadidos</div>` : ''}
            ${r.ignored > 0 ? html`<div>${r.ignored} productos ignorados</div>` : ''}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" @click=${this.close}>Cerrar</button>
      </div>
    `;
  }

  render() {
    return html`
      <button class="scan-button" @click=${this.open}>📷 Escanear ticket</button>
      ${this._isOpen ? html`
        <div class="modal-backdrop" @click=${(e) => e.target === e.currentTarget && this.close()}>
          <div class="modal">
            <div class="modal-header">
              <h2>
                ${this._step === 'upload' ? 'Escanear ticket' : ''}
                ${this._step === 'processing' ? 'Procesando...' : ''}
                ${this._step === 'review' ? 'Revisar productos' : ''}
                ${this._step === 'applying' ? 'Aplicando...' : ''}
                ${this._step === 'done' ? 'Completado' : ''}
              </h2>
              <button class="close-btn" @click=${this.close}>×</button>
            </div>
            ${this._step === 'upload' ? this._renderUploadStep() : ''}
            ${this._step === 'processing' ? this._renderProcessingStep() : ''}
            ${this._step === 'review' ? this._renderReviewStep() : ''}
            ${this._step === 'applying' ? this._renderApplyingStep() : ''}
            ${this._step === 'done' ? this._renderDoneStep() : ''}
          </div>
        </div>
      ` : ''}
    `;
  }
}

customElements.define('hc-ticket-scanner', HcTicketScanner);

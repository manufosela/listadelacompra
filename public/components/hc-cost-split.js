/**
 * Componente de reparto de costes para listas compartidas
 * Gestiona porcentajes, cálculo de costes y deudas entre miembros
 */

import { LitElement, html, css } from '/js/vendor/lit.bundle.js';

export class HcCostSplit extends LitElement {
  static properties = {
    items: { type: Array },
    members: { type: Array },
    listId: { type: String, attribute: 'list-id' },
    splitConfig: { type: Object },
    // Estado interno
    _isOpen: { type: Boolean, state: true },
    _editingPercentages: { type: Boolean, state: true },
    _tempPercentages: { type: Object, state: true },
    _percentageError: { type: String, state: true },
  };

  constructor() {
    super();
    this.items = [];
    this.members = [];
    this.splitConfig = null;
    this._isOpen = false;
    this._editingPercentages = false;
    this._tempPercentages = {};
    this._percentageError = '';
  }

  // Porcentajes actuales (guardados o calculados por defecto)
  get _percentages() {
    if (this.splitConfig?.percentages) {
      return this.splitConfig.percentages;
    }
    // Por defecto: reparto equitativo
    const pct = {};
    const n = this.members.length;
    if (n === 0) return pct;
    const equal = Math.round((100 / n) * 100) / 100;
    this.members.forEach(m => { pct[m.id] = equal; });
    return pct;
  }

  // Calcular totales por persona (lo que ha pagado cada uno)
  get _costData() {
    const paidByPerson = {};
    const itemsByPerson = {};
    let totalWithPrice = 0;
    let itemsWithPrice = 0;
    let itemsWithoutPrice = 0;

    this.members.forEach(m => {
      paidByPerson[m.id] = 0;
      itemsByPerson[m.id] = { matched: 0, unmatched: 0, total: 0 };
    });

    for (const item of this.items) {
      if (!item.assignedTo) continue;
      const uid = item.assignedTo;

      if (!itemsByPerson[uid]) {
        itemsByPerson[uid] = { matched: 0, unmatched: 0, total: 0 };
        paidByPerson[uid] = 0;
      }

      itemsByPerson[uid].total++;

      if (item.price && item.ticketId) {
        paidByPerson[uid] += item.price;
        totalWithPrice += item.price;
        itemsWithPrice++;
        itemsByPerson[uid].matched++;
      } else {
        itemsWithoutPrice++;
        itemsByPerson[uid].unmatched++;
      }
    }

    return { paidByPerson, itemsByPerson, totalWithPrice, itemsWithPrice, itemsWithoutPrice };
  }

  // Calcular deudas simplificadas
  get _debts() {
    const { paidByPerson, totalWithPrice } = this._costData;
    const percentages = this._percentages;
    const balances = {};

    // Calcular balance de cada persona: pagado - lo que le toca
    this.members.forEach(m => {
      const paid = paidByPerson[m.id] || 0;
      const shouldPay = totalWithPrice * (percentages[m.id] || 0) / 100;
      balances[m.id] = paid - shouldPay;
    });

    // Simplificar deudas: los que tienen balance negativo deben a los que tienen positivo
    const debtors = []; // balance < 0 (deben dinero)
    const creditors = []; // balance > 0 (les deben dinero)

    this.members.forEach(m => {
      const balance = balances[m.id] || 0;
      if (balance < -0.01) {
        debtors.push({ id: m.id, name: m.displayName, amount: Math.abs(balance) });
      } else if (balance > 0.01) {
        creditors.push({ id: m.id, name: m.displayName, amount: balance });
      }
    });

    // Ordenar para minimizar transferencias
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let di = 0, ci = 0;

    while (di < debtors.length && ci < creditors.length) {
      const debtor = debtors[di];
      const creditor = creditors[ci];
      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 0.01) {
        transfers.push({
          from: debtor.name,
          fromId: debtor.id,
          to: creditor.name,
          toId: creditor.id,
          amount: Math.round(amount * 100) / 100,
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) di++;
      if (creditor.amount < 0.01) ci++;
    }

    return transfers;
  }

  open() { this._isOpen = true; }
  close() { this._isOpen = false; this._editingPercentages = false; }

  _startEditPercentages() {
    this._tempPercentages = { ...this._percentages };
    this._editingPercentages = true;
    this._percentageError = '';
  }

  _updateTempPercentage(memberId, value) {
    this._tempPercentages = { ...this._tempPercentages, [memberId]: parseFloat(value) || 0 };
    const sum = Object.values(this._tempPercentages).reduce((a, b) => a + b, 0);
    this._percentageError = Math.abs(sum - 100) > 0.1 ? `La suma es ${sum.toFixed(1)}%, debe ser 100%` : '';
  }

  _savePercentages() {
    const sum = Object.values(this._tempPercentages).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.1) return;

    this.dispatchEvent(new CustomEvent('save-split-config', {
      detail: { percentages: this._tempPercentages },
      bubbles: true,
      composed: true,
    }));
    this._editingPercentages = false;
  }

  _getMemberName(id) {
    const m = this.members.find(m => m.id === id);
    return m?.shortName || m?.displayName?.split(' ')[0] || 'Desconocido';
  }

  static styles = css`
    :host { display: block; }

    .split-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      background: var(--color-secondary, #6da58e);
      color: white;
      border: none;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .split-btn:hover { background: var(--color-secondary-dark, #558b76); }

    /* Modal */
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .panel {
      background: var(--color-bg, #fffbf8);
      border-radius: 1.25rem;
      width: 100%;
      max-width: 480px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-border, #ede4dd);
    }

    .panel-header h2 {
      font-size: 1.125rem;
      font-weight: 700;
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--color-text-secondary, #7a6e6a);
      padding: 0.25rem;
    }

    .panel-body { padding: 1.25rem 1.5rem; }

    /* Secciones */
    .section { margin-bottom: 1.5rem; }
    .section:last-child { margin-bottom: 0; }

    .section-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary, #7a6e6a);
      margin-bottom: 0.75rem;
    }

    /* Resumen rápido */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .summary-card {
      text-align: center;
      padding: 0.75rem 0.5rem;
      background: var(--color-bg-secondary, #fff5ee);
      border-radius: 0.75rem;
    }

    .summary-value {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--color-text, #3a302c);
    }

    .summary-label {
      font-size: 0.625rem;
      color: var(--color-text-secondary, #7a6e6a);
      text-transform: uppercase;
      margin-top: 0.125rem;
    }

    /* Porcentajes */
    .pct-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
    }

    .pct-name {
      flex: 1;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .pct-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-primary, #e07b5c);
      min-width: 50px;
      text-align: right;
    }

    .pct-input {
      width: 70px;
      padding: 0.375rem 0.5rem;
      border: 1px solid var(--color-border, #ede4dd);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      text-align: right;
    }

    .pct-input:focus {
      outline: none;
      border-color: var(--color-primary, #e07b5c);
    }

    .pct-error {
      font-size: 0.75rem;
      color: var(--color-danger, #d96b6b);
      margin-top: 0.5rem;
    }

    .pct-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 0.5rem;
      border: none;
      cursor: pointer;
    }

    .btn-save {
      background: var(--color-primary, #e07b5c);
      color: white;
    }

    .btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-cancel {
      background: var(--color-bg-tertiary, #ffede3);
      color: var(--color-text, #3a302c);
    }

    .btn-edit {
      background: none;
      border: 1px solid var(--color-border, #ede4dd);
      color: var(--color-text-secondary, #7a6e6a);
      padding: 0.25rem 0.625rem;
      font-size: 0.6875rem;
      border-radius: 0.375rem;
      cursor: pointer;
    }

    /* Desglose por persona */
    .person-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0;
      border-bottom: 1px solid var(--color-border, #ede4dd);
    }

    .person-row:last-child { border-bottom: none; }

    .person-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-primary, #e07b5c);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .person-info { flex: 1; min-width: 0; }

    .person-name {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .person-detail {
      font-size: 0.6875rem;
      color: var(--color-text-secondary, #7a6e6a);
    }

    .person-amount {
      text-align: right;
      flex-shrink: 0;
    }

    .person-paid {
      font-size: 0.9375rem;
      font-weight: 700;
    }

    .person-should {
      font-size: 0.6875rem;
      color: var(--color-text-secondary, #7a6e6a);
    }

    /* Deudas */
    .debt-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem;
      background: var(--color-bg-secondary, #fff5ee);
      border-radius: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .debt-card:last-child { margin-bottom: 0; }

    .debt-arrow {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .debt-info { flex: 1; }

    .debt-names {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .debt-names strong {
      font-weight: 700;
    }

    .debt-amount {
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--color-primary, #e07b5c);
      flex-shrink: 0;
    }

    .no-debts {
      text-align: center;
      padding: 1.5rem;
      color: var(--color-text-secondary, #7a6e6a);
    }

    .no-debts-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    /* Warning items sin precio */
    .warning-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      background: var(--color-warning-bg, rgba(232, 172, 78, 0.12));
      border-radius: 0.625rem;
      font-size: 0.75rem;
      color: var(--color-text, #3a302c);
      margin-bottom: 1rem;
    }

    .warning-bar span:first-child { font-size: 1rem; }
  `;

  render() {
    if (this.members.length < 2) return html``;

    const assignedItems = this.items.filter(i => i.assignedTo);
    if (assignedItems.length === 0) return html``;

    return html`
      <button class="split-btn" @click=${this.open}>💰 Reparto</button>
      ${this._isOpen ? this._renderPanel() : ''}
    `;
  }

  _renderPanel() {
    const { paidByPerson, itemsByPerson, totalWithPrice, itemsWithPrice, itemsWithoutPrice } = this._costData;
    const percentages = this._percentages;
    const debts = this._debts;

    return html`
      <div class="backdrop" @click=${(e) => { if (e.target === e.currentTarget) this.close(); }}>
        <div class="panel">
          <div class="panel-header">
            <h2>💰 Reparto de gastos</h2>
            <button class="close-btn" @click=${this.close}>×</button>
          </div>
          <div class="panel-body">

            ${itemsWithoutPrice > 0 ? html`
              <div class="warning-bar">
                <span>⚠️</span>
                <span>${itemsWithoutPrice} items sin precio. Sube tickets para completar el reparto.</span>
              </div>
            ` : ''}

            <!-- Resumen -->
            <div class="section">
              <div class="summary-cards">
                <div class="summary-card">
                  <div class="summary-value">${totalWithPrice.toFixed(2)}€</div>
                  <div class="summary-label">Total</div>
                </div>
                <div class="summary-card">
                  <div class="summary-value">${itemsWithPrice}</div>
                  <div class="summary-label">Con precio</div>
                </div>
                <div class="summary-card">
                  <div class="summary-value">${this.members.length}</div>
                  <div class="summary-label">Personas</div>
                </div>
              </div>
            </div>

            <!-- Porcentajes -->
            <div class="section">
              <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
                Porcentajes
                ${!this._editingPercentages ? html`
                  <button class="btn-edit" @click=${this._startEditPercentages}>Editar</button>
                ` : ''}
              </div>

              ${this._editingPercentages ? html`
                ${this.members.map(m => html`
                  <div class="pct-row">
                    <span class="pct-name">${m.shortName || m.displayName?.split(' ')[0]}</span>
                    <input
                      class="pct-input"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      .value=${String(this._tempPercentages[m.id] || 0)}
                      @input=${(e) => this._updateTempPercentage(m.id, e.target.value)}
                    />
                    <span>%</span>
                  </div>
                `)}
                ${this._percentageError ? html`<div class="pct-error">${this._percentageError}</div>` : ''}
                <div class="pct-actions">
                  <button class="btn-sm btn-save" @click=${this._savePercentages} ?disabled=${!!this._percentageError}>Guardar</button>
                  <button class="btn-sm btn-cancel" @click=${() => { this._editingPercentages = false; }}>Cancelar</button>
                </div>
              ` : html`
                ${this.members.map(m => html`
                  <div class="pct-row">
                    <span class="pct-name">${m.shortName || m.displayName?.split(' ')[0]}</span>
                    <span class="pct-value">${(percentages[m.id] || 0).toFixed(1)}%</span>
                  </div>
                `)}
              `}
            </div>

            <!-- Desglose por persona -->
            <div class="section">
              <div class="section-title">Desglose por persona</div>
              ${this.members.map(m => {
                const paid = paidByPerson[m.id] || 0;
                const shouldPay = totalWithPrice * (percentages[m.id] || 0) / 100;
                const items = itemsByPerson[m.id] || { matched: 0, unmatched: 0, total: 0 };
                const initials = (m.displayName || '?').split(' ').map(w => w[0]).join('').substring(0, 2);

                return html`
                  <div class="person-row">
                    <div class="person-avatar">${initials}</div>
                    <div class="person-info">
                      <div class="person-name">${m.shortName || m.displayName?.split(' ')[0]}</div>
                      <div class="person-detail">
                        ${items.total} items${items.unmatched > 0 ? ` (${items.unmatched} sin precio)` : ''}
                      </div>
                    </div>
                    <div class="person-amount">
                      <div class="person-paid">${paid.toFixed(2)}€</div>
                      <div class="person-should">de ${shouldPay.toFixed(2)}€</div>
                    </div>
                  </div>
                `;
              })}
            </div>

            <!-- Deudas simplificadas -->
            <div class="section">
              <div class="section-title">Quién debe a quién</div>
              ${debts.length > 0 ? debts.map(d => html`
                <div class="debt-card">
                  <div class="debt-arrow">💸</div>
                  <div class="debt-info">
                    <div class="debt-names"><strong>${d.from.split(' ')[0]}</strong> → ${d.to.split(' ')[0]}</div>
                  </div>
                  <div class="debt-amount">${d.amount.toFixed(2)}€</div>
                </div>
              `) : html`
                <div class="no-debts">
                  <div class="no-debts-icon">✅</div>
                  <div>${totalWithPrice > 0 ? 'Todo cuadra, nadie debe nada' : 'Sube tickets para ver el reparto'}</div>
                </div>
              `}
            </div>

          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('hc-cost-split', HcCostSplit);

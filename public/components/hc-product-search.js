import { LitElement, html, css } from '/js/vendor/lit.bundle.js';
import { searchProducts, getMostUsedProducts } from '/js/db.js';

export class HcProductSearch extends LitElement {
  static properties = {
    groupId: { type: String, attribute: 'group-id' },
    query: { type: String, state: true },
    suggestions: { type: Array, state: true },
    recentProducts: { type: Array, state: true },
    showSuggestions: { type: Boolean, state: true },
    selectedQuantity: { type: Number, state: true },
    loading: { type: Boolean, state: true }
  };

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .search-container {
      display: flex;
      gap: 0.5rem;
    }

    .search-input-wrapper {
      flex: 1;
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 1rem;
      padding-left: 2.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      transition: all 0.15s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
    }

    .quantity-input {
      width: 80px;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      text-align: center;
    }

    .add-btn {
      padding: 0.75rem 1.5rem;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .add-btn:hover {
      background: #1d4ed8;
    }

    .add-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }

    .suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 0.25rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      max-height: 300px;
      overflow-y: auto;
      z-index: 100;
    }

    .suggestions-header {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .suggestion-item:hover {
      background: #f8fafc;
    }

    .suggestion-icon {
      font-size: 1.25rem;
    }

    .suggestion-info {
      flex: 1;
    }

    .suggestion-name {
      font-weight: 500;
    }

    .suggestion-meta {
      font-size: 0.75rem;
      color: #64748b;
    }

    .new-product {
      border-top: 1px solid #e2e8f0;
      color: #2563eb;
    }

    .new-product .suggestion-name {
      color: #2563eb;
    }
  `;

  constructor() {
    super();
    this.query = '';
    this.suggestions = [];
    this.recentProducts = [];
    this.showSuggestions = false;
    this.selectedQuantity = 1;
    this.loading = false;
    this._debounceTimer = null;
  }

  async connectedCallback() {
    super.connectedCallback();
    await this._loadRecentProducts();

    this._handleClickOutside = (e) => {
      if (!this.contains(e.target)) {
        this.showSuggestions = false;
      }
    };
    document.addEventListener('click', this._handleClickOutside);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleClickOutside);
  }

  async _loadRecentProducts() {
    if (!this.groupId) return;

    try {
      this.recentProducts = await getMostUsedProducts(this.groupId, 5);
    } catch (error) {
      console.error('Error loading recent products:', error);
    }
  }

  _handleInput(e) {
    this.query = e.target.value;
    this.showSuggestions = true;

    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._search(), 200);
  }

  async _search() {
    if (!this.query.trim() || !this.groupId) {
      this.suggestions = [];
      return;
    }

    this.loading = true;
    try {
      this.suggestions = await searchProducts(this.groupId, this.query);
    } catch (error) {
      console.error('Error searching products:', error);
    }
    this.loading = false;
  }

  _handleFocus() {
    this.showSuggestions = true;
  }

  _selectProduct(product) {
    this.dispatchEvent(new CustomEvent('product-selected', {
      detail: {
        product: {
          ...product,
          quantity: this.selectedQuantity
        }
      },
      bubbles: true,
      composed: true
    }));

    this.query = '';
    this.selectedQuantity = 1;
    this.showSuggestions = false;
    this.suggestions = [];
  }

  _addNewProduct() {
    if (!this.query.trim()) return;

    this._selectProduct({
      name: this.query.trim(),
      category: 'otros',
      unit: 'unidad'
    });
  }

  _handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.suggestions.length > 0) {
        this._selectProduct(this.suggestions[0]);
      } else if (this.query.trim()) {
        this._addNewProduct();
      }
    }
  }

  _getCategoryIcon(category) {
    const icons = {
      'frutas': '🍎',
      'verduras': '🥬',
      'carnes': '🥩',
      'pescados': '🐟',
      'lacteos': '🥛',
      'panaderia': '🍞',
      'bebidas': '🥤',
      'limpieza': '🧹',
      'higiene': '🧴',
      'congelados': '❄️',
      'otros': '📦'
    };
    return icons[category] || '📦';
  }

  render() {
    const showRecent = this.showSuggestions && !this.query && this.recentProducts.length > 0;
    const showResults = this.showSuggestions && this.query;

    return html`
      <div class="search-container">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Buscar o añadir producto..."
            .value=${this.query}
            @input=${this._handleInput}
            @focus=${this._handleFocus}
            @keydown=${this._handleKeyDown}
          />

          ${showRecent ? html`
            <div class="suggestions">
              <div class="suggestions-header">Productos frecuentes</div>
              ${this.recentProducts.map(product => html`
                <div class="suggestion-item" @click=${() => this._selectProduct(product)}>
                  <span class="suggestion-icon">${this._getCategoryIcon(product.category)}</span>
                  <div class="suggestion-info">
                    <div class="suggestion-name">${product.name}</div>
                    <div class="suggestion-meta">${product.category}</div>
                  </div>
                </div>
              `)}
            </div>
          ` : ''}

          ${showResults ? html`
            <div class="suggestions">
              ${this.suggestions.length > 0 ? html`
                <div class="suggestions-header">Productos</div>
                ${this.suggestions.map(product => html`
                  <div class="suggestion-item" @click=${() => this._selectProduct(product)}>
                    <span class="suggestion-icon">${this._getCategoryIcon(product.category)}</span>
                    <div class="suggestion-info">
                      <div class="suggestion-name">${product.name}</div>
                      <div class="suggestion-meta">
                        ${product.brand ? `${product.brand} · ` : ''}${product.category}
                      </div>
                    </div>
                  </div>
                `)}
              ` : ''}

              <div class="suggestion-item new-product" @click=${this._addNewProduct}>
                <span class="suggestion-icon">➕</span>
                <div class="suggestion-info">
                  <div class="suggestion-name">Añadir "${this.query}"</div>
                  <div class="suggestion-meta">Crear nuevo producto</div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <input
          type="number"
          class="quantity-input"
          min="1"
          .value=${this.selectedQuantity}
          @change=${(e) => this.selectedQuantity = parseInt(e.target.value) || 1}
        />

        <button
          class="add-btn"
          ?disabled=${!this.query.trim()}
          @click=${this._addNewProduct}
        >
          Añadir
        </button>
      </div>
    `;
  }
}

customElements.define('hc-product-search', HcProductSearch);

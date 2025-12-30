import { LitElement, html, css } from '/js/vendor/lit.bundle.js';
import { getCurrentGroupId } from '/js/group.js';
import { db } from '/js/firebase-config.js';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import './hc-price-chart.js';

export class HcStatsDashboard extends LitElement {
  static properties = {
    monthlyData: { state: true },
    storeData: { state: true },
    loading: { state: true }
  };

  static styles = css`
    :host {
      display: block;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .stat-card {
      background: white;
      border-radius: 0.75rem;
      padding: 1.5rem;
      border: 1px solid #e2e8f0;
    }

    .stat-card h3 {
      margin-bottom: 1rem;
      font-size: 1rem;
      color: #64748b;
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .store-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .store-item:last-child {
      border-bottom: none;
    }

    .store-name {
      font-weight: 500;
    }

    .store-amount {
      color: #2563eb;
      font-weight: 500;
    }

    .store-count {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: #64748b;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: #94a3b8;
    }
  `;

  constructor() {
    super();
    this.monthlyData = [];
    this.storeData = [];
    this.loading = true;
  }

  async connectedCallback() {
    super.connectedCallback();
    await this._loadData();
  }

  async _loadData() {
    this.loading = true;
    const groupId = getCurrentGroupId();

    if (!groupId) {
      this.loading = false;
      return;
    }

    try {
      // Obtener compras de los últimos 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const purchasesRef = collection(db, 'groups', groupId, 'purchases');
      const q = query(
        purchasesRef,
        where('createdAt', '>=', Timestamp.fromDate(sixMonthsAgo)),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(q);

      // Procesar datos mensuales
      const monthlyMap = {};
      const storeMap = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate?.() || new Date();
        const amount = data.totalAmount || 0;
        const store = data.store || 'Desconocida';

        // Agrupar por mes
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = 0;
        }
        monthlyMap[monthKey] += amount;

        // Agrupar por tienda
        if (!storeMap[store]) {
          storeMap[store] = { total: 0, count: 0 };
        }
        storeMap[store].total += amount;
        storeMap[store].count += 1;
      });

      // Formatear datos mensuales
      this.monthlyData = Object.entries(monthlyMap).map(([month, total]) => ({
        label: month.split('-')[1],
        value: total
      }));

      // Formatear datos por tienda
      this.storeData = Object.entries(storeMap)
        .map(([store, data]) => ({
          store,
          total: data.total,
          count: data.count
        }))
        .sort((a, b) => b.total - a.total);

    } catch (error) {
      console.error('Error loading stats:', error);
    }

    this.loading = false;
  }

  get _totalSpent() {
    return this.monthlyData.reduce((sum, m) => sum + (m.value || 0), 0);
  }

  get _avgMonthly() {
    if (this.monthlyData.length === 0) return 0;
    return this._totalSpent / this.monthlyData.length;
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Cargando estadísticas...</div>`;
    }

    if (!getCurrentGroupId()) {
      return html`<div class="empty-state">Configura un grupo para ver estadísticas.</div>`;
    }

    if (this.monthlyData.length === 0) {
      return html`
        <div class="empty-state">
          <p>No hay datos de compras todavía.</p>
          <p>Escanea tickets para ver tus estadísticas.</p>
        </div>
      `;
    }

    return html`
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Gasto Total (6 meses)</h3>
          <div class="stat-value">${this._totalSpent.toFixed(2)}€</div>
          <div class="stat-label">${this.monthlyData.length} meses con compras registradas</div>
        </div>

        <div class="stat-card">
          <h3>Promedio Mensual</h3>
          <div class="stat-value">${this._avgMonthly.toFixed(2)}€</div>
          <div class="stat-label">Basado en tus compras recientes</div>
        </div>

        <div class="stat-card">
          <h3>Evolución de Gastos</h3>
          <hc-price-chart .data=${this.monthlyData}></hc-price-chart>
        </div>

        <div class="stat-card">
          <h3>Gasto por Tienda</h3>
          ${this.storeData.length > 0 ? this.storeData.slice(0, 5).map(s => html`
            <div class="store-item">
              <div>
                <div class="store-name">${s.store}</div>
                <div class="store-count">${s.count} compras</div>
              </div>
              <span class="store-amount">${s.total.toFixed(2)}€</span>
            </div>
          `) : html`<p class="empty-state">Sin datos</p>`}
        </div>
      </div>
    `;
  }
}

customElements.define('hc-stats-dashboard', HcStatsDashboard);

# Fase 7: Estadísticas y Precios Históricos

## Objetivo

Implementar dashboard de estadísticas con evolución de precios, gastos por tienda/categoría y comparativas.

---

## Paso 7.1: Stats Service

### Añadir a `public/js/db.js`

```javascript
// ============================================
// ESTADÍSTICAS
// ============================================

/**
 * Obtiene historial de precios de un producto
 */
export async function getPriceHistory(householdId, productId, limit = 50) {
  const entriesRef = collection(db, 'households', householdId, 'priceHistory', productId, 'entries');
  const q = query(entriesRef, orderBy('date', 'desc'), limit(limit));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date?.toDate()
  }));
}

/**
 * Calcula tendencia de precio (subiendo/bajando/estable)
 */
export async function getPriceTrend(householdId, productId) {
  const history = await getPriceHistory(householdId, productId, 10);
  if (history.length < 2) return 'stable';
  
  const recent = history.slice(0, 3).reduce((sum, h) => sum + h.price, 0) / 3;
  const older = history.slice(-3).reduce((sum, h) => sum + h.price, 0) / 3;
  
  const change = ((recent - older) / older) * 100;
  
  if (change > 5) return 'rising';
  if (change < -5) return 'falling';
  return 'stable';
}

/**
 * Compara precios entre tiendas para un producto
 */
export async function compareStorePrices(householdId, productId) {
  const history = await getPriceHistory(householdId, productId, 100);
  
  const storeMap = {};
  history.forEach(entry => {
    if (!storeMap[entry.store]) {
      storeMap[entry.store] = { prices: [], latest: null };
    }
    storeMap[entry.store].prices.push(entry.price);
    if (!storeMap[entry.store].latest || entry.date > storeMap[entry.store].latest.date) {
      storeMap[entry.store].latest = entry;
    }
  });
  
  return Object.entries(storeMap).map(([store, data]) => ({
    store,
    avgPrice: data.prices.reduce((a, b) => a + b, 0) / data.prices.length,
    latestPrice: data.latest.price,
    lastDate: data.latest.date
  })).sort((a, b) => a.avgPrice - b.avgPrice);
}

/**
 * Obtiene gasto mensual
 */
export async function getMonthlySpending(householdId, months = 6) {
  const purchasesRef = collection(db, 'households', householdId, 'purchases');
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  const q = query(purchasesRef, where('date', '>=', Timestamp.fromDate(startDate)), orderBy('date', 'asc'));
  const snapshot = await getDocs(q);
  
  const monthlyData = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const date = data.date?.toDate();
    if (!date) return;
    
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { total: 0, count: 0 };
    }
    monthlyData[monthKey].total += data.totalAmount || 0;
    monthlyData[monthKey].count += 1;
  });
  
  return Object.entries(monthlyData).map(([month, data]) => ({
    month,
    total: data.total,
    count: data.count
  }));
}

/**
 * Obtiene gasto por tienda
 */
export async function getSpendingByStore(householdId, months = 3) {
  const purchasesRef = collection(db, 'households', householdId, 'purchases');
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  const q = query(purchasesRef, where('date', '>=', Timestamp.fromDate(startDate)));
  const snapshot = await getDocs(q);
  
  const storeData = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const store = data.store || 'Desconocida';
    if (!storeData[store]) {
      storeData[store] = { total: 0, count: 0 };
    }
    storeData[store].total += data.totalAmount || 0;
    storeData[store].count += 1;
  });
  
  return Object.entries(storeData)
    .map(([store, data]) => ({ store, ...data }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Obtiene productos con mayor subida de precio
 */
export async function getInflationReport(householdId) {
  const products = await getAllProducts(householdId);
  const inflationData = [];
  
  for (const product of products.slice(0, 20)) { // Limitar para rendimiento
    const trend = await getPriceTrend(householdId, product.id);
    if (trend === 'rising') {
      const history = await getPriceHistory(householdId, product.id, 10);
      if (history.length >= 2) {
        const oldPrice = history[history.length - 1].price;
        const newPrice = history[0].price;
        const change = ((newPrice - oldPrice) / oldPrice) * 100;
        
        inflationData.push({
          product,
          oldPrice,
          newPrice,
          changePercent: change
        });
      }
    }
  }
  
  return inflationData.sort((a, b) => b.changePercent - a.changePercent);
}
```

---

## Paso 7.2: Componente Price Chart

### Crear `public/components/hc-price-chart.js`

```javascript
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/nickg/lit@3.1.0/lit-all.min.js';

export class HcPriceChart extends LitElement {
  static properties = {
    data: { type: Array },
    title: { type: String }
  };

  static styles = css`
    :host { display: block; }
    .chart-container { background: white; border-radius: 0.5rem; padding: 1rem; }
    .chart-title { font-weight: 600; margin-bottom: 1rem; }
    .chart { height: 200px; display: flex; align-items: flex-end; gap: 4px; }
    .bar { background: #2563eb; border-radius: 4px 4px 0 0; min-width: 30px; transition: height 0.3s; }
    .bar:hover { background: #1d4ed8; }
    .labels { display: flex; gap: 4px; margin-top: 0.5rem; }
    .label { min-width: 30px; text-align: center; font-size: 0.75rem; color: #64748b; }
  `;

  render() {
    if (!this.data?.length) return html`<p>Sin datos</p>`;
    
    const max = Math.max(...this.data.map(d => d.value));
    
    return html`
      <div class="chart-container">
        <div class="chart-title">${this.title}</div>
        <div class="chart">
          ${this.data.map(d => html`
            <div class="bar" style="height: ${(d.value / max) * 100}%" title="${d.label}: ${d.value.toFixed(2)}€"></div>
          `)}
        </div>
        <div class="labels">
          ${this.data.map(d => html`<div class="label">${d.label}</div>`)}
        </div>
      </div>
    `;
  }
}

customElements.define('hc-price-chart', HcPriceChart);
```

---

## Paso 7.3: Componente Stats Dashboard

### Crear `public/components/hc-stats-dashboard.js`

```javascript
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/nickg/lit@3.1.0/lit-all.min.js';
import { getMonthlySpending, getSpendingByStore, getInflationReport } from '/js/db.js';
import { getCurrentHouseholdId } from '/js/household.js';
import './hc-price-chart.js';

export class HcStatsDashboard extends LitElement {
  static properties = {
    monthlyData: { state: true },
    storeData: { state: true },
    inflationData: { state: true },
    loading: { state: true }
  };

  static styles = css`
    :host { display: block; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
    .stat-card { background: white; border-radius: 0.5rem; padding: 1.5rem; border: 1px solid #e2e8f0; }
    .stat-card h3 { margin-bottom: 1rem; font-size: 1rem; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #2563eb; }
    .stat-label { color: #64748b; font-size: 0.875rem; }
    .store-item { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
    .inflation-item { display: flex; justify-content: space-between; padding: 0.5rem 0; }
    .inflation-change { color: #dc2626; font-weight: 500; }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await this._loadData();
  }

  async _loadData() {
    this.loading = true;
    const householdId = getCurrentHouseholdId();
    
    try {
      this.monthlyData = await getMonthlySpending(householdId, 6);
      this.storeData = await getSpendingByStore(householdId, 3);
      this.inflationData = await getInflationReport(householdId);
    } catch (e) {
      console.error('Error loading stats:', e);
    }
    
    this.loading = false;
  }

  get _totalSpent() {
    return this.monthlyData?.reduce((sum, m) => sum + m.total, 0) || 0;
  }

  get _chartData() {
    return this.monthlyData?.map(m => ({
      label: m.month.split('-')[1],
      value: m.total
    })) || [];
  }

  render() {
    if (this.loading) return html`<p>Cargando estadísticas...</p>`;

    return html`
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Gasto Total (6 meses)</h3>
          <div class="stat-value">${this._totalSpent.toFixed(2)}€</div>
          <div class="stat-label">${this.monthlyData?.length || 0} meses con compras</div>
        </div>
        
        <div class="stat-card">
          <h3>Gasto Mensual</h3>
          <hc-price-chart .data=${this._chartData}></hc-price-chart>
        </div>
        
        <div class="stat-card">
          <h3>Gasto por Tienda</h3>
          ${this.storeData?.slice(0, 5).map(s => html`
            <div class="store-item">
              <span>${s.store}</span>
              <span>${s.total.toFixed(2)}€</span>
            </div>
          `)}
        </div>
        
        <div class="stat-card">
          <h3>⚠️ Productos con Mayor Subida</h3>
          ${this.inflationData?.length ? this.inflationData.slice(0, 5).map(i => html`
            <div class="inflation-item">
              <span>${i.product.name}</span>
              <span class="inflation-change">+${i.changePercent.toFixed(1)}%</span>
            </div>
          `) : html`<p>Sin datos suficientes</p>`}
        </div>
      </div>
    `;
  }
}

customElements.define('hc-stats-dashboard', HcStatsDashboard);
```

---

## Paso 7.4: Página de Estadísticas

### Crear `src/pages/app/stats/index.astro`

```astro
---
import AppLayout from '../../../layouts/AppLayout.astro';
---

<AppLayout title="Estadísticas">
  <h1>Estadísticas</h1>
  <p style="color: var(--color-text-secondary); margin-bottom: var(--space-xl);">
    Analiza tus gastos y evolución de precios.
  </p>
  
  <hc-stats-dashboard></hc-stats-dashboard>
</AppLayout>

<script type="module">
  import '/components/hc-stats-dashboard.js';
</script>
```

---

## ✅ Checklist Fase 7

- [ ] Stats service (monthly, by store, inflation)
- [ ] Price history queries
- [ ] Price trend detection
- [ ] Store comparison
- [ ] hc-price-chart component
- [ ] hc-stats-dashboard component
- [ ] Stats page

---

## 🔗 Siguiente: [08-componentes-astro.md](./08-componentes-astro.md)

import { LitElement, html, css } from '/js/vendor/lit.bundle.js';

export class HcPriceChart extends LitElement {
  static properties = {
    data: { type: Array },
    title: { type: String }
  };

  static styles = css`
    :host {
      display: block;
    }

    .chart-container {
      background: white;
      border-radius: 0.5rem;
    }

    .chart-title {
      font-weight: 600;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      color: #64748b;
    }

    .chart {
      height: 200px;
      display: flex;
      align-items: flex-end;
      gap: 4px;
      padding: 0 0.5rem;
    }

    .bar-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .bar {
      width: 100%;
      background: linear-gradient(to top, #2563eb, #3b82f6);
      border-radius: 4px 4px 0 0;
      transition: all 0.3s ease;
      cursor: pointer;
      min-height: 4px;
    }

    .bar:hover {
      background: linear-gradient(to top, #1d4ed8, #2563eb);
      transform: scaleY(1.02);
    }

    .bar-value {
      font-size: 0.625rem;
      color: #64748b;
      margin-bottom: 0.25rem;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .bar-container:hover .bar-value {
      opacity: 1;
    }

    .label {
      font-size: 0.625rem;
      color: #94a3b8;
      margin-top: 0.5rem;
      text-align: center;
    }

    .no-data {
      text-align: center;
      padding: 2rem;
      color: #94a3b8;
    }
  `;

  render() {
    if (!this.data?.length) {
      return html`<div class="no-data">Sin datos disponibles</div>`;
    }

    const max = Math.max(...this.data.map(d => d.value || 0));
    const chartHeight = 180;

    return html`
      <div class="chart-container">
        ${this.title ? html`<div class="chart-title">${this.title}</div>` : ''}
        <div class="chart">
          ${this.data.map(d => {
            const height = max > 0 ? ((d.value || 0) / max) * chartHeight : 0;
            return html`
              <div class="bar-container">
                <div class="bar-value">${(d.value || 0).toFixed(0)}€</div>
                <div
                  class="bar"
                  style="height: ${height}px"
                  title="${d.label}: ${(d.value || 0).toFixed(2)}€"
                ></div>
                <div class="label">${d.label}</div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }
}

if (!customElements.get('hc-price-chart')) {
  customElements.define('hc-price-chart', HcPriceChart);
}

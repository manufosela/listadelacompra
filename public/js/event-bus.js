/**
 * Event Bus para comunicación entre componentes Lit
 * Los componentes se registran al crearse y se desregistran al destruirse.
 * Si un evento se emite antes de que el receptor esté listo, se encola.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
    this.readyComponents = new Set();
    this.pendingRequests = [];
  }

  /**
   * Registra un componente como listo para recibir eventos
   * @param {string} componentId - ID único del componente
   */
  registerComponent(componentId) {
    this.readyComponents.add(componentId);
    this.emit('component:ready', { componentId });
    this._flushPendingFor(componentId);
  }

  /**
   * Desregistra un componente
   * @param {string} componentId - ID único del componente
   */
  unregisterComponent(componentId) {
    this.readyComponents.delete(componentId);
  }

  /**
   * Verifica si un componente está listo
   * @param {string} componentId - ID único del componente
   * @returns {boolean}
   */
  isReady(componentId) {
    return this.readyComponents.has(componentId);
  }

  /**
   * Suscribe un callback a un evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función a ejecutar
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Desuscribe un callback de un evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función a remover
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    }
  }

  /**
   * Emite un evento a todos los suscriptores
   * @param {string} event - Nombre del evento
   * @param {Object} payload - Datos del evento
   */
  emit(event, payload = {}) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(payload));
  }

  /**
   * Emite un evento, encolándolo si el receptor no está listo
   * @param {string} event - Nombre del evento
   * @param {Object} payload - Datos del evento (debe incluir senderId)
   * @param {string|null} targetComponentId - ID del componente destino (opcional)
   */
  request(event, payload, targetComponentId = null) {
    if (targetComponentId && !this.isReady(targetComponentId)) {
      this.pendingRequests.push({ event, payload, targetComponentId });
      return;
    }
    this.emit(event, payload);
  }

  /**
   * Procesa eventos encolados para un componente recién registrado
   * @param {string} componentId - ID del componente
   * @private
   */
  _flushPendingFor(componentId) {
    const pending = this.pendingRequests.filter(r => r.targetComponentId === componentId);
    this.pendingRequests = this.pendingRequests.filter(r => r.targetComponentId !== componentId);
    pending.forEach(r => this.emit(r.event, r.payload));
  }

  /**
   * Limpia todos los listeners y componentes (para tests)
   */
  reset() {
    this.listeners.clear();
    this.readyComponents.clear();
    this.pendingRequests = [];
  }
}

// Singleton exportado
export const eventBus = new EventBus();

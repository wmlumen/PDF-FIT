import { logger } from './logger.js';
// layerGuard.js
// Centraliza control de capas para evitar duplicaciones en Leaflet
// Uso: inicializar con map, luego añadir capas con addIfAbsent(id, layer)

class LayerGuardClass {
  constructor() {
    this.map = null;
    this.layers = new Map(); // id -> layer
  }

  init(map) {
    this.map = map;
  }

  addIfAbsent(id, layer) {
    if (!id || !layer) return layer;
    if (this.layers.has(id)) {
      const existing = this.layers.get(id);
      if (this.map && existing && !this.map.hasLayer(existing)) {
        this.map.addLayer(existing);
      }
      return existing;
    }
    this.layers.set(id, layer);
    if (this.map && layer && !this.map.hasLayer(layer)) {
      this.map.addLayer(layer);
    }
    // Harmonizar duplicados para este id en el mapa (evitar que se cree más de una capa con el mismo id)
    try {
      if (this.map) {
        const same = [];
        this.map.eachLayer(l => {
          const lid = l?.options?.id;
          if (lid === id) same.push(l);
        });
        if (same.length > 1) {
          // dejar solo la primera, remover el resto
          for (let i = 1; i < same.length; i++) {
            if (this.map.hasLayer(same[i])) this.map.removeLayer(same[i]);
          }
          logger.debug(`Harmony: eliminado ${same.length - 1} duplicado(s) de layer id=${id}`);
        }
      }
    } catch (e) {
      // evitar que cualquier fallo bloquee la carga
      logger.warn('LayerGuard: fallo al armonizar duplicados', e);
    }
    return layer;
  }

  has(id) {
    return this.layers.has(id);
  }

  get(id) {
    return this.layers.get(id);
  }

  remove(id) {
    const layer = this.layers.get(id);
    if (layer && this.map && this.map.hasLayer(layer)) {
      this.map.removeLayer(layer);
    }
    this.layers.delete(id);
  }

  clear() {
    if (this.map) {
      for (const layer of this.layers.values()) {
        if (layer && this.map.hasLayer(layer)) this.map.removeLayer(layer);
      }
    }
    this.layers.clear();
  }

  // Helpers for debugging/inspection
  listIds() {
    return Array.from(this.layers.keys());
  }
}

export const LayerGuard = new LayerGuardClass();
export default LayerGuard;

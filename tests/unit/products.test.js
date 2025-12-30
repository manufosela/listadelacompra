import { describe, it, expect } from 'vitest';

describe('Product Categories', () => {
  const PRODUCT_CATEGORIES = [
    { id: 'frutas', name: 'Frutas', icon: '🍎' },
    { id: 'verduras', name: 'Verduras', icon: '🥬' },
    { id: 'carnes', name: 'Carnes', icon: '🥩' },
    { id: 'pescados', name: 'Pescados', icon: '🐟' },
    { id: 'lacteos', name: 'Lácteos', icon: '🥛' },
    { id: 'panaderia', name: 'Panadería', icon: '🍞' },
    { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
    { id: 'limpieza', name: 'Limpieza', icon: '🧹' },
    { id: 'higiene', name: 'Higiene', icon: '🧴' },
    { id: 'congelados', name: 'Congelados', icon: '❄️' },
    { id: 'despensa', name: 'Despensa', icon: '🥫' },
    { id: 'snacks', name: 'Snacks', icon: '🍿' },
    { id: 'mascotas', name: 'Mascotas', icon: '🐕' },
    { id: 'otros', name: 'Otros', icon: '📦' }
  ];

  it('should have unique IDs', () => {
    const ids = PRODUCT_CATEGORIES.map(c => c.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids).toHaveLength(uniqueIds.length);
  });

  it('should have "otros" as fallback category', () => {
    const otros = PRODUCT_CATEGORIES.find(c => c.id === 'otros');
    expect(otros).toBeDefined();
  });

  it('should have all required fields', () => {
    PRODUCT_CATEGORIES.forEach(cat => {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('icon');
    });
  });
});

describe('inferCategory', () => {
  const inferCategory = (productName) => {
    const name = productName.toLowerCase();

    const categoryKeywords = {
      'frutas': ['manzana', 'naranja', 'plátano', 'uva', 'fresa'],
      'verduras': ['lechuga', 'tomate', 'cebolla', 'zanahoria', 'pepino'],
      'carnes': ['pollo', 'ternera', 'cerdo', 'cordero', 'pavo'],
      'lacteos': ['leche', 'yogur', 'queso', 'mantequilla', 'nata'],
      'bebidas': ['agua', 'zumo', 'refresco', 'cerveza', 'vino']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => name.includes(kw))) {
        return category;
      }
    }

    return 'otros';
  };

  it('should detect fruit products', () => {
    expect(inferCategory('Manzana Golden')).toBe('frutas');
    expect(inferCategory('Naranja de zumo')).toBe('frutas');
  });

  it('should detect vegetable products', () => {
    expect(inferCategory('Tomate pera')).toBe('verduras');
    expect(inferCategory('Lechuga iceberg')).toBe('verduras');
  });

  it('should detect meat products', () => {
    expect(inferCategory('Pechuga de pollo')).toBe('carnes');
    expect(inferCategory('Filete de ternera')).toBe('carnes');
  });

  it('should detect dairy products', () => {
    expect(inferCategory('Leche entera')).toBe('lacteos');
    expect(inferCategory('Yogur natural')).toBe('lacteos');
  });

  it('should return "otros" for unknown products', () => {
    expect(inferCategory('Producto desconocido')).toBe('otros');
    expect(inferCategory('XYZ123')).toBe('otros');
  });

  it('should be case insensitive', () => {
    expect(inferCategory('MANZANA')).toBe('frutas');
    expect(inferCategory('Manzana')).toBe('frutas');
    expect(inferCategory('manzana')).toBe('frutas');
  });
});

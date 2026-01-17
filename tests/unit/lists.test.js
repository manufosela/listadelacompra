import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Shopping List Item', () => {
  const createListItem = (data) => ({
    id: data.id || `item-${Date.now()}`,
    name: data.name,
    quantity: data.quantity || 1,
    unit: data.unit || 'unidad',
    category: data.category || 'otros',
    checked: data.checked || false,
    productId: data.productId || null,
    createdAt: data.createdAt || new Date()
  });

  it('should create item with default values', () => {
    const item = createListItem({ name: 'Leche' });

    expect(item.name).toBe('Leche');
    expect(item.quantity).toBe(1);
    expect(item.unit).toBe('unidad');
    expect(item.category).toBe('otros');
    expect(item.checked).toBe(false);
  });

  it('should create item with custom values', () => {
    const item = createListItem({
      name: 'Arroz',
      quantity: 2,
      unit: 'kg',
      category: 'despensa'
    });

    expect(item.name).toBe('Arroz');
    expect(item.quantity).toBe(2);
    expect(item.unit).toBe('kg');
    expect(item.category).toBe('despensa');
  });

  it('should preserve productId when provided', () => {
    const item = createListItem({
      name: 'Leche',
      productId: 'product-123'
    });

    expect(item.productId).toBe('product-123');
  });
});

describe('List Sorting', () => {
  const sortByCategory = (items, categories) => {
    const categoryOrder = categories.reduce((acc, cat, index) => {
      acc[cat.id] = index;
      return acc;
    }, {});

    return [...items].sort((a, b) => {
      const orderA = categoryOrder[a.category] ?? 999;
      const orderB = categoryOrder[b.category] ?? 999;
      return orderA - orderB;
    });
  };

  const mockCategories = [
    { id: 'frutas', name: 'Frutas' },
    { id: 'verduras', name: 'Verduras' },
    { id: 'lacteos', name: 'Lácteos' },
    { id: 'otros', name: 'Otros' }
  ];

  const mockItems = [
    { id: '1', name: 'Leche', category: 'lacteos' },
    { id: '2', name: 'Manzana', category: 'frutas' },
    { id: '3', name: 'Tomate', category: 'verduras' },
    { id: '4', name: 'Pilas', category: 'otros' }
  ];

  it('should sort items by category order', () => {
    const sorted = sortByCategory(mockItems, mockCategories);

    expect(sorted[0].category).toBe('frutas');
    expect(sorted[1].category).toBe('verduras');
    expect(sorted[2].category).toBe('lacteos');
    expect(sorted[3].category).toBe('otros');
  });

  it('should place unknown categories at the end', () => {
    const itemsWithUnknown = [
      ...mockItems,
      { id: '5', name: 'Algo', category: 'desconocido' }
    ];
    const sorted = sortByCategory(itemsWithUnknown, mockCategories);

    expect(sorted[sorted.length - 1].category).toBe('desconocido');
  });

  it('should not mutate original array', () => {
    const original = [...mockItems];
    sortByCategory(mockItems, mockCategories);

    expect(mockItems).toEqual(original);
  });
});

describe('List Statistics', () => {
  const calculateStats = (items) => {
    const total = items.length;
    const checked = items.filter(i => i.checked).length;
    const pending = total - checked;
    const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

    return { total, checked, pending, progress };
  };

  it('should calculate empty list stats', () => {
    const stats = calculateStats([]);

    expect(stats.total).toBe(0);
    expect(stats.checked).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.progress).toBe(0);
  });

  it('should calculate partial completion', () => {
    const items = [
      { checked: true },
      { checked: true },
      { checked: false },
      { checked: false }
    ];
    const stats = calculateStats(items);

    expect(stats.total).toBe(4);
    expect(stats.checked).toBe(2);
    expect(stats.pending).toBe(2);
    expect(stats.progress).toBe(50);
  });

  it('should calculate full completion', () => {
    const items = [
      { checked: true },
      { checked: true }
    ];
    const stats = calculateStats(items);

    expect(stats.total).toBe(2);
    expect(stats.checked).toBe(2);
    expect(stats.pending).toBe(0);
    expect(stats.progress).toBe(100);
  });

  it('should round progress percentage', () => {
    const items = [
      { checked: true },
      { checked: false },
      { checked: false }
    ];
    const stats = calculateStats(items);

    expect(stats.progress).toBe(33); // 33.33... rounded
  });
});

describe('List Filters', () => {
  const filterItems = (items, filter) => {
    switch (filter) {
      case 'pending':
        return items.filter(i => !i.checked);
      case 'checked':
        return items.filter(i => i.checked);
      case 'all':
      default:
        return items;
    }
  };

  const mockItems = [
    { id: '1', name: 'Leche', checked: false },
    { id: '2', name: 'Pan', checked: true },
    { id: '3', name: 'Huevos', checked: false },
    { id: '4', name: 'Mantequilla', checked: true }
  ];

  it('should return all items with "all" filter', () => {
    const filtered = filterItems(mockItems, 'all');
    expect(filtered).toHaveLength(4);
  });

  it('should return only pending items', () => {
    const filtered = filterItems(mockItems, 'pending');
    expect(filtered).toHaveLength(2);
    expect(filtered.every(i => !i.checked)).toBe(true);
  });

  it('should return only checked items', () => {
    const filtered = filterItems(mockItems, 'checked');
    expect(filtered).toHaveLength(2);
    expect(filtered.every(i => i.checked)).toBe(true);
  });

  it('should default to all items', () => {
    const filtered = filterItems(mockItems, 'unknown');
    expect(filtered).toHaveLength(4);
  });
});

describe('Search Products', () => {
  const searchProducts = (products, query) => {
    if (!query || query.trim() === '') return products;

    const normalizedQuery = query.toLowerCase().trim();

    return products.filter(p => {
      const name = p.name.toLowerCase();
      const category = (p.category || '').toLowerCase();
      const storeTag = (p.storeTag || '').toLowerCase();

      return name.includes(normalizedQuery) ||
             category.includes(normalizedQuery) ||
             storeTag.includes(normalizedQuery);
    });
  };

  const mockProducts = [
    { id: '1', name: 'Leche entera', category: 'lacteos', storeTag: 'Mercadona' },
    { id: '2', name: 'Leche desnatada', category: 'lacteos', storeTag: 'Carrefour' },
    { id: '3', name: 'Pan integral', category: 'panaderia', storeTag: 'Mercadona' },
    { id: '4', name: 'Manzana Golden', category: 'frutas', storeTag: null }
  ];

  it('should return all products with empty query', () => {
    expect(searchProducts(mockProducts, '')).toHaveLength(4);
    expect(searchProducts(mockProducts, '   ')).toHaveLength(4);
    expect(searchProducts(mockProducts, null)).toHaveLength(4);
  });

  it('should search by product name', () => {
    const results = searchProducts(mockProducts, 'leche');
    expect(results).toHaveLength(2);
    expect(results.every(p => p.name.toLowerCase().includes('leche'))).toBe(true);
  });

  it('should search by category', () => {
    const results = searchProducts(mockProducts, 'lacteos');
    expect(results).toHaveLength(2);
  });

  it('should search by store tag', () => {
    const results = searchProducts(mockProducts, 'mercadona');
    expect(results).toHaveLength(2);
  });

  it('should be case insensitive', () => {
    expect(searchProducts(mockProducts, 'LECHE')).toHaveLength(2);
    expect(searchProducts(mockProducts, 'Leche')).toHaveLength(2);
    expect(searchProducts(mockProducts, 'lEcHe')).toHaveLength(2);
  });

  it('should handle partial matches', () => {
    expect(searchProducts(mockProducts, 'pan')).toHaveLength(1);
    expect(searchProducts(mockProducts, 'ent')).toHaveLength(1); // "entera"
  });
});

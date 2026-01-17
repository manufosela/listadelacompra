import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Product Name Normalization', () => {
  // Función de normalización igual a la de db.js
  const normalizeProductName = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  it('should convert to lowercase', () => {
    expect(normalizeProductName('MANZANA')).toBe('manzana');
    expect(normalizeProductName('Leche Entera')).toBe('leche entera');
  });

  it('should remove accents', () => {
    expect(normalizeProductName('Plátano')).toBe('platano');
    expect(normalizeProductName('Jamón Serrano')).toBe('jamon serrano');
    expect(normalizeProductName('Café')).toBe('cafe');
    expect(normalizeProductName('Güisqui')).toBe('guisqui');
  });

  it('should trim whitespace', () => {
    expect(normalizeProductName('  manzana  ')).toBe('manzana');
    expect(normalizeProductName('\tleche\n')).toBe('leche');
  });

  it('should handle empty strings', () => {
    expect(normalizeProductName('')).toBe('');
    expect(normalizeProductName('   ')).toBe('');
  });

  it('should preserve numbers', () => {
    expect(normalizeProductName('Leche 1L')).toBe('leche 1l');
    expect(normalizeProductName('Pack 6 unidades')).toBe('pack 6 unidades');
  });
});

describe('Product Duplicate Validation', () => {
  const normalizeProductName = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  const isDuplicate = (allProducts, name, category, editingId = null) => {
    const normalizedName = normalizeProductName(name);
    const categoryToCheck = category || 'otros';

    return allProducts.some(p => {
      if (editingId && p.id === editingId) return false;
      const pNormalized = p.normalizedName || normalizeProductName(p.name);
      const pCategory = p.category || 'otros';
      return pNormalized === normalizedName && pCategory === categoryToCheck;
    });
  };

  const mockProducts = [
    { id: '1', name: 'Leche', normalizedName: 'leche', category: 'lacteos' },
    { id: '2', name: 'Pan', normalizedName: 'pan', category: 'panaderia' },
    { id: '3', name: 'Manzana', normalizedName: 'manzana', category: 'frutas' }
  ];

  it('should detect duplicate by exact name and category', () => {
    expect(isDuplicate(mockProducts, 'Leche', 'lacteos')).toBe(true);
    expect(isDuplicate(mockProducts, 'Pan', 'panaderia')).toBe(true);
  });

  it('should detect duplicate ignoring case and accents', () => {
    expect(isDuplicate(mockProducts, 'LECHE', 'lacteos')).toBe(true);
    expect(isDuplicate(mockProducts, 'léche', 'lacteos')).toBe(true);
  });

  it('should not detect duplicate with different category', () => {
    expect(isDuplicate(mockProducts, 'Leche', 'bebidas')).toBe(false);
    expect(isDuplicate(mockProducts, 'Pan', 'otros')).toBe(false);
  });

  it('should not detect duplicate for new product', () => {
    expect(isDuplicate(mockProducts, 'Yogur', 'lacteos')).toBe(false);
    expect(isDuplicate(mockProducts, 'Naranja', 'frutas')).toBe(false);
  });

  it('should exclude current product when editing', () => {
    expect(isDuplicate(mockProducts, 'Leche', 'lacteos', '1')).toBe(false);
    expect(isDuplicate(mockProducts, 'Pan', 'panaderia', '2')).toBe(false);
  });

  it('should detect duplicate even when editing different product', () => {
    expect(isDuplicate(mockProducts, 'Leche', 'lacteos', '2')).toBe(true);
  });

  it('should use "otros" as default category', () => {
    const productsWithOtros = [
      ...mockProducts,
      { id: '4', name: 'Pilas', normalizedName: 'pilas', category: 'otros' }
    ];
    expect(isDuplicate(productsWithOtros, 'Pilas', null)).toBe(true);
    expect(isDuplicate(productsWithOtros, 'Pilas', '')).toBe(true);
  });
});

describe('Image File Validation', () => {
  const isValidImage = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Tipo de archivo no válido' };
    }
    if (file.size > maxSize) {
      return { valid: false, error: 'Archivo demasiado grande' };
    }
    return { valid: true };
  };

  it('should accept valid image types', () => {
    expect(isValidImage({ type: 'image/jpeg', size: 1000 }).valid).toBe(true);
    expect(isValidImage({ type: 'image/png', size: 1000 }).valid).toBe(true);
    expect(isValidImage({ type: 'image/gif', size: 1000 }).valid).toBe(true);
    expect(isValidImage({ type: 'image/webp', size: 1000 }).valid).toBe(true);
  });

  it('should reject invalid image types', () => {
    expect(isValidImage({ type: 'application/pdf', size: 1000 }).valid).toBe(false);
    expect(isValidImage({ type: 'text/plain', size: 1000 }).valid).toBe(false);
    expect(isValidImage({ type: 'image/svg+xml', size: 1000 }).valid).toBe(false);
  });

  it('should reject files larger than 2MB', () => {
    const maxSize = 2 * 1024 * 1024;
    expect(isValidImage({ type: 'image/jpeg', size: maxSize + 1 }).valid).toBe(false);
    expect(isValidImage({ type: 'image/jpeg', size: maxSize }).valid).toBe(true);
  });
});

describe('Unit Conversion', () => {
  const UNITS = [
    { id: 'unidad', name: 'unidad(es)', factor: 1 },
    { id: 'kg', name: 'kg', factor: 1 },
    { id: 'g', name: 'gramos', factor: 0.001 },
    { id: 'l', name: 'litros', factor: 1 },
    { id: 'ml', name: 'ml', factor: 0.001 },
    { id: 'pack', name: 'pack', factor: 1 },
    { id: 'docena', name: 'docena', factor: 12 }
  ];

  it('should have unique unit IDs', () => {
    const ids = UNITS.map(u => u.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids).toHaveLength(uniqueIds.length);
  });

  it('should have "unidad" as default unit', () => {
    const unidad = UNITS.find(u => u.id === 'unidad');
    expect(unidad).toBeDefined();
    expect(unidad.factor).toBe(1);
  });

  it('should have proper conversion factors', () => {
    const g = UNITS.find(u => u.id === 'g');
    const kg = UNITS.find(u => u.id === 'kg');
    expect(g.factor * 1000).toBe(kg.factor);

    const ml = UNITS.find(u => u.id === 'ml');
    const l = UNITS.find(u => u.id === 'l');
    expect(ml.factor * 1000).toBe(l.factor);
  });
});

describe('Blob URL Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:test-url'),
      revokeObjectURL: vi.fn()
    };
  });

  it('should create object URL for file', () => {
    const file = new Blob(['test'], { type: 'image/jpeg' });
    const url = URL.createObjectURL(file);

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(url).toBe('blob:test-url');
  });

  it('should revoke object URL when done', () => {
    const url = 'blob:test-url';
    URL.revokeObjectURL(url);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });
});

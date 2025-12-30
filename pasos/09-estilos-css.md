# Fase 9: Estilos CSS

## Objetivo

Implementar sistema de diseño con CSS custom properties, reset, utilidades y componentes.

---

## Paso 9.1: CSS Reset

### Crear `public/css/reset.css`

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  -moz-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  min-height: 100vh;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

input,
button,
textarea,
select {
  font: inherit;
}

p,
h1,
h2,
h3,
h4,
h5,
h6 {
  overflow-wrap: break-word;
}

a {
  color: inherit;
}

ul,
ol {
  list-style: none;
}

button {
  cursor: pointer;
}

:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## Paso 9.2: CSS Variables

### Crear `public/css/variables.css`

```css
:root {
  /* Colors - Light Mode */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #eff6ff;
  
  --color-success: #22c55e;
  --color-success-light: #dcfce7;
  
  --color-warning: #f59e0b;
  --color-warning-light: #fef3c7;
  
  --color-danger: #ef4444;
  --color-danger-light: #fef2f2;
  
  --color-text: #0f172a;
  --color-text-secondary: #64748b;
  --color-text-tertiary: #94a3b8;
  
  --color-bg: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
  
  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;
  
  /* Spacing */
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 1rem;      /* 16px */
  --space-lg: 1.5rem;    /* 24px */
  --space-xl: 2rem;      /* 32px */
  --space-2xl: 3rem;     /* 48px */
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  --font-family-mono: 'SF Mono', 'Fira Code', Consolas, monospace;
  
  --font-size-xs: 0.75rem;   /* 12px */
  --font-size-sm: 0.875rem;  /* 14px */
  --font-size-base: 1rem;    /* 16px */
  --font-size-lg: 1.125rem;  /* 18px */
  --font-size-xl: 1.25rem;   /* 20px */
  --font-size-2xl: 1.5rem;   /* 24px */
  --font-size-3xl: 2rem;     /* 32px */
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* Borders */
  --radius-sm: 0.25rem;  /* 4px */
  --radius-md: 0.5rem;   /* 8px */
  --radius-lg: 0.75rem;  /* 12px */
  --radius-xl: 1rem;     /* 16px */
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
  
  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;
  
  /* Z-index */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal: 300;
  --z-toast: 400;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #f8fafc;
    --color-text-secondary: #94a3b8;
    --color-text-tertiary: #64748b;
    
    --color-bg: #0f172a;
    --color-bg-secondary: #1e293b;
    --color-bg-tertiary: #334155;
    
    --color-border: #334155;
    --color-border-strong: #475569;
    
    --color-primary-light: #1e3a5f;
    --color-success-light: #14532d;
    --color-warning-light: #713f12;
    --color-danger-light: #7f1d1d;
  }
}
```

---

## Paso 9.3: Global Styles

### Crear `public/css/global.css`

```css
body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background-color: var(--color-bg-secondary);
}

h1, h2, h3, h4, h5, h6 {
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}

h1 { font-size: var(--font-size-3xl); }
h2 { font-size: var(--font-size-2xl); }
h3 { font-size: var(--font-size-xl); }
h4 { font-size: var(--font-size-lg); }

p {
  line-height: var(--line-height-normal);
}

a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

a:hover {
  color: var(--color-primary-hover);
}

code {
  font-family: var(--font-family-mono);
  font-size: 0.875em;
  background: var(--color-bg-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
}

::selection {
  background-color: var(--color-primary);
  color: white;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}
```

---

## Paso 9.4: Component Styles

### Crear `public/css/components.css`

```css
/* ==================== BUTTONS ==================== */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-secondary {
  background: var(--color-bg);
  border-color: var(--color-border);
  color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-strong);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.btn-sm {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-sm);
}

.btn-lg {
  padding: var(--space-md) var(--space-lg);
  font-size: var(--font-size-lg);
}

/* ==================== FORMS ==================== */

.form-group {
  margin-bottom: var(--space-md);
}

.form-label {
  display: block;
  margin-bottom: var(--space-xs);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-base);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  transition: all var(--transition-fast);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-input::placeholder {
  color: var(--color-text-tertiary);
}

.form-checkbox {
  width: 1.125rem;
  height: 1.125rem;
  accent-color: var(--color-primary);
}

/* ==================== CARDS ==================== */

.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.card-header {
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-md);
}

.card-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

/* ==================== BADGES ==================== */

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem var(--space-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-full);
}

.badge-primary {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.badge-success {
  background: var(--color-success-light);
  color: #166534;
}

.badge-warning {
  background: var(--color-warning-light);
  color: #92400e;
}

.badge-danger {
  background: var(--color-danger-light);
  color: #dc2626;
}

/* ==================== MODALS ==================== */

.modal {
  border: none;
  border-radius: var(--radius-lg);
  padding: 0;
  max-width: 500px;
  width: 90%;
  box-shadow: var(--shadow-xl);
}

.modal::backdrop {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal-content {
  padding: var(--space-xl);
}

.modal-header {
  margin-bottom: var(--space-lg);
}

.modal-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-lg);
}

/* ==================== UTILITIES ==================== */

.text-center { text-align: center; }
.text-right { text-align: right; }

.text-sm { font-size: var(--font-size-sm); }
.text-lg { font-size: var(--font-size-lg); }

.text-muted { color: var(--color-text-secondary); }
.text-danger { color: var(--color-danger); }
.text-success { color: var(--color-success); }

.font-medium { font-weight: var(--font-weight-medium); }
.font-semibold { font-weight: var(--font-weight-semibold); }
.font-bold { font-weight: var(--font-weight-bold); }

.mt-sm { margin-top: var(--space-sm); }
.mt-md { margin-top: var(--space-md); }
.mt-lg { margin-top: var(--space-lg); }
.mb-sm { margin-bottom: var(--space-sm); }
.mb-md { margin-bottom: var(--space-md); }
.mb-lg { margin-bottom: var(--space-lg); }

.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-sm { gap: var(--space-sm); }
.gap-md { gap: var(--space-md); }

.hidden { display: none !important; }
```

---

## ✅ Checklist Fase 9

- [ ] CSS Reset
- [ ] Custom properties (colores, spacing, typography)
- [ ] Dark mode support
- [ ] Global styles
- [ ] Button variants
- [ ] Form components
- [ ] Cards
- [ ] Badges
- [ ] Modals
- [ ] Utility classes

---

## 🔗 Siguiente: [10-testing.md](./10-testing.md)

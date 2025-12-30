# Fase 8: Componentes Astro Estáticos

## Objetivo

Implementar componentes Astro reutilizables para header, footer, navegación y layouts.

---

## Paso 8.1: Header

### Crear `src/components/Header.astro`

```astro
---
interface Props {
  title?: string;
}

const { title } = Astro.props;
---

<header class="app-header">
  <div class="header-left">
    <a href="/app" class="logo">
      <span class="logo-icon">🛒</span>
      <span class="logo-text">HomeCart</span>
    </a>
  </div>
  
  <div class="header-center">
    <hc-household-selector></hc-household-selector>
  </div>
  
  <div class="header-right">
    <hc-user-menu></hc-user-menu>
  </div>
</header>

<script type="module">
  import '/components/hc-household-selector.js';
  import '/components/hc-user-menu.js';
</script>

<style>
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) var(--space-lg);
    background: white;
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    text-decoration: none;
    color: var(--color-text);
  }
  
  .logo-icon {
    font-size: 1.5rem;
  }
  
  .logo-text {
    font-weight: 700;
    font-size: 1.25rem;
  }
  
  .header-center {
    flex: 1;
    display: flex;
    justify-content: center;
  }
  
  @media (max-width: 768px) {
    .logo-text {
      display: none;
    }
    
    .header-center {
      justify-content: flex-start;
      margin-left: var(--space-md);
    }
  }
</style>
```

---

## Paso 8.2: Navigation

### Crear `src/components/Navigation.astro`

```astro
---
const currentPath = Astro.url.pathname;

const navItems = [
  { href: '/app', label: 'Inicio', icon: '🏠' },
  { href: '/app/lists', label: 'Listas', icon: '📝' },
  { href: '/app/products', label: 'Productos', icon: '📦' },
  { href: '/app/purchases', label: 'Compras', icon: '🧾' },
  { href: '/app/stats', label: 'Estadísticas', icon: '📊' },
  { href: '/app/settings', label: 'Ajustes', icon: '⚙️' }
];
---

<nav class="app-nav">
  <ul class="nav-list">
    {navItems.map(item => (
      <li>
        <a 
          href={item.href} 
          class:list={['nav-link', { active: currentPath === item.href || currentPath.startsWith(item.href + '/') }]}
        >
          <span class="nav-icon">{item.icon}</span>
          <span class="nav-label">{item.label}</span>
        </a>
      </li>
    ))}
  </ul>
</nav>

<style>
  .app-nav {
    background: white;
    border-right: 1px solid var(--color-border);
    width: 240px;
    height: calc(100vh - 60px);
    position: fixed;
    left: 0;
    top: 60px;
    overflow-y: auto;
  }
  
  .nav-list {
    list-style: none;
    padding: var(--space-md);
    margin: 0;
  }
  
  .nav-link {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--color-text);
    transition: all var(--transition-fast);
  }
  
  .nav-link:hover {
    background: var(--color-bg-secondary);
  }
  
  .nav-link.active {
    background: var(--color-primary);
    color: white;
  }
  
  .nav-icon {
    font-size: 1.25rem;
  }
  
  @media (max-width: 768px) {
    .app-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      top: auto;
      width: 100%;
      height: auto;
      border-right: none;
      border-top: 1px solid var(--color-border);
    }
    
    .nav-list {
      display: flex;
      justify-content: space-around;
      padding: var(--space-sm);
    }
    
    .nav-link {
      flex-direction: column;
      gap: 0.25rem;
      padding: var(--space-xs);
    }
    
    .nav-label {
      font-size: 0.75rem;
    }
  }
</style>
```

---

## Paso 8.3: Footer

### Crear `src/components/Footer.astro`

```astro
---
const year = new Date().getFullYear();
---

<footer class="app-footer">
  <div class="footer-content">
    <p>&copy; {year} HomeCart. Todos los derechos reservados.</p>
    <nav class="footer-nav">
      <a href="/privacy">Privacidad</a>
      <a href="/terms">Términos</a>
      <a href="/help">Ayuda</a>
    </nav>
  </div>
</footer>

<style>
  .app-footer {
    background: var(--color-bg-secondary);
    border-top: 1px solid var(--color-border);
    padding: var(--space-lg);
    margin-top: auto;
  }
  
  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-md);
  }
  
  .footer-content p {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }
  
  .footer-nav {
    display: flex;
    gap: var(--space-lg);
  }
  
  .footer-nav a {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: var(--font-size-sm);
  }
  
  .footer-nav a:hover {
    color: var(--color-primary);
  }
  
  @media (max-width: 768px) {
    .footer-content {
      flex-direction: column;
      text-align: center;
    }
    
    .app-footer {
      margin-bottom: 60px; /* Espacio para nav móvil */
    }
  }
</style>
```

---

## Paso 8.4: AppLayout actualizado

### Actualizar `src/layouts/AppLayout.astro`

```astro
---
import BaseLayout from './BaseLayout.astro';
import AuthGuard from '../components/AuthGuard.astro';
import Header from '../components/Header.astro';
import Navigation from '../components/Navigation.astro';
import Footer from '../components/Footer.astro';

interface Props {
  title: string;
}

const { title } = Astro.props;
---

<BaseLayout title={title}>
  <AuthGuard>
    <div class="app-container">
      <Header />
      <div class="app-body">
        <Navigation />
        <main class="app-main">
          <slot />
        </main>
      </div>
      <Footer />
    </div>
  </AuthGuard>
</BaseLayout>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  .app-body {
    display: flex;
    flex: 1;
  }
  
  .app-main {
    flex: 1;
    padding: var(--space-lg);
    margin-left: 240px;
    max-width: calc(100% - 240px);
  }
  
  @media (max-width: 768px) {
    .app-main {
      margin-left: 0;
      max-width: 100%;
      padding-bottom: 80px; /* Espacio para nav móvil */
    }
  }
</style>
```

---

## ✅ Checklist Fase 8

- [ ] Header con logo, household selector, user menu
- [ ] Navigation sidebar/bottom nav responsive
- [ ] Footer con links
- [ ] AppLayout integrado
- [ ] Responsive design

---

## 🔗 Siguiente: [09-estilos-css.md](./09-estilos-css.md)

# Fase 11: CI/CD con GitHub Actions

## Objetivo

Configurar pipelines de integración continua y despliegue automático a Firebase Hosting.

---

## Paso 11.1: Workflow de CI

### Crear `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run ESLint
        run: pnpm lint

  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run unit tests
        run: pnpm test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: always()
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: false

  test-e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          PUBLIC_FIREBASE_API_KEY: ${{ secrets.PUBLIC_FIREBASE_API_KEY }}
          PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.PUBLIC_FIREBASE_AUTH_DOMAIN }}
          PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.PUBLIC_FIREBASE_PROJECT_ID }}
          PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.PUBLIC_FIREBASE_STORAGE_BUCKET }}
          PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          PUBLIC_FIREBASE_APP_ID: ${{ secrets.PUBLIC_FIREBASE_APP_ID }}

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test-unit]
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
        env:
          PUBLIC_FIREBASE_API_KEY: ${{ secrets.PUBLIC_FIREBASE_API_KEY }}
          PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.PUBLIC_FIREBASE_AUTH_DOMAIN }}
          PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.PUBLIC_FIREBASE_PROJECT_ID }}
          PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.PUBLIC_FIREBASE_STORAGE_BUCKET }}
          PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          PUBLIC_FIREBASE_APP_ID: ${{ secrets.PUBLIC_FIREBASE_APP_ID }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 1
```

---

## Paso 11.2: Workflow de Deploy

### Crear `.github/workflows/deploy.yml`

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
        env:
          PUBLIC_FIREBASE_API_KEY: ${{ secrets.PUBLIC_FIREBASE_API_KEY }}
          PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.PUBLIC_FIREBASE_AUTH_DOMAIN }}
          PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.PUBLIC_FIREBASE_PROJECT_ID }}
          PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.PUBLIC_FIREBASE_STORAGE_BUCKET }}
          PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          PUBLIC_FIREBASE_APP_ID: ${{ secrets.PUBLIC_FIREBASE_APP_ID }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: ${{ secrets.PUBLIC_FIREBASE_PROJECT_ID }}
```

---

## Paso 11.3: Workflow de Preview (PRs)

### Crear `.github/workflows/preview.yml`

```yaml
name: Deploy Preview

on:
  pull_request:
    branches: [main]

jobs:
  preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
        env:
          PUBLIC_FIREBASE_API_KEY: ${{ secrets.PUBLIC_FIREBASE_API_KEY }}
          PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.PUBLIC_FIREBASE_AUTH_DOMAIN }}
          PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.PUBLIC_FIREBASE_PROJECT_ID }}
          PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.PUBLIC_FIREBASE_STORAGE_BUCKET }}
          PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          PUBLIC_FIREBASE_APP_ID: ${{ secrets.PUBLIC_FIREBASE_APP_ID }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Deploy Preview to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: ${{ secrets.PUBLIC_FIREBASE_PROJECT_ID }}
          # Sin channelId para crear preview automático
```

---

## Paso 11.4: Configurar Secretos en GitHub

### Secretos necesarios:

```
PUBLIC_FIREBASE_API_KEY
PUBLIC_FIREBASE_AUTH_DOMAIN
PUBLIC_FIREBASE_PROJECT_ID
PUBLIC_FIREBASE_STORAGE_BUCKET
PUBLIC_FIREBASE_MESSAGING_SENDER_ID
PUBLIC_FIREBASE_APP_ID
OPENAI_API_KEY
FIREBASE_SERVICE_ACCOUNT (JSON de service account)
```

### Obtener Service Account:

1. Ir a Firebase Console → Project Settings → Service Accounts
2. Click en "Generate new private key"
3. Copiar contenido JSON completo al secreto `FIREBASE_SERVICE_ACCOUNT`

---

## Paso 11.5: Badge de Estado

### Añadir a `README.md`:

```markdown
# HomeCart

[![CI](https://github.com/tu-usuario/homecart/actions/workflows/ci.yml/badge.svg)](https://github.com/tu-usuario/homecart/actions/workflows/ci.yml)
[![Deploy](https://github.com/tu-usuario/homecart/actions/workflows/deploy.yml/badge.svg)](https://github.com/tu-usuario/homecart/actions/workflows/deploy.yml)

...
```

---

## ✅ Checklist Fase 11

- [ ] CI workflow (lint, typecheck, unit tests, build)
- [ ] E2E tests en CI
- [ ] Deploy workflow a Firebase
- [ ] Preview deployments para PRs
- [ ] Secretos configurados en GitHub
- [ ] Coverage reports
- [ ] Artifacts para debugging
- [ ] Status badges

---

## 🔗 Siguiente: [12-firestore-rules.md](./12-firestore-rules.md)

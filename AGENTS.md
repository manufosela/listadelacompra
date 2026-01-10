# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains Astro pages, layouts, and components. Routes live in `src/pages/`.
- `public/` hosts static assets plus Lit web components in `public/components/` (prefixed `hc-`) and client services in `public/js/`.
- `functions/` contains Firebase Cloud Functions. `firebase/` contains security rules.
- `tests/unit/` holds Vitest tests, `tests/e2e/` holds Playwright tests, with shared setup in `tests/setup.js`.
- `scripts/` includes build helpers; some assets (like `public/js/firebase-config.js`) are generated.

## Build, Test, and Development Commands
- `pnpm dev`: generate Firebase config/version and start Astro dev server.
- `pnpm build`: generate config, bundle Lit, and build production output to `dist/`.
- `pnpm preview`: serve the production build locally.
- `pnpm test`: run unit + e2e tests; use `pnpm test:unit` or `pnpm test:e2e` for focused runs.
- `pnpm lint` / `pnpm format`: ESLint and Prettier formatting checks.
- `pnpm firebase:emulators`: start local Firebase emulators; `pnpm deploy` builds and deploys hosting.

## Coding Style & Naming Conventions
- Vanilla ES Modules only; no TypeScript.
- Comments and docs in Spanish; variables, functions, and filenames in English.
- Lit components use `hc-` prefix and import Lit from `/js/vendor/lit.bundle.js`.
- Astro is static-only (no dynamic routes); use query params for IDs (e.g., `/app/list?id=123`).
- Auto-generated files (notably `public/js/firebase-config.js`) should not be edited manually.
- Follow ESLint/Prettier defaults; run `pnpm lint` and `pnpm format` before PRs.

## Testing Guidelines
- Unit tests use Vitest (jsdom) in `tests/unit/`.
- E2E tests use Playwright in `tests/e2e/`.
- Prefer adding tests alongside the existing patterns in each folder; run `pnpm test` before submitting.

## Commit & Pull Request Guidelines
- Conventional Commits required: `<type>(<scope>): <description>`, lower-case subject, max 72 chars.
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`.
- Do not mention AI in commit messages or code comments.
- PRs should include a concise summary, testing notes, and screenshots for UI changes; link related issues.

## Security & Configuration Tips
- Copy `.env.example` to `.env` and `.env.test`; do not commit secrets.
- Firebase config is generated from `.env` during `pnpm dev` and `pnpm build`.

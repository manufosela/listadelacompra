#!/usr/bin/env node
/**
 * Auto-versioning commit script
 * Detecta el tipo de commit y actualiza la versión automáticamente
 *
 * Uso: node scripts/commit.js "tipo(scope): mensaje"
 * O:   pnpm commit "tipo(scope): mensaje"
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const message = process.argv[2];

if (!message) {
  console.error('❌ Error: Debes proporcionar un mensaje de commit');
  console.error('   Uso: pnpm commit "fix(scope): mensaje"');
  process.exit(1);
}

// Detectar tipo de versión según conventional commits
function getVersionType(msg) {
  const lowerMsg = msg.toLowerCase();

  // BREAKING CHANGE = major
  if (msg.includes('BREAKING CHANGE') || msg.includes('!:')) {
    return 'major';
  }

  // feat = minor
  if (lowerMsg.startsWith('feat')) {
    return 'minor';
  }

  // fix, perf, refactor = patch
  if (lowerMsg.startsWith('fix') ||
      lowerMsg.startsWith('perf') ||
      lowerMsg.startsWith('refactor')) {
    return 'patch';
  }

  // docs, style, test, chore, ci, build = no version bump
  return null;
}

const versionType = getVersionType(message);

try {
  // Añadir todos los cambios
  execSync('git add -A', { stdio: 'inherit' });

  // Si hay bump de versión, hacerlo antes del commit
  if (versionType) {
    console.log(`📦 Bump de versión: ${versionType}`);
    execSync(`npm version ${versionType} --no-git-tag-version`, { stdio: 'pipe' });
    execSync('git add package.json', { stdio: 'inherit' });

    // Leer nueva versión
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    console.log(`   Nueva versión: v${pkg.version}`);
  }

  // Crear commit con mensaje completo
  const fullMessage = `${message}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`;

  execSync(`git commit --no-verify -m "${fullMessage.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });

  // Push automático
  execSync('git push', { stdio: 'inherit' });

  console.log('✅ Commit y push completados');

} catch (error) {
  console.error('❌ Error durante el commit:', error.message);
  process.exit(1);
}

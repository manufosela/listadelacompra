/**
 * Genera version.json con metadatos de la build actual
 * Este archivo se usa para detectar nuevas versiones y forzar reload
 */
import { writeFileSync, readFileSync, readdirSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

// Leer versión de package.json
const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

// Función recursiva para obtener archivos
function getFilesRecursive(dir, pattern) {
  const files = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getFilesRecursive(fullPath, pattern));
      } else if (pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignorar directorios que no existen
  }
  return files;
}

// Generar hash de los archivos de componentes y JS para detectar cambios
const jsFiles = [
  ...getFilesRecursive('public/js', /\.js$/),
  ...getFilesRecursive('public/components', /\.js$/)
];
const cssFiles = getFilesRecursive('public/css', /\.css$/);
const allFiles = [...jsFiles, ...cssFiles].sort();

const contentHash = createHash('md5');
for (const file of allFiles) {
  const content = readFileSync(file, 'utf-8');
  contentHash.update(content);
}

const versionData = {
  version: pkg.version,
  buildTime: new Date().toISOString(),
  hash: contentHash.digest('hex').substring(0, 8)
};

// Escribir en public/ para que se copie a dist/
writeFileSync('public/version.json', JSON.stringify(versionData, null, 2));
console.log(`✅ version.json generado: v${versionData.version} (${versionData.hash})`);

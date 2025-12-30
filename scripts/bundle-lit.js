/**
 * Genera un bundle de Lit para uso local
 * Ejecutar: node scripts/bundle-lit.js
 */
import { build } from 'esbuild';
import { writeFileSync } from 'fs';

const result = await build({
  stdin: {
    contents: `
      export { LitElement, html, css, svg, nothing } from 'lit';
      export { classMap } from 'lit/directives/class-map.js';
      export { styleMap } from 'lit/directives/style-map.js';
      export { repeat } from 'lit/directives/repeat.js';
      export { until } from 'lit/directives/until.js';
      export { live } from 'lit/directives/live.js';
    `,
    resolveDir: process.cwd(),
    loader: 'js'
  },
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: 'public/js/vendor/lit.bundle.js',
});

console.log('✅ public/js/vendor/lit.bundle.js generado');

// import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

// /**
//  * With preserveModules, Vite may inject every emitted chunk as a separate <script>, while main.js
//  * still imports them — executing modules twice and breaking customElements.define().
//  * Keep modulepreload polyfill (if any) + main.js only; the browser loads the graph via imports.
//  */
// function preserveModulesSingleHtmlEntry(): Plugin {
//   return {
//     name: 'preserve-modules-single-html-entry',
//     apply: 'build',
//     enforce: 'post',
//     transformIndexHtml(html) {
//       return html.replace(
//         /<script[^>]*src="\.\/assets\/(?!_virtual\/modulepreload-polyfill\.js)(?!main\.js)[^"]*"[^>]*>\s*<\/script>\s*/gi,
//         ''
//       );
//     },
//   };
// }

// /**
//  * Emit one ES module file per source module instead of a single bundle.
//  * Helps debug Web Components / registration order and keeps filenames aligned with src/.
//  *
//  * Dependencies (gsap, three, etc.) are emitted as separate chunks under assets/.
//  */
// export default defineConfig({
//   root: '.',
//   base: './',
//   plugins: [preserveModulesSingleHtmlEntry()],
//   esbuild: {
//     keepNames: true,
//   },
//   build: {
//     outDir: 'dist',
//     emptyOutDir: true,
//     minify: false,
//     sourcemap: true,
//     rollupOptions: {
//       preserveEntrySignatures: 'exports-only',
//       output: {
//         format: 'es',
//         preserveModules: true,
//         preserveModulesRoot: 'src',
//         entryFileNames: 'assets/[name].js',
//         chunkFileNames: 'assets/[name].js',
//         assetFileNames: 'assets/[name][extname]',
//       },
//     },
//   },
// });
export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
  },
});

import preact from '@astrojs/preact';
import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';

/* Static site. Every page is prerendered.

   THE CLOUDFLARE ADAPTER IS DELIBERATELY NOT HERE YET.

   docs/17-tech-stack.md plans three rendering tiers — promoted pages built
   statically, the long tail server-rendered on demand. We have zero SSR routes
   today, so the adapter bought us nothing and cost us a broken dev server:
   @astrojs/cloudflare starts a workerd runner in dev, and its SSR dependency
   pre-bundling fails with

     The file does not exist at ".../node_modules/.vite/deps_ssr/server-*.js"
     which is in the optimize deps directory
       at runInRunnerObject (workers/runner-worker/index.js)

   Add it back in the same commit as the first `export const prerender = false`
   route, not before. A static build deploys to Cloudflare Pages perfectly well
   without an adapter.

   AND THE PACKAGE IS GONE FROM package.json TOO, which took a failed deploy to
   learn. Leaving an unused adapter installed is not neutral: wrangler's
   auto-config looks for it, finds it, and rewrites the build to SSR without
   being asked. The first Cloudflare build printed "Rearranging server assets"
   — a line a static build never emits — then died generating static routes,
   because in server mode `getStaticPaths()` is ignored and the 57 bag pages
   stop being prerendered.

   Reproduced locally by installing the adapter and watching the same line
   appear. So: an unused dependency that a build host treats as configuration
   is a trap, and `pnpm add @astrojs/cloudflare` belongs in that same future
   commit rather than sitting here in advance. */
export default defineConfig({
  /* Preact, for exactly one component: the airline picker.

     Downshift is React-only and there is no vanilla build, so the choice was
     a framework or another hand-rolled combobox. preact/compat runs Downshift
     unmodified at ~4 kB against React's ~45.

     `compat` is what lets a package that imports 'react' resolve to Preact.

     NOTE: the picker is NOT used as an Astro island with a client:* directive.
     /check builds its leg rows in the browser from a variable-length array,
     and an island has to exist in the server-rendered template. The page
     mounts the component imperatively with Preact's own render() instead —
     see check.astro. The integration is still needed, because it is what
     configures Vite's JSX transform for .jsx files. */
  integrations: [preact({ compat: true })],
  output: 'static',
  site: 'https://example.invalid', // real domain pending the naming decision
  build: { format: 'directory' },
  vite: {
    plugins: [tailwind()],
    /* The engine and UI modules are plain .mjs, shared with the build scripts
       and the tests. No bundler magic — they must stay importable by Node. */
    resolve: { preserveSymlinks: true },
  },
});

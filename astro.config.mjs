import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

/* Static by default, server-rendered where a page needs a request.
   Promoted pages (landing, /luggage-for/[carrier]) build to static HTML with
   verdicts computed at build time. The long tail renders on demand.
   See docs/17-tech-stack.md. */
export default defineConfig({
  output: 'static',
  adapter: cloudflare({ imageService: 'passthrough' }),
  site: 'https://example.invalid',   // real domain pending the naming decision
  build: { format: 'directory' },
  vite: {
    /* The engine and UI modules are plain .mjs and shared with the build
       scripts and tests. No bundler magic; they must stay importable by Node. */
    resolve: { preserveSymlinks: true },
  },
});

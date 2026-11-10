import fs from 'node:fs/promises';
import { defineConfig } from 'astro/config';
import studioApi from './src/integrations/studio-api.mjs';

// GitHub Pages only serves this project at the root when the repository is
// named <username>.github.io. Keeping the site root-relative avoids a broken
// /repo/ prefix for every internal link.
const excludeStudio = {
  name: 'exclude-studio-from-static-build',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await fs.rm(new URL('studio/', dir), { recursive: true, force: true });
    },
  },
};

export default defineConfig({
  site: process.env.SITE_URL ?? 'http://localhost:4321',
  base: process.env.BASE_PATH ?? '/',
  output: 'static',
  server: { port: 4321, host: '127.0.0.1' },
  devToolbar: { enabled: false },
  integrations: [excludeStudio],
  vite: {
    plugins: [studioApi()],
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: true,
    },
  },
});

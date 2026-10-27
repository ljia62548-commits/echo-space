import { defineConfig } from 'astro/config';
import studioApi from './src/integrations/studio-api.mjs';

// Echo Space is intentionally a static site. The only server-side piece is the
// local editing API, which exists in `astro dev` and is never shipped.
export default defineConfig({
  site: 'http://localhost:4321',
  output: 'static',
  server: { port: 4321, host: '127.0.0.1' },
  devToolbar: { enabled: false },
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

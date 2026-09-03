import { defineConfig } from 'vite';

// When building for GitHub Pages the site is served from
// https://<user>.github.io/<repo>/, so assets need a matching base path.
// Set BASE_PATH in the workflow; dev keeps '/'.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  server: {
    host: true,
    port: 5173,
  },
});

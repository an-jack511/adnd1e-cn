import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://example.pages.dev',
  output: 'static',
  build: {
    format: 'directory'
  }
});

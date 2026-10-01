import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://adnd1e-cn.pages.dev',
  output: 'static',
  build: {
    format: 'directory'
  }
});

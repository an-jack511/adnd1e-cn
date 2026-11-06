import { defineConfig } from 'astro/config';
import ruleText from './scripts/rehype-rule-text.ts';

export default defineConfig({
  site: 'https://adnd1e-cn.pages.dev',
  output: 'static',
  markdown: { rehypePlugins: [ruleText] },
  build: {
    format: 'directory'
  }
});

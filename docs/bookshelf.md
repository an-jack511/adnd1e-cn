# 封面书架与自编手册

`/books/` 是唯一的规则书库入口，旧的 `/rules/` 会跳转到书库。书架按核心规则、拓展规则、怪物、设定、杂志筛选。MM 同时出现在核心规则和怪物分类，全部视图中只显示一次。已有阅读地址保持不变。

书架优先使用 `public/assets/covers/<书籍 ID>.jpg`，其次使用 `public/archive/<书籍 ID>/book-cover.jpg`，没有图片时显示文字封面。分类与目录在 `src/data/bookshelf.ts` 维护。分类链接使用 URL hash，支持浏览器前进、后退。搜索支持中文名、英文名和简称，并与分类同时生效。

`scripts/import/bookshelf-covers.py` 从本地原书 PDF 提取 1200 像素宽封面，并从 `dragon.nightmare.org` 下载书库已收录各期杂志的独立封面 JPEG。脚本不下载或发布整本杂志 PDF。每张封面的来源、尺寸和处理方式记录在 `src/data/cover-sources.json`；杂志记录另含期号及 SHA-256。网页对封面作轻微对比度和饱和度调整，不生成或重绘图案及文字。

## 添加自编手册或法术书

1. 将 PDF 和封面放入 `public/manuals/<唯一 ID>/`，建议使用 `cover.jpg` 和简短的英文 PDF 文件名。
2. 在 `src/data/manuals.ts` 的 `manuals` 数组中添加记录：

```ts
{
  id: 'my-spellbook',
  title: '我的法术书',
  category: 'spellbooks',
  cover: '/manuals/my-spellbook/cover.jpg',
  file: '/manuals/my-spellbook/my-spellbook.pdf',
  description: '这本法术书的内容与版本说明。',
  pages: 48,
}
```

规则汇编的 `category` 为 `compilations`，法术书为 `spellbooks`。构建时自动生成封面卡片和独立阅读页面，无需手动添加路由。

运行 `npm run build` 和 `npm run check:links`，再检查书架的分类、搜索、封面与标题入口，以及新书的 PDF 阅读和下载。

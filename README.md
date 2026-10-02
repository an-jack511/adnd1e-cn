# AD&D 1E 中文规则索引

一个面向跑团现场快速查询的 AD&D 1st Edition 中文参考站 MVP。它使用按规则对象组织的静态数据，而不是要求使用者按规则书页码寻找内容。

结构化示例数据包含 10 个法术、10 个怪物、10 件装备、2 个职业、2 个种族、战斗/冒险/其他规则条目与 1 个随机表。规则书阅读模式另收录用户确认可公开发布的 PHB、DMG、MM 中文工作译稿 366 篇，尚未经逐句终校。快速车卡以浏览器本地数据工作。

## 技术栈

- Astro + TypeScript
- 静态生成，交互只使用少量原生浏览器 JavaScript
- Zod 数据 schema 与构建前校验
- 不使用 React、Next.js、数据库、Worker、登录系统或 UI framework

## 本地开发

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
```

输出目录为 `dist/`。也可以运行：

```bash
npm run validate:data
npm run build:search-index
```

## 数据结构

结构化内容放在 `src/data/public/`：

- `spells.ts`：法术字段包含职业、环级、学派、V/S/M、segment、range、duration、reversible 与来源。
- `monsters.ts`：保留 HD、AC、移动、出现数量、宝藏、特殊攻击、魔抗、灵能等字段。
- `items.ts`：保留武器的 S/M、L、长度、space required、speed factor、AC adjustment。
- `classes.ts`、`races.ts`、`rules.ts`、`books.ts`、`tables.ts`：其他索引数据。
- `src/schemas/`：Zod schema 与公共 TypeScript 类型。
- `src/published/books/`：经明确确认可公开发布的中文译稿 Markdown；与结构化示例数据分开。
- `src/data/published/books.json`：已发布章节目录与来源文件标记。

每个结构化条目都使用统一的 `SourceReference`：

```ts
{ book: 'PHB', page: 67, section: 'Spells' }
```

## 添加法术

复制 `src/data/public/spells.ts` 中的条目，提供唯一 `id`，填写中文名、英文名、职业、环级、成分、描述、标签和至少一个 `source`。运行 `npm run validate:data` 检查字段与来源书。

## 添加怪物

在 `src/data/public/monsters.ts` 中添加完整统计字段。图片不是列表缩略图；如有图片，在 `illustration` 中填写 `/assets/...` 路径、来源与页码，系统会在独立怪物页面提供“查看怪物插图”链接。

## 添加图片

把已获授权或自行制作的资源放入 `public/assets/monsters/`、`public/assets/books/` 或 `public/assets/illustrations/`。不要把整本规则书扫描图或未经确认授权的内容自动放进公开仓库。

## 添加规则来源

先在 `src/data/public/books.ts` 注册规则书，再在条目的 `source` 数组中使用其 `short`、完整标题或书籍 ID。来源组件会自动生成规则书入口链接。

## 导入流程预留

现有中文工作译稿来自本地独立工程的 `manuscript/`。确认发布权限后，运行 `scripts/import/published-books.ts` 将明确列出的 PHB、DMG、MM Markdown 文字复制为站点内容，并生成目录与检索数据。Cloudflare 构建不读取本地父目录；已发布的 Markdown 会进入公开仓库。导入脚本不复制原书扫描 PDF、原书插图或 `asset:` 图片链接，也不从互联网抓取原文。

继续结构化法术、怪物和物品时，可在 `scripts/import/spells.ts`、`scripts/import/monsters.ts` 中增添审校与字段映射。未确认可公开发布的草稿仍应留在仓库外或受控目录；不要直接把整个本地工作目录推送到 GitHub。

## 快速车卡

`/character/` 按本地 REF2《Player Character Sheets》的字段顺序组织正反两面：正面为属性、豁免、移动、护甲、生命值和战斗数据；背面为人物经历、装备、物资、财宝与随从。网页表单为新设计，不复制原书版面图。保存使用 `localStorage`，支持 JSON 导入导出与浏览器打印。`scripts/import/ability-tables.ts` 从仓库外的 PHB 工作译稿提取属性表数值，生成 `src/data/public/ability-tables.json`；目前涵盖 STR、WIS、DEX、CON、CHA，INT 与不适用分值提示查原表。工作译稿尚待人工终校，跑团时应核对原规则。

## Cloudflare Pages

- Framework preset: `Astro`
- Build command: `npm run build`
- Build output directory: `dist`

代码仓库：[an-jack511/adnd1e-cn](https://github.com/an-jack511/adnd1e-cn)。Cloudflare Pages 项目已连接 `main` 分支；推送新提交后会自动构建。站点地址：[adnd1e-cn.pages.dev](https://adnd1e-cn.pages.dev)。站点使用静态输出，不需要 Cloudflare Worker、D1 或后端服务。

## Git

本目录应作为独立 Git repository 管理。若需要手动连接 GitHub：

```bash
git remote add origin https://github.com/<your-account>/adnd1e-cn.git
git branch -M main
git push -u origin main
```

版权策略：公开仓库只放代码、schema、示例数据及用户已确认可公开发布的译稿。不要从互联网抓取或提交原书扫描、原文或未确认可公开发布的内容。

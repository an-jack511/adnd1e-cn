# AD&D 1E 中文规则索引

一个面向跑团现场快速查询的 AD&D 1st Edition 中文参考站 MVP。它使用按规则对象组织的静态数据，而不是要求使用者按规则书页码寻找内容。

当前示例数据包含 10 个法术、10 个怪物、10 件装备、2 个职业、2 个种族、战斗/冒险/其他规则条目、1 个随机表和一个基于 `localStorage` 的快速车卡工具。示例数据不等同于完整规则书正文。

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

未来可将已审阅、明确授权的翻译 Markdown 放在仓库外部或受控目录，通过 `scripts/import/spells.ts`、`scripts/import/monsters.ts` 等脚本转换为 schema 数据，再进入人工 review。`translation-source/`、`generated/` 等目录不应默认加入公开发布内容。

## Cloudflare Pages

- Framework preset: `Astro`
- Build command: `npm run build`
- Build output directory: `dist`

将仓库推送到 GitHub 后，在 Cloudflare Pages 连接该仓库即可启用自动构建。站点使用静态输出，不需要 Cloudflare Worker、D1 或后端服务。

## Git

本目录应作为独立 Git repository 管理。若需要手动连接 GitHub：

```bash
git remote add origin https://github.com/<your-account>/adnd1e-cn.git
git branch -M main
git push -u origin main
```

版权策略：公开仓库只放代码、schema、示例数据、用户已有或明确授权的内容。不要从互联网抓取或提交 AD&D 1E PHB、DMG、MM 的完整受版权保护正文。

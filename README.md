# AD&D 1E 中文规则索引

一个面向跑团现场快速查询的 AD&D 1st Edition 中文参考站。它使用按规则对象组织的静态数据，同时保留规则书阅读模式。

当前结构化索引包含 611 条法术、206 个怪物、582 件装备及魔法物品、149 张随机表，以及 14 个职业、7 个种族；规则书模式收录 PHB、DMG、MM、UA、DSG、WSG 中文正文。快速车卡以浏览器本地数据工作。

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
npm run test:rules
npm run check:links
```

## 数据结构

结构化内容放在 `src/data/public/`：

- `spells.ts`：法术字段包含职业、环级、学派、V/S/M、segment、range、duration、reversible 与来源。
- `monsters.ts`：保留 HD、AC、移动、出现数量、宝藏、特殊攻击、魔抗、灵能等字段。
- `items.ts`：保留武器的 S/M、L、长度、space required、speed factor、AC adjustment。
- `classes.ts`、`races.ts`、`rules.ts`、`books.ts`、`tables.ts`：其他索引数据。
- `play.ts`：按创建角色、旅行、遭遇、战斗、施法、休整与升级组织桌边流程。
- `src/rules-engine/`：车卡资格、属性、护甲、装备和负重的纯计算函数；不依赖页面。
- `src/schemas/`：Zod schema 与公共 TypeScript 类型。
- `src/published/books/`：经明确确认可公开发布的中文译稿 Markdown；与结构化示例数据分开。MM 的 Men 原稿包含 M–Z 后续怪物，导入时自动拆分为独立章节；旧的 Men 链接保留。
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

现有中文工作译稿来自本地独立工程的 `manuscript/` 及旧版 `build/chm/content/`。`scripts/import/published-books.ts` 将 PHB、DMG、MM、UA、DSG、WSG 文字复制为站点内容，并生成目录与检索数据。Cloudflare 构建不读取本地父目录；已发布的 Markdown 会进入公开仓库。导入脚本不复制原书扫描 PDF、原书插图或 `asset:` 图片链接，也不从互联网抓取原文。

`scripts/import/spells.ts`、`monsters.ts`、`items.ts`、`magic-items.ts` 与 `random-tables.ts` 分别生成 PHB／DMG／MM 结构化索引。UA 的法术、武器与魔法物品、职业经验表和完整战利品随机表分别由 `ua-spells.ts`、`ua-items.ts`、`ua-class-tables.ts`、`ua-tables.ts` 导入；先更新正文，再按上述顺序运行导入脚本。UA 没有独立怪物图鉴数据块，因此不会虚构 UA 怪物条目。改动父目录译稿后，运行 `npm run validate:data` 和 `npm run build`。搜索索引由 Astro 静态路由直接生成，不需要单独维护 JSON 副本。未确认可公开发布的草稿仍应留在仓库外或受控目录；不要直接把整个本地工作目录推送到 GitHub。

## 快速车卡

`/character/` 按本地 REF2《Player Character Sheets》的字段顺序组织正反两面：正面为属性、豁免、移动、护甲、生命值和战斗数据；背面为人物经历、装备、物资、财宝与随从。网页表单为新设计，不复制原书版面图。保存使用 `localStorage`，支持多人物保存、复制、加载、JSON 导入导出与浏览器打印。资格、AC、装备冲突、负重与移动率检查不会阻止 DM 修改。移动率按种族基础值、PHB 负重档、力量表的负重调整、装备与钱币重量自动计算；体积、地形及其他裁定通过独立控件调整。`/character/abilities/` 展示从 PHB 工作译稿整理的六项属性表，供核对车卡派生值。工作译稿尚待人工终校，跑团时应核对原规则。

离线版《AD&D 1e 不全书（GPT v0.2.0）》的公开下载暂缓；当前不在网页提供下载链接，也不把大型二进制文件放进 Pages 构建目录。等待发布决定后再补充。

信息架构与后续开发顺序见 `docs/architecture.md`。旧的 `/books/`、`/combat/`、`/adventure/` 等链接继续有效；`/play/` 按游戏情境组织规则，`/dm/` 集中主持人工具。

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

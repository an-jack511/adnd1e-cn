# AD&D 1e 译名表

本目录是网站内可独立构建、受版本控制的译名主表。`npm run terminology:apply` 或 `npm run terminology:audit` 会将完整副本同步到父目录 `X:\Games\DND\1e\translation\names`，供书稿与长期整理使用。两处是同一表的主表与导出副本，不另建第二套人工口径。根目录既有 `glossary.json`、`translation/monster-names.tsv` 与 `monster-rule-terms.tsv` 已作为历史资料纳入清单；不覆盖它们已有的未提交修改。

## 文件

- `catalog.json`：英文、规范中文、旧中文、英文异体、类别、稳定 ID、逐文件出现位置、核实状态、参考版本、出处及说明。
- `names.tsv`：便于查看、筛选的同表导出。章节标题是名称候选，不能与实际词条数量混算。
- `references/5etools-names.json`：只存公开参考数据的名称对、书目代码、页码、数据 URL、条目 URL、访问日期和数据摘要；不引入后续版本规则正文。
- `references/huiji-names.json`：灰机检索索引中实际可见的中英文名称对。访问方式明确为搜索索引摘录；直接页面与 API 的 HTTP 403 不记作全文读取。
- `references/setting-names.json`：FR、龙枪、灰鹰的设定名称证据；灰鹰国名表另与英文原表按固定表格编号及行序对照。章节名也在来源中，但不会自动当作专名采用。
- `settings-entities.json`：已选定的设定专名及适用书系；仅在对应书系补充“中文（English）”，保留原英文。纯英文标题也进入待核清单。
- `decisions.json`：需人工判断的英文异体及人物语素；所有推导必须指向已读到的名称证据。
- `reports/pending.json`：仍待核实的项目暂译与章节候选。
- `reports/conflicts.json`：同优先级来源分歧或多个历史中文名称。多个旧译不必然意味着当前存在错误。
- `reports/near-matches.json`：仅供审阅的近似英文匹配；绝不因相似度自动合并。
- `reports/context-review.json`：短名称、重名旧译在正文中的保留位置。普通叙述词也会命中，需要读上下文，不能一律判为错译。
- `reports/last-application.json`、`drift.json`：最近应用记录及重新应用会产生的变化。
- `src/data/terminology/names.json`：网站使用的精简副本，保留旧译检索与人物卡兼容；由脚本生成。

## 版本与采用顺序

`5R` 指第五版修订规则体系：2024《玩家手册》、2024《城主指南》、2025《怪物图鉴》及对应修订扩展。5etools 分别使用 `XPHB`、`XDMG`、`XMM`，不能把 `PHB` 的 2014 记录当作 5R。本站将修订扩展 `FRHoF`、`FRAiF`、`EFA` 明列为 5R；新增来源需先核实再扩展此表，不能只按出版年份猜版本。

`3R` 指第三版修订版，即 D&D 3.5。灰机三版站为 https://dnd3r.huijiwiki.com/；五版站为 https://dnd.huijiwiki.com/。前者的《玩家手册》与出版物导航实际标有“3R核心”。五版站的 2024 玩家手册与地下城主指南须与旧版页面区分。

按用户最新偏好，名称优先级为 **3R → 5R → 5E**。3R 没有可核对名称时才采用后续版证据。同优先级译名有分歧时挂起，不以出现次数投票。每条证据保留版本差异；不会因英文相同而导入或合并机制。

已存在的后续版语素推导不能覆盖精确的 3R 名称。怪物名称参考排除具名 NPC；Wolfwere、Shade 等身份或译文有疑问的记录单独挂起，不因英文同名而直接套用。未找到 3R 证据的名称不能标为“3R 已核实”。

`verified-exact` 表示该名称的英文与公开中英名称对精确对应（只正规化大小写、空白、弯引号和横线），不表示该词条的 1e 规则已经由人逐句复核。`adapted-variant` 是已记录理由的少量标点、分词、词形与单复数调整。`adapted-element` 通常只核实了施法者姓名语素，`verificationScope` 明确标明完整名称其余部分仍待核。`pending` 保留项目暂译，不能宣称通行或官方译名。

例如 Drawmij → 卓姆吉、Mordenkainen → 魔邓肯、Nystul → 涅斯图、Otto → 奥图均从参考法术的中文姓名语素提取，记录为语素推导；不会将未找到的灰鹰法术全名伪报成已验证。`Tenser's Floating Disc` 相对参考 `Disk` 是明确拼写异体，沿用“谭森浮碟术”。

## 维护

1. `npm run terminology:fetch` 刷新 5etools 名称证据；不会下载或混用后续版规则。
2. 将实际读到的灰机名称对加入 `references/huiji-names.json`，保留访问方式及日期；不得根据 URL 猜页面内容。
3. 审阅 `near-matches.json` 与待核清单；需要调整语素时在 `decisions.json` 写清范围和理由。
4. `npm run terminology:apply` 更新清单、正文、完整 HTML 详情、标题、目录、搜索缓存、导入资料与本地导出，再生成物品索引。
5. `npm run terminology:audit` 应为零漂移；随后运行 `npm run test:terminology`、资料库/阅读器/人物卡测试、类型检查、构建和链接检查。

应用按完整英文标签处理重名与短名称，其他仅应用无歧义的已核准中文替换；当前规范名受保护。重复运行须收敛。原英文、稳定 ID、链接与来源字段不改。装备旧代码按中文合并示例的逻辑已改用明确的历史 ID 对照，避免改名影响旧人物卡。已有手写人物卡备注不自动改写。

引用说明若带有完整英文名称，页面会按主表显示对应的新中文名；底层原始出处字段仍保留原文。没有英文对照的出处说明不猜测替换。

`import:library` 与 `import:regional` 在整理完成后自动应用主表；正常构建用 Node 检查所有实际资料库名称，发现新词条缺表或已确认名称回退时失败。构建只依赖网站仓库中的受跟踪文件，不依赖父目录副本或联网访问。

这是一份持续扩充的全站清单与核实队列，绝不声称所有候选都已经人工核实。

Ranger 按用户最终选择采用 3R 译名“巡林客”，条目注明“注：在一些规则中，也译为游侠。”，游侠保留为旧译检索别名。

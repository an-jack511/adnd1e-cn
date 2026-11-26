# 版本与站点核对记录（2026-11-06）

- https://5e.kiwee.top/ 首页明确服务 DND 5E/5R，并说明与 5e Wiki 共库。
- https://5e.kiwee.top/data/books.json 中 `PHB` = Player's Handbook (2014)，`XPHB` = Player's Handbook (2024)，`XDMG` = Dungeon Master's Guide (2024)，`XMM` = Monster Manual (2025)。因此 5R 是修订规则体系，不能把其所有核心书出版年都记成 2024。
- https://5e.kiwee.top/data/spells/spells-xphb.json 与 `spells-phb.json` 同时保留名称和规则。这里只读取 `ENG_name`/`name`/`source`/`page`；规则不入本项目。
- https://dnd3r.huijiwiki.com/wiki/玩家手册 的可检索内容列有“3R核心”；站名为“龙与地下城三版中文维基”。3R 即 3.5 修订版，不是原始 3.0；同站扩展也可能明确收录旧版内容，仍需逐条看来源。
- https://dnd3r.huijiwiki.com/wiki/玩家手册/吟游诗人法术 的搜索索引可见完整双语名称表，本轮据此记录名称对，包括 Cure Light Wounds / 治疗轻伤等；未复制其中规则摘要。
- https://dnd.huijiwiki.com/wiki/玩家手册（2024）/序章：欢迎来到冒险世界 的可检索内容明确称“本修订版”；https://dnd.huijiwiki.com/wiki/地下城主指南2024 与旧核心书分列。
- https://dnd3r.huijiwiki.com/wiki/有限祈愿术 的搜索索引实际重定向到“有限许愿术”，英文为 Limited Wish；记录现存主标题并保留旧项目名称。

直接访问本轮尝试的灰机页面与 API 得到 HTTP 403。检索索引可证实的记录均标注 `retrieval`，不冒称已经直接通读页面。5etools 参考数据成功读取情况、访问日期和 SHA-256 见名称数据文件；刷新发生错误时保留在 `errors` 中供检查。`source: WoW` 来自站内 Warcraft 转换数据，现标为 `other`：仍可检索，但不参与 3R→5E→5R 定译优先级，也不制造 D&D 版本冲突。

本轮按用户更正采用 **3R → 5E → 5R**。灰机三版站的维婕丝、柯瑞隆·拉瑞斯安、格乌什、奈落、海若尼斯、海克斯托条目均实际读到“英文名”字段；职业术语页实际读到“巡林客 Ranger”双语标题。这些是名称证据，不替换 1e 神祇属性或职业机制。

设定数据采用 SCAG、FRHoF、FRAiF、XDMG、DSotDQ 的明确中英名称字段。FRAiF 是冒险数据的代码，并非 FRBiF。XDMG 国名表无单独英文名字段，另读取 5etools 官方镜像的同书英文数据，仅对固定表格编号和相同行序的国名列，保留两端出处；不复制规则与表格其余内容。

# 2026-11-25 增补：XPHB 结构化标题核查

读取 5R XPHB 结构化数据 `https://5e.kiwee.top/data/book/book-xphb.json`，仅保留条目中的英文 `ENG_name`、中文 `name`、书码及页码，不保存正文。得到 1,358 组去重双语标题／字段名，用于精确词名对照。对当时规则主表 59 项待核词进行 exact-English 比对，未命中；检索范围限于结构化标题和字段标签，不能据此推定正文无词条。
- 2026-11-25 核查 `Astral Plane`：本地 3R 灰机精确名称快照未命中；直接访问 `https://dnd3r.huijiwiki.com/wiki/星界` 返回 HTTP 403，故只记为无法核实，不推断该站没有译名。5E PaF p.20 有精确双语名“星光位面”，5R XDMG p.184 的显式设定名称字段同译；据现行优先级采用“星光位面”，并保留 1E 原有“星界位面”为检索旧译。
- `Time in the Realms`：5E SCAG p.14 与 5R FRHoF p.45 均有精确双语标题“国度的历法”；本站对应内容介绍各地历法和纪年，故将目录旧译“国度中的时间”修正为“国度的历法”。该英文标题不在本地 3R 精确名称快照中；不据此断言 3R 无对应译法。
- 2026-11-26 5E 中文站 `https://5e.kiwee.top/js/parser.js` 的 `Parser.ITM_RARITY_TO_SHORT` 精确映射为 Common“常见”、Uncommon“不常见”、Rare“珍稀”、Very Rare“非常珍稀”。AD&D 1E 怪物原文 OCR 也确认 Frequency 字段使用 Common／Uncommon／Rare／Very Rare 这些值；只采用稀有程度的译名，不合并不同版本的物品稀有度与怪物出现频率规则。3R 本地精确名称索引未命中这些泛词，不能推断 3R 没有译法。

## 2026-11-26：离线数据库快照

5E／5R 中文共库页面明确列出 `tjliqy/5etools-cn` 与 `pttsw/wiki-dnd-parser` 源代码仓库。此次从可直接访问的 `https://5e.kiwee.top/data/` 下载索引指向的 JSON，连同既有参考源共保存 353 份文件、104,090,247 字节；SHA-256 与 URL 见本地缓存 manifest。递归提取明确中英字段，连同既有证据建立 148,507 条名称／标题记录的离线索引（不是独立概念数）。类别、版本、书码、继承页码及 JSON 位置分别保留；无法识别版本的来源不参与版本优先级。

3R 数据库目录明确说明数据来自 `Data:数据库目录.json`；公开 API 与 raw 入口实际返回 403。3R 当前离线覆盖为既有 180 条名称证据，绝不声称获得了整站数据库。5E／5R 另有三个文件未下载成功：FRAiF 冒险 JSON 返回 404，WBTW 怪物库与 HF 书籍 JSON 连接提前结束；均记在报告中。已成功的快照不重复联网获取，明确的 403／404 只在显式 `--refresh` 时重试。

译名核查今后默认离线检索，本地无命中不推断线上没有译名；有待判义的章节名或同名词仍回到 1E 原文语境。完整统计与缺口见 `../reports/offline-reference-cache.json`。

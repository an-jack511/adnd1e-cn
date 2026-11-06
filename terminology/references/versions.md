# 版本与站点核对记录（2026-11-06）

- https://5e.kiwee.top/ 首页明确服务 DND 5E/5R，并说明与 5e Wiki 共库。
- https://5e.kiwee.top/data/books.json 中 `PHB` = Player's Handbook (2014)，`XPHB` = Player's Handbook (2024)，`XDMG` = Dungeon Master's Guide (2024)，`XMM` = Monster Manual (2025)。因此 5R 是修订规则体系，不能把其所有核心书出版年都记成 2024。
- https://5e.kiwee.top/data/spells/spells-xphb.json 与 `spells-phb.json` 同时保留名称和规则。这里只读取 `ENG_name`/`name`/`source`/`page`；规则不入本项目。
- https://dnd3r.huijiwiki.com/wiki/玩家手册 的可检索内容列有“3R核心”；站名为“龙与地下城三版中文维基”。3R 即 3.5 修订版，不是原始 3.0；同站扩展也可能明确收录旧版内容，仍需逐条看来源。
- https://dnd3r.huijiwiki.com/wiki/玩家手册/吟游诗人法术 的搜索索引可见完整双语名称表，本轮据此记录名称对，包括 Cure Light Wounds / 治疗轻伤等；未复制其中规则摘要。
- https://dnd.huijiwiki.com/wiki/玩家手册（2024）/序章：欢迎来到冒险世界 的可检索内容明确称“本修订版”；https://dnd.huijiwiki.com/wiki/地下城主指南2024 与旧核心书分列。
- https://dnd3r.huijiwiki.com/wiki/有限祈愿术 的搜索索引实际重定向到“有限许愿术”，英文为 Limited Wish；记录现存主标题并保留旧项目名称。

直接访问本轮尝试的灰机页面与 API 得到 HTTP 403。检索索引可证实的记录均标注 `retrieval`，不冒称已经直接通读页面。5etools 参考数据成功读取情况、访问日期和 SHA-256 见名称数据文件；刷新发生错误时保留在 `errors` 中供检查。

本轮按用户更正采用 **3R → 5R → 5E**。灰机三版站的维婕丝、柯瑞隆·拉瑞斯安、格乌什、奈落、海若尼斯、海克斯托条目均实际读到“英文名”字段；职业术语页实际读到“巡林客 Ranger”双语标题。这些是名称证据，不替换 1e 神祇属性或职业机制。

设定数据采用 SCAG、FRHoF、FRAiF、XDMG、DSotDQ 的明确中英名称字段。FRAiF 是冒险数据的代码，并非 FRBiF。XDMG 国名表无单独英文名字段，另读取 5etools 官方镜像的同书英文数据，仅对固定表格编号和相同行序的国名列，保留两端出处；不复制规则与表格其余内容。

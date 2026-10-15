# Subagent C：核心法术账本领域构建与玩家可用性审查

日期：2026-10-14。此处的“资深 PL”是用于设计审查的角色视角，不是真人履历或玩家访谈。本轮严格限定为核心法术账本领域；没有修改既有 `core-spell-acquisition`、总测试入口、`package.json`、UI、档案 schema 或其他模块。

## 结论

本轮交付把玩家容易混为一谈的法术事实拆成可审计的独立层次：

1. 规则包内稳定的法术定义 ID；法术名只是显示标签，不能作为唯一键。
2. 魔法师/幻术师找到的具体书、卷轴、师承或交换来源实体。
3. `core-spell-acquisition` 已有的 Chance to Know 资格状态。
4. 某一实体法术书中的实际条目及抄录尝试。
5. 牧师/德鲁伊独立的祈祷、请求与实际授予记录，不经过抄书或 Chance to Know。
6. 每一份独立准备的法术副本；同一法术准备两次就是两个可分别消耗的实例。
7. 每次施放只消耗一份已准备实例，保留施放事实。
8. 休息及学习/祈祷的恢复会话；现实时间流逝不会自动完成，休息不足、中断或容量不足都不会静默生成法术。
9. 采用白名单生成的玩家公开投影；DM 私有来源、真实授予者、原因、笔记、裁定 ID 不进入投影。

这使常见玩家任务可以被软件承担：玩家看到“为何现在不能准备”“还差多少休息或研习时间”“同名法术来自哪个规则表”“施放后究竟消耗了哪一份”，而不必把这些不同事实塞进一个 `knownSpells: string[]`。

## 核验资料与适用边界

页码为原书印刷页；PDF 页码从 1 开始。本轮对本地英文原件相关页重新读取文本，E02/E03 的表格视觉核验沿用共享证据台账，不冒称本轮重新逐格视觉校表。

| ID | 位置 | 本轮采用的事实 |
|---|---|---|
| SL-E01 / 共享 E02 | PHB printed 10 / PDF 11，Intelligence Table II 及后续说明 | Chance to Know、每环最低/最高、最低数重试与永久 INT 变化；资格、实际取得、法术书条目和记忆不是同一事实。 |
| SL-E02 | PHB printed 40 / PDF 41，Character Spells | 牧师/德鲁伊法术由神祇体系授予；魔法师/幻术师须查自己的法术书记忆；同一法术可准备多次，但一次准备只能施放一次；材料须另行取得。 |
| SL-E03 | DMG printed 38 / PDF 39，Day-to-Day Acquisition of Cleric Spells | 神术取得依赖祈祷、信仰关系与不同授予层级；高环请求可能涉及赎罪、牺牲和 DM 裁判。牧师条文明确包括德鲁伊。 |
| SL-E04 / 共享 E03 | DMG printed 39 / PDF 40，Acquisition of Magic-User Spells 及 Illusionists | 起始与后续奥术取得、法术书/卷轴实体、卷轴成功学习后毁去；复用既有取得模块，不在账本重做起始随机表。 |
| SL-E05 / 第一轮 C40/A18/B11 | DMG printed 40 / PDF 41，Recovery of Spells；Spell Casting | 恢复最高拟取法术 1–2/3–4/5–6/7–8/9 环分别需 4/6/8/10/12 小时完整休息；之后每份法术每环 15 分钟学习或祈祷；中断可能使恢复不可能；施放后该份记忆消失。 |

原件：

- `X:\Games\DND\1e\__RESOURCES\CORE 3\tsr02100 - AD&D Player's Handbook.pdf`，SHA-256 `E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213`。
- `X:\Games\DND\1e\__RESOURCES\CORE 3\tsr02011 - Advanced Dungeons & Dragons (Ad&D) 1St Ed - Dungeon Master'S Guide.pdf`，SHA-256 `7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669`。
- 共享证据：`X:\Games\DND\1e\docs\character-system-research\shared-evidence.md` 中 E02/E03。

### PHB 40 与 DMG 38 的神术授予层级

两处文字不是可无声合并的同一分段：PHB 40 将一至四环描述为低阶仆役授予、五至七环由神祇直接授予；DMG 38 则把一至二环归于教育/训练/经验、三至五环归于中介、六至七环归于神祇直接授予。账本因此不从环级自动推导授予者，只记录本团实际采用或本次裁定的 `authority`，规则包把两书关系标为 `needs-campaign-adoption`。这保留 DM 权威，也避免 UI 向玩家谎称某一合并算法就是唯一 RAW。

## 领域设计

### 法术身份与资格

`CoreSpellDefinitionRef` 使用 `definitionId + rulesetId + listId + level` 描述规则身份，`displayName` 只用于显示。测试刻意建立两个都叫 “Magic Missile” 的不同定义，确认不会按名称合并。这样可以安全处理不同职业表、拓展书、同名异文和未来迁移。

`assessSpellEligibility` 只做本层能证明的门禁：

- 法术是否属于当前施法传统的法术表；
- 职业规则层提供的最高可用环级；
- 职业/属性规则层提供的该环准备容量；
- 奥术是否有既有 Chance to Know 成功事实和当前存在的匹配法术书条目；
- 神术不得提交奥术的理解资格或法术书作为依据。

完整职业法术容量表不在本轮重新抄录。调用方必须传入已经核验的容量事实；账本不会因缺表而猜零、猜无限或采用后世 slot 规则。

### 奥术实体、抄录与书本

`ArcaneSourceEntity` 表示世界中一份具体来源，公开类别/标签与 DM 私有所有者、位置、来历、笔记分开保存。抄录成功会生成具体 `SpellbookEntry`；若来源是卷轴，则标记该实体已消耗。失败不会凭空生成书内条目。

本轮核验范围没有封口通用抄录费用与时长，所以规则数据和每次尝试都保留 `status: unknown`。若战役记录实际成本或用时，必须附 `rulingId`，不能把输入值伪装成已经核验的核心公式。

### 神术授予

`DivineGrantRecord` 允许“请求的法术”与“实际授予的法术”不同，也允许明确拒绝。每一条已授予记录只可生成一份准备实例；要准备同一神术两次，就需要两次实际授予事实。真实授予者、拒绝/替代原因和 DM 笔记保持私密，公开投影只给玩家已观察到的结果和公开说明。

神术路径完全不创建法术书条目，也不运行 Chance to Know；奥术路径同样不能借神术 grant 绕开书本与资格。

### 准备、施放与恢复

每个 `PreparedSpellCopy` 都有独立 ID。同一法术准备两份后，施放一份只把指定实例改为 `expended`，另一份保持 `ready`。若言语、姿势、材料或情境条件尚待 DM 判断，施放函数返回 `needs-dm` 且账本 revision 不变，不先消耗再等待裁定。

恢复会话同时验证：

- 最高拟恢复环级对应的完整休息时数；
- 所有拟准备副本按每环 15 分钟累计的学习/祈祷时间；
- 中断事实及必要裁定；
- 奥术当前仍有匹配且未遗失/毁坏的书内条目；
- 神术有未被另一份准备实例使用的匹配授予记录；
- 调用方提供的已核准备容量，且当前 ready 数加本次请求不超限。

不足或待裁判的会话会被记录，但不会生成准备实例。由此玩家可以保存进度并看见具体阻塞，而不是被迫把未完成的法术当成“已恢复”。

## 玩家投影与秘密边界

`projectSpellLedgerForPlayer` 从空白结构白名单构造，不采用“复制整个私档再删除几个键”。公开内容包括：稳定法术身份、公开来源类别/标签、书内条目、已公开的神术授予结果、准备副本、施放事实以及恢复进度。

以下字段不会进入公开投影：

- 来源真实所有者、秘密位置、来历和 DM 笔记；
- 神术真实授予者、替代/拒绝秘密原因和 DM 笔记；
- 恢复或抄录采用的裁定 ID；
- 本领域没有复制的 Chance to Know 私有掷骰详情。

测试将多组秘密字串序列化扫描，确认完整玩家投影中不存在这些字串。此测试只证明本模块白名单；上层 API、档案导出和 UI 仍须分别做泄密测试。

## 验证结果

执行：

```text
node node_modules\tsx\dist\cli.mjs scripts\test-core-spell-ledger.ts
```

结果：

```text
PASS: core spell ledger separates arcane/divine acquisition, stable spell IDs, physical sources/books, unknown copying facts, independent prepared copies, casting consumption, gated recovery, capacity and secret-safe projection.
```

专项严格类型检查（仅本轮源文件及既有导入）零诊断：

```text
node node_modules\typescript\bin\tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler src\character\rules\core-spell-ledger.ts src\character\engine\core-spell-ledger.ts
```

全项目 `tsc --noEmit` 在本轮检查时被另一并行文件 `src/character/rules/core-life-state.ts` 的 `sourceIds` 类型错误阻断；错误不在本轮四文件。本轮没有越界修改该侧线。

测试覆盖：同名不同 ID、奥术/神术反向拒绝、理解与书本双门禁、卷轴成功抄录消耗、未知成本/时长须裁定、恢复时数与研习时数、受中断会话不产出、容量超限拒绝、重复准备的逐份消耗、同一神术授予不可重复铸造、待裁判施放不变更状态，以及两类秘密公开投影负例。

## 尚未覆盖及集成要求

以下事项不得因本轮通过而宣称已经完成：

1. 各职业、等级、WIS 奖励与拓展规则的完整准备容量表；本轮只消费外部已核容量。
2. 每项法术的言语/姿势/材料、稀有成分、库存扣减、施法失败和具体战斗时序。
3. 完整抄录费用、时长、失败后来源处置、交换价格与 NPC 谈判；核验不足项维持 `unknown/needs-dm`。
4. 丢书、毁书、复制整本书、跨人物借阅和多个书本之间的条目移动事务。
5. 恢复活动与全局游戏日、睡眠质量、遭遇中断、位置及 `core-time-rest` 的原子整合。
6. 低 WIS 神术施放失败、戒律/阵营/赎罪全流程及秘密裁判状态机。
7. 研究新法术、制造魔法物品、卷轴制作和 UA/OA 等拓展职业/法术例外。
8. 事件日志、命令幂等、电子角色卡 schema、IndexedDB、导入迁移和 UI 接入。
9. 玩家投影经文件导出、消息交换与页面渲染后的端到端泄密验证。

集成时应由事务层把“实际完成恢复”作为一次原子提交：恢复会话、准备实例、活动时间与必要资源要么全部写入，要么全部不写；重发同一命令不得重复生成准备实例。UI 应以玩家任务组织为“找到/获授 → 录入书本或授予 → 休息 → 学习/祈祷 → 准备 → 施放”，并在每个阻塞点显示本模块给出的具体原因与原书定位，而不是要求玩家直接编辑底层数组。

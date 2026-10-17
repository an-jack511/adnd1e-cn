# 法术准备独立限定审查

日期：2026-10-17。初轮发现 **1 项 P2 时间一致性缺陷**，有公开函数层的可执行反例；该项已在文末追加复核中关闭。其余初轮实际检查未发现新的阻断缺陷。不据此认证全部 runtime、UI 或四职业真实准入流程。

## 范围、证据和版本

主要审查 `src/character/workflows/core-campaign-preparation.ts`。必要依赖：core-calendar、core-spell-capacity 引擎、core-spell-ledger 的公开投影／消费接口及规则常量、core-divine-first-level。读取 runtime 仅用于识别现有接口与集成边界，不把当时未完成的接线视作独立缺陷。

完整重读用户指定 PDF 技能后，目视检查 TEMP 中两张完整原书页图：

- `C:/Users/anjac/AppData/Local/Temp/adnd1e-preparation-dmg40.png`：DMG printed40 / PDF41，Recovery of Spells 全段、表及例子。
- `C:/Users/anjac/AppData/Local/Temp/adnd1e-preparation-phb40.png`：PHB printed40 / PDF41，Character Spells 全段，包括神术授予／可能扣留或替换、奥术需查阅法术书、重复记忆与一次记忆只可施放一次、睡眠／营养与学习时间说明。

本次没有使用现代规则，没有把 DMG82 的生命值恢复工作分类自动升级为 DMG40 的普遍禁止条款。发生时间冲突时普通向导转 DM，是本项目限定自动处理范围，不等于原书禁止所有具体工作。

审查中主 Agent 仍在修改新文件；发现预存休息复用 fallback 与历史一致性函数已加入后，重新读取并在包含这两项的版本执行诊断。最终核验快照 SHA256：

```text
core-campaign-preparation.ts
5844A9CD1EF179C5AFE69CDF9EFF1BDF7F789A8FF168041492AB8FADF3BE37E0
core-calendar.ts
6526CB2DD238ACD60265E3A4E844F571A623F75E5986F5AFB17039745865945F
core-spell-capacity.ts (engine)
8E336B76B2D3822CB5B237F9972DFE4083A57A9F0485D1E4BA76C604916CDB61
```

以下行号指该 preparation 版本。交付前主 Agent 又将容量接线提取为 campaignPreparationCapacity；重新读取后确认逻辑相同，并重新执行 P2 诊断，complete 与 history helper 仍均放行。此时 preparation SHA256 为 `B2E508E3CBC97E1E2D1BA4814FD0096F833D9EDA8EC228FE757DC586462BBC5B`，对应缺陷行号改为 66、73–74、120。没有将并发重构本身列为缺陷。

仅新增本报告，未修改主代码、测试或 fixture；复用已有 `scripts/fixtures/admitted-caster.ts` 的 cleric 分支做内存诊断，没有新建另一套四 caster 准入 fixture，也未承担其完整验收。

## [P2] 最后追加的 cast anchor 不代表所有已知施法世界时间均早于休息

位置：`core-campaign-preparation.ts:61`、`:68`、`:69`；相关历史检查 `:115`。

`latest` 取 `ledger.castings.at(-1)`；有已知时间时，仅查该 ID 的 atMinute 是否早于 restStartMinute。它没有约束其他已知施法时间，也没有验证日志追加顺序与世界时间单调一致。`assertPreparationHistoryCoherent()` 只拒绝位于休息开始至学习结束区间内的施法，较早追加、但时间晚于整个课程的施法仍被漏过。

### 实测输入路径

从现有 admittedCaster('cleric') 提取 genesis 初始公开法术账本，context 使用该人物、cleric1、INT12、WIS14。先完成一次普通准备取得另一份 ready，再经 `castPublicPreparedSpell()` 消耗两份，得到真实消费记录，顺序为：

```json
{
  "ledger.castings (IDs in append order)": ["cast-first", "cast-last"],
  "castingTimes": [
    {"castingId": "cast-first", "atMinute": 1000},
    {"castingId": "cast-last", "atMinute": 100}
  ]
}
```

然后直接调用 `completeCampaignPreparation()`，关键输入为：

```json
{
  "eventId": "counterexample",
  "recordedAt": "review",
  "calendar": null,
  "courses": [],
  "facts": {
    "choices": [{
      "kind": "divine-spell",
      "id": "adnd1e-core:cleric:1:bless",
      "quantity": 1
    }],
    "restStartMinute": 200,
    "restEndMinute": 440,
    "studyStartMinute": 440,
    "studyEndMinute": 455,
    "locationId": "room",
    "completeRestAndNourishmentConfirmed": true,
    "bookAccessOrDivineGrantConfirmed": true,
    "restAfterLatestCastingConfirmed": true,
    "lastCastingId": "cast-last",
    "initializeCalendar": {"minutesPerDay": 1440, "daysPerWeek": 7, "confirmed": true}
  }
}
```

输入 ledger 是上述已消费两次的公开账本；context 与 castingTimes 为上述值。这里的 courses 为空表示输入账本早期 recoverySessions 没有本模块的世界课程记录，与已有初始准备投影可包含恢复记录而不包含世界课程的边界一致。没有为反例伪造新的准入档案。

实际结果：成功新增 `counterexample:copy:0`，status 为 ready，课程 rest=200..440、study=440..455；再执行：

```ts
assertPreparationHistoryCoherent(
  result.calendar,
  [result.course],
  [{castingId:'cast-first',atMinute:1000}, {castingId:'cast-last',atMinute:100}],
);
```

仍然不抛错。因最后追加的 cast-last 在 100，完成入口的单条检查通过；cast-first 在 1000 又不在 200..455 区间内，历史检查通过。系统因此在已消费记录所明确包含的一次已知施法之前回填恢复收益，却仍声称本次休息是在最新施法之后。即使“最近”定义为日志最后一条，已知世界时间的矛盾也应转 DM，不能由一个确认布尔值覆盖。

建议：完成入口至少检查所有属于当前账本、在此次追加准备前已经记录的已知 castingTimes，不能只检查最后一个 ID；或者由 runtime 明确建立并强制“施法追加顺序和世界时间一致”的不变量，遇到倒序先拒绝／转 DM。不要让未知时间的最后一条记录掩盖较早记录的已知时间。历史重验需区分课程完成前已存在的 cast 与完成后正常发生的 cast，不能简单禁止课程结束后的所有施法。

该反例已在模块公开接口层实测；**没有声称已从最终 UI／runtime 成功提交**。若最终集成入口对所有既有施法时间施加上述约束，此路径可能在外层被封住，应带对应输入拒绝证据再关闭。本轮没有检验最终集成入口，也不把它假定为已封住。

## 已核实的正常边界

### 实际等级、属性容量与 ready 保留

- `campaignPreparationPlan()` 使用 context 的 classId、实际 level、INT／WIS 调用 calculateCoreSpellCapacity，采用 single 模型；没有以初始等级 1 或固定配额代替传入等级。
- ledger.characterId 必须匹配，职业需有法术轨迹，tradition 必须属于实际职业轨迹；容量未解析或不可用时拒绝。属性／等级的完整真实性仍由调用者提供，模块本身不读取人物档案来证明 context。
- 每环计 ready 数量，加本次所有 choice 的数量后与该环 preparedCapacity 比较；requested 为零的环不强制清空现有 ready。输出附加新 copies，未覆盖旧 ready 或清除 expended 历史。
- 独立内存检查 cleric1／WIS14：原有 1 ready，连续两次各准备 1 份后为 3 ready；再请求 1 份被容量检查拒绝。旧账本求值前后 JSON 一致。
- 容量依赖含等级表与属性门槛；本轮阅读接线和容量引擎，没有再次逐格认证全部职业／等级／属性表，不能据此声称所有高等级容量均已独立核完。

### 法术来源与本次神术授予

- 奥术 choice 必须是 status=present 的 spellbook-entry ID；不能用 divine-spell 绕过。代码不自动抄书，不从历史 cast 或 preparedCopies 反推丢失的法术书。
- 神术 choice 由核心一环表及现有公开 requested／granted 定义组成；旧 withheld 记录的定义可被再次提出，但本次仍须确认授予，输出创建新的 grant ID。没有直接把历史授予 ID 复用为本次授予证明。
- PHB40 明说神明可能替换或不授予；本模块只记录“本次选中的实际授予已确认”的普通成功路径，不实现神明自动批准所有请求。调用 UI 必须把 bookAccessOrDivineGrantConfirmed 表达为实际来源／授予确认，而非“我想准备”。本轮未认证 UI 的最终措辞与交互。
- 多环神术若不在现有公开定义中，当前选择器不会凭现代清单补齐。它不是完整神术目录模块；本轮未将这个有界来源范围误报为一条 RAW 不允许准备其他神术的规则。

### 休息、学习时间与同一休息的复用

DMG40 休息表：1–2 环 4 小时，3–4 环 6 小时，5–6 环 8 小时，7–8 环 10 小时，9 环 12 小时。原书示例说明恢复多份时按最高环决定一次最低休息，而非按份累加。代码取本次 selected 的最高环，匹配该表；学习／祈祷用 quantity × spell.level × 15 分钟求和。

代码要求完整休息结束不晚于学习开始，学习总分钟足够；确认休息及营养，不能以墙钟流逝代替事实。独立运行一环 rest239 分钟、study14 分钟、studyStart 早于 restEnd，三者均拒绝。

正常复用已实际通过：第一次 rest0..240、study240..255，第二次沿用同一休息、study255..270、same lastCastingId，输出日历仅有 1 个 rest、2 个 study；两课程一起通过 assertPreparationHistoryCoherent。没有按第二份重复收取四小时休息。代码也可复用已存在的同人物、同地点、同开始及有效结束时间的 rest，不限定必须由本模块新建。

### 世界日历、冲突与已修改 rest

- 未有 calendar 时必须明确 initializeCalendar，不暗设一天／一周长度；已有 calendar 不能被准备事实悄悄改长度。
- 休息开始至本次学习开始间，除同一 rest 与同 anchor／同 rest 的先前准备学习外，遇同人物活动就转 DM；学习期间另由 scheduleCoreActivity 检查占时冲突。普通流程没有借一条 overlapRuling 自动宣称活动兼容。
- 此处拒绝的含义是“普通向导无法认证兼容”，不是“RAW 明文禁止所有工作”。本轮确认错误消息保持这一区别。
- 复用已有 course 的 rest 时按 effectiveCoreActivityEnd 核对；历史一致性函数另外核对原 rest 和 study 的实际有效区间、地点、kind 和演员一致性，检查新冲突与区间内已知施法。
- 独立用 endCoreCalendarActivity 将已经完成课程的 rest 从240提前结束至200，assertPreparationHistoryCoherent 正确拒绝保留原收益。
- **集成必要条件：** 所有会修改世界日历、补录已知施法时间或改变准备历史的写入／重放路径都必须调用历史一致性检查；仅导出这个函数不会自动约束 runtime。最终写入层正在集成，本轮不认证其调用覆盖。上面的 P2 即使额外调用该检查仍能通过，故不只是“忘调用 helper”的问题。

### 本地 DM 事实与秘密边界

输入确认布尔值代表本地团桌已确认的实际事实，不能认证操作者身份、冒充远端 DM 签名或把本地裁定升级为普遍 RAW。模块没有 DM 身份认证流程，本轮不把三个 true 当作安全身份凭据。

输出沿用公开投影，新增公开 divine grant、session、copy 和 course；没有从公开字段重建 trueAuthorityId、private 原因、DM 笔记或隐秘来源实体。也没有调用要求秘密 ledger 的完整恢复引擎去合成秘密字段。该判断以符合 CampaignSpellLedger 公开类型的输入为边界，不是对任意恶意 JSON 的完整反序列化安全审计。

## 实际执行与未测试范围

执行了临时内存诊断，未落新测试文件：复用现有 cleric 准入 factory 的公开账本；普通准备追加、原 ready 保留、输入无变异、同 rest 两次连续学习、最终容量拒绝、休息／学习不足和顺序错误拒绝、修改 rest 后历史失效，以及上述两个已知 cast 世界时间倒序的 P2 反例。普通断言通过；P2 中 complete 和 history helper 均错误放行，已记录实际输出路径。

其余为代码与页图阅读，未全部转成动态测试。本轮没有运行四 caster fixture 验收、整套测试、浏览器验证、最终 prepare runtime/UI 提交／恢复／导出、所有高环学习组合、全部属性容量边界、多职／双职／Bard／混合职业、高环神明权威与替换流程、法术材料库存、丢失／借用书籍的完整世界事件，以及任意不合法公开账本输入的全面测试。没有再次修改 06 报告，也没有修复 preparation 代码。

## P2 修复与 runtime 必要条件追加复核（2026-10-17）

**状态：关闭初轮 P2。** 原反例在修复后由 completeCampaignPreparation 拒绝；历史重验也能识别该类课程前施法时间矛盾。原缺陷和初轮结果保留作历史证据，不代表当前仍可复现。

### 已复读的修复

- complete 遍历全部传入 castingTimes，要求 ID 在 ledger.castings 中存在、没有重复、分钟为非负安全整数；每个既有已知时间均必须严格早于 restStartMinute，不再只查最后追加的 ID。
- course.priorCastingIds 由 input.ledger.castings 派生，非 facts 中可由表单自行提交的字段。它保存课程之前已记录的施法集合。
- history 对 priorCastingIds 内的已知施法要求严格早于该课程 restStart；其他后来施法要求不早于 studyEnd。正常课程后的施法不会因为时间晚于课程而被误判成原 P2。
- runtime 在每个受支持动作处理后、commitCharacter 前调用 assertPreparationHistoryCoherent；parse 重新 replay 每个动作，因此历史日历变更与冲突不能只绕过新写入端校验。
- replay 在已有新 preparation course 后拒绝不带 atMinute 的施法；新 writer 在已有 calendar 时也拒绝无时间的施法。新副本通过 recoverySessionId 对应 course，施法不得早于其 studyEnd；所有已记录施法时间还须非递减。分钟相等允许，未添加原书没有要求的额外一分钟间隔。
- prepare runtime 从 state.level 与已记录的初始调整 INT／WIS 构造 context，使用真实 ledger；还要求已有正常生命与可行动状态。这里仍不认证尚未接入的永久／临时属性变化，不能把初始调整属性等同于任意情境下的最终当前属性。

### 独立执行的限定回归

仍只复用已有 admittedCaster('cleric')，不另造或接管四职业生命周期 fixture。内存诊断结果：

| 检查 | 实际结果 |
| --- | --- |
| 原输入：cast-first=1000、cast-last=100，rest200..440、study440..455 | complete 拒绝，原 P2 不再放行 |
| 未知 castingId、重复 ID、分钟1.5、分钟-1 | complete 全部拒绝 |
| 合法前置时间100、150，rest200..440、study440..455 | 完成，course 派生保存两个 priorCastingIds |
| 将其中一个 prior cast 的已知时间改为1000再重验 | history 拒绝 |
| 课程后来施法被倒填至0、199、440、454 | history 全部拒绝 |
| prior cast=100，课程后来施法=455 | history 通过，学习结束边界允许 |
| runtime 初始化生命后 prepare 成功，再不带 atMinute 施法 | writer 拒绝；直接追加该动作调用 replay 也拒绝 |
| 本轮新生成的副本在其 studyEnd255 之前、分钟254施法 | runtime 拒绝 |
| 同一副本在255施法 | runtime 成功；JSON 往返 parse／replay 一致 |
| 已知施法255后，再消费另一 ready 副本并倒填254 | runtime 拒绝非递减时间违例 |
| 已完成 rest0..240 中新增 other 活动100..110，附 rest 与该活动的本地 overlap ruling | 日历层虽可接受本地裁定，runtime 每动作末尾的 history 检查仍拒绝保留原准备收益 |
| 失败操作前后原 archive JSON | 一致，无部分写入 |

这一轮实际执行了限定 runtime 的 initialize-life → prepare → cast → portable parse/replay 路径，而非仅凭 helper 导出推断已集成。并未执行主 Agent 的四职业完整生命周期测试。

### UI 接线与认证边界

只读 campaign-spell-panel、controller 和 campaign-actions：表单明确要求完整休息／精神恢复与营养、休息在最新施法后且无漏记干扰、本次书本可接触或本次实际授予三项确认；神术文字明确“本地勾选不是身份认证”。readPreparationFacts 检查三个复选框后才构造对应 true 字段，action schema 使用严格 preparationFactsSchema。

尚无日历时，UI 的24小时／7天选择须用户明确勾选采用，readPreparationFacts 无勾选会拒绝，不会仅因显示控件就自动建立日历。已有日历则使用已有单位。此处是源码接线核查，没有浏览器交互、DOM 表单提交测试或远端 DM 身份认证验证。

### 本轮版本与剩余范围

```text
core-campaign-preparation.ts
D80F11D5D6CE5DA92C361850DEAE5812D426156605483C991147E0EF8A624F24
core-campaign-runtime.ts
399BA9F3413EBEAD807A07EEED8DEC1BE576F0A07DA5D9406FC05B6EAE30C090
campaign-spell-panel.ts
9C36905E8B41F772C2487E728C2B03A98E866F40D786DF2EF9E8454DE1C7F11C
campaign-actions.ts
A9CB57342DAB450129108F2819E7AC3F57128F01D725FA25E50FCACEA0754B5A
```

只更新本报告，未修改实现、测试或档案。本轮未发现需继续保持该 P2 打开的反例；关闭的是原时间一致性问题及上述限定集成条件，不是整套应用验收。未运行四职业生命周期测试、全部高环容量组合、浏览器流程、所有日历修订动作和完整秘密隔离／身份安全审计；初轮其他未测试范围继续有效。

# 核心攻击与豁免矩阵独立核验

核验日期：2026-10-17（Asia/Shanghai）。仅新增本报告；未修改规则数据、引擎、UI 或测试文件，未运行主 Agent 的 UI／整套测试任务。

## 结论

在以下限定范围内，未发现原书数值抄录、等级分组、职业对应或引擎索引造成的实际错误。完成攻击表 **588 格**、豁免表 **140 格**的逐格目视比对，共 **728 格**，不是抽样或依 THAC0 公式推算。

特别核实：同一表族在这份 DMG 的 printed 74 与 printed 79 上，攻击和豁免等级分组确实相同；但**同一职业未必使用相同表族**。武僧攻击用 cleric，豁免用 thief，所以武僧的 attackBand 与 savingBand 可以不同。当前引擎正确处理这一点。不能仅凭 `savingBands=attackBands` 判断现有返回结果错误，也不能把武僧豁免索引沿用其攻击索引。

有一项维护风险，见下文；不将其冒充当前规则错误。

## 证据与版本

核验源文件：

`X:/Games/DND/1e/__RESOURCES/CORE 3/tsr02011 - Advanced Dungeons & Dragons (Ad&D) 1St Ed - Dungeon Master'S Guide.pdf`

实算 SHA256：`7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669`，与数据文件 `combatMatrixSource` 一致。

- printed 74 / PDF 第 75 页：完整检查 I.A、I.B、I.C、I.D.1 的标题、AC 行、等级列、数值及相关页下注释。
- printed 79 / PDF 第 80 页：完整检查 I. Saving Throw Matrix for Characters and Human Types 的等级行、五个类别列、职业脚注、类别排除脚注、自然 1 说明，以及页底多职／双职／Bard 说明。
- 已按用户要求完整读取 PDF 技能。采用既有四张攻击局部图与豁免局部图放大检查；另从上述原 PDF 用 Poppler 独立重渲染两张完整页面，确认裁切没有改变行列对应、遗漏关键脚注。没有用网络、现代规则或其他版次补表。

独立重渲染页面位于临时目录，可用原 PDF 重建：

- `C:/Users/anjac/AppData/Local/Temp/adnd1e-independent-dmg74.png`
- `C:/Users/anjac/AppData/Local/Temp/adnd1e-independent-dmg79.png`

核验代码实际路径（用户所述 engine 文件位于 src/character 下）：

| 文件 | 核验时 SHA256 |
| --- | --- |
| `src/character/rules/core-combat-matrices.ts` | `393B6A0CBD62FA7801E4BACBD232BAC0C0AAB40060E8D79BDB6AA60A07532C32` |
| `src/character/engine/core-combat.ts` | `5FD7DD15D777F6FA4C7D0E88D5EC5EFE1F7ACFA0220B5D0945EBA72FD11D46D6` |

以下代码行号指上述版本。主 Agent 若随后修改文件，本报告不自动构成新版本的核验证明。

## 逐格检查范围与结果

### 攻击：printed 74

代码以 AC 为外层行、等级档为内层列。四张表均按原书 AC -10 至 10 的全部 21 行顺序检查，包括重复的 20、超过 20 的数值、0 与负数。

| 原书表 | 代码表族 | 等级列（从左至右） | 核对格数 | 差异 |
| --- | --- | --- | ---: | --- |
| I.A | cleric | 1–3、4–6、7–9、10–12、13–15、16–18、19+ | 21 × 7 = 147 | 0 |
| I.B | fighter | 0、1–2、3–4、5–6、7–8、9–10、11–12、13–14、15–16、17+ | 21 × 10 = 210 | 0 |
| I.C | arcane | 1–5、6–10、11–15、16–20、21+ | 21 × 5 = 105 | 0 |
| I.D.1 | thief | 1–4、5–8、9–12、13–16、17–20、21+ | 21 × 6 = 126 | 0 |

供定位的具体原书行（仅为证据摘录，实际检查包含上表所有行）：

| 表族 / AC | 原书整行数值 | 代码位置 |
| --- | --- | --- |
| cleric / -10 | 25,23,21,20,20,20,19 | matrices 第 16 行 |
| cleric / 0 | 20,18,16,14,12,10,9 | 第 19 行 |
| cleric / 10 | 10,8,6,4,2,0,-1 | 第 22 行 |
| fighter / -10 | 26,25,23,21,20,20,20,18,16,14 | 第 25 行 |
| fighter / 0 | 20,20,18,16,14,12,10,8,6,4 | 第 28 行 |
| fighter / 10 | 11,10,8,6,4,2,0,-2,-4,-6 | 第 31 行 |
| arcane / -10 | 26,24,21,20,20 | 第 34 行 |
| arcane / 0 | 20,19,16,13,11 | 第 36 行 |
| arcane / 10 | 11,9,6,3,1 | 第 38 行 |
| thief / -10 | 26,24,21,20,20,20 | 第 41 行 |
| thief / 0 | 20,19,16,14,12,10 | 第 43 行 |
| thief / 10 | 11,9,6,4,2,0 | 第 45 行 |

### 豁免：printed 79

按原书由上至下逐行、每行由左至右核对五格。列顺序为：麻痹／毒素／死亡魔法，石化／变形，Rod/Staff/Wand，吐息，法术。代码 savingMatrices 第 51–54 行与原书全部数值一致。

| 表族 | 原书等级行 | 核对格数 | 差异 |
| --- | --- | ---: | --- |
| cleric | 1–3、4–6、7–9、10–12、13–15、16–18、19+ | 7 × 5 = 35 | 0 |
| fighter | 0、1–2、3–4、5–6、7–8、9–10、11–12、13–14、15–16、17+ | 10 × 5 = 50 | 0 |
| arcane | 1–5、6–10、11–15、16–20、21+ | 5 × 5 = 25 | 0 |
| thief | 1–4、5–8、9–12、13–16、17–20、21+ | 6 × 5 = 30 | 0 |

容易被平滑公式误改的具体值均保留：cleric 7–9 的第一格是 7；fighter 1–2 的吐息和法术均为 17，15–16 与 17+ 的吐息均为 4；arcane 1–5 的石化／变形为 13；thief 21+ 的五格为 `[8,7,4,11,5]`。

## 职业对应与不同等级档

| 职业 | 攻击表族 / printed 74 依据 | 豁免表族 / printed 79 依据 | 引擎结果 |
| --- | --- | --- | --- |
| cleric | cleric / I.A 标题 | cleric / Clerics 行 | 一致 |
| druid | cleric / I.A 标题 | cleric / 脚注 a | 一致 |
| monk | cleric / I.A 标题 | thief / 脚注 d | 一致 |
| fighter | fighter / I.B 标题 | fighter / Fighters 行 | 一致 |
| paladin | fighter / I.B 标题 | fighter / 脚注 b | 一致 |
| ranger | fighter / I.B 标题 | fighter / 脚注 b | 一致 |
| magic-user | arcane / I.C 标题 | arcane / Magic-Users 行 | 一致 |
| illusionist | arcane / I.C 标题 | arcane / 脚注 c | 一致 |
| thief | thief / I.D.1 标题 | thief / Thieves 行 | 一致 |
| assassin | thief / I.D.1 标题 | thief / 脚注 d | 一致 |

engine 第 3–4 行分别建立 attackFamily 和 savingFamily，并覆盖 `monk:'thief'`。第 12 行分别以 `attack` 和 `save` 求 `a`、`s`，没有沿用武僧的攻击列号查询豁免。

实测武僧边界（豁免值顺序同上）：

| 等级 | attackBand | savingBand | 实际豁免值 |
| ---: | --- | --- | --- |
| 3 | 1–3 | 1–4 | 13,12,14,16,15 |
| 4 | 4–6 | 1–4 | 13,12,14,16,15 |
| 5 | 4–6 | 5–8 | 12,11,12,15,13 |
| 8 | 7–9 | 5–8 | 12,11,12,15,13 |
| 9 | 7–9 | 9–12 | 11,10,10,14,11 |
| 12 | 10–12 | 9–12 | 11,10,10,14,11 |
| 13 | 13–15 | 13–16 | 10,9,8,13,9 |
| 16 | 16–18 | 13–16 | 10,9,8,13,9 |
| 17 | 16–18 | 17–20 | 9,8,6,12,7 |

## 引擎索引及只读诊断

检查 engine 第 5–19 行：

- 分档使用包含上下界的比较；末档 `null` 表示原书的 `+`，没有在末档继续降低目标值。
- 攻击取 `attackMatrices[attack][AC行][攻击档]`，豁免取 `savingMatrices[save][豁免档][类别列]`。两种矩阵的行列方向不同，当前实现正确。
- AC 顺序为 -10..10，`ac+10` 正确映射为 0..20；没有把降序 AC 当作升序防御值，也没有归一化重复 20、0 或负数。
- fighter 的 0 级列／行实际保留在数组下标 0；1–2 级取下标 1。公共 PC 接口明确拒绝等级 0，没有因拒绝 0 级而把其余 fighter 列错移一格。

另运行一次内存中的临时只读诊断，没有新增测试文件：10 个支持职业，每职业检查 1..25 及 100 级，共 260 组。独立写入原书的等级分组、职业对应和全部 140 个豁免格作为预期，检查返回表族、两套 band 和 1,300 个豁免返回值；同时对全部 AC -10..10 执行 5,460 次攻击查询索引检查，全部通过。

这里的攻击运行检查以已人工逐格核验的数据数组为基准，只证明引擎索引一致，不能单独证明攻击抄录正确。100 级只检验原书末档 `+` 的索引行为，不证明任意职业可合法升至该等级。

同时检查：非法等级 0、-1、1.5、NaN、Infinity；非法 AC -11、11、1.5、NaN、Infinity；未知职业、Bard 直接查询均抛错。战士可选每级进步在 1..17 范围内默认返回 0，启用后偶数级返回 +1；18 级和 paladin 启用该限定接口会拒绝。该限制已经在接口／注释中明示，未按完整子职业可选规则实现来认证。

## 脚注与实际限制

- printed 74：Bard 使用最高战士经验等级；代码 notes 提示这一点，直接传 `bard` 会拒绝。未认证完整 Bard 历史解析功能。
- printed 74：飞射武器远距 -5、中距 -2；盗贼／刺客背刺倍率及战士可选每级 +1 均有原书依据。基础矩阵接口未自动合并这些修正，notes 声明排除距离、背刺等；此处未把基础目标值误当最终命中裁定。
- printed 79：变形魔杖不使用石化／变形栏；造成石化／变形的吐息不使用普通吐息栏；已指定其他豁免类型的法术不使用普通法术栏。notes 包含这些排除规则，但本接口未实现按攻击效果自动分类。
- printed 79：自然 1 总失败。notes 有声明；本模块只返回目标值，没有掷骰／成功判定，未认证实际判定流程。
- printed 79 页底：多职、双职、Bard 按各实际职业表对当前豁免类别择优。`mostFavorableBaseSaves` 按五列各取最小值，基础数值方向正确；临时检查 cleric 1 + thief 1 得 `[10,12,14,16,15]`。没有据此认证职业权限、双职限制、Bard 全部履历或上层调用是否完整传入履历。
- 未核验能力值、种族、魔法物品、职业特别加值、武器对护甲、熟练、实际伤害、生命值、战斗流程、怪物表、UA 或其他扩展规则；未覆盖 UI 显示、存档迁移及主 Agent 测试。基础表正确不等于这些功能已经实现。

## 发现清单

**实际规则／数值／索引错误：本次范围内为 0，故无可列出的错误格及修正值。**

**维护风险（非当前错误）：** matrices 第 48 行 `savingBands=attackBands` 将两者绑定为同一对象；engine 第 7 行 `band()` 固定读取 `attackBands`，第 12 行求豁免档时也调用它。就本次原书四表族而言，其分组相同，且武僧先正确切换了表族，所以目前没有返回值错误。如果未来单独改变 `savingBands` 或引入攻击／豁免分组不同的表，引擎仍会按攻击分组求豁免索引，可能令展示档与取值档不一致。建议未来维护时将分档函数接收对应 band 表，并保留分别列出的原书依据；本次按要求没有实施修改。

不能以现代版次的豁免进步方式来“修复”当前与 DMG 页图一致的分组。任何后续改表都应给出相应原书页图证据。

## 追加复核：防御事实、派生 AC 与界面边界（2026-10-17）

### 本轮范围与版本

本轮按用户要求追加检查 `src/character/engine/core-defense.ts`、`src/character/workflows/core-campaign-runtime.ts` 的 `record-defense`／库存变更／重放路径、`src/character/application/campaign-sheet.ts` 和 `src/character/ui/campaign-combat-panel.ts`。为追踪校验与写入边界，另阅读设备合法性、库存位置校验、`actions/campaign-actions.ts` 和 controller 的相关代码。只修改本报告，浏览器验证由主 Agent／用户负责。

本轮文件 SHA256（依上述四个主要文件顺序）：

```text
core-defense.ts:          EB465DF8945DCA32DD9E840D2DC9BC858948493B0DA22F7B80C923F24B18D49C
core-campaign-runtime.ts: 9FE23F9B636EB52A61060AE65D7D8BDC5EBCE5DC656E5F1F17111B652169C12D
campaign-sheet.ts:        51972EC95FCCB18FB947FEEFBF644B8F8C4FF39589C3E29D9303863BF5D0BA1D
campaign-combat-panel.ts: 1B6F3837B2F50DC85B095142A0370DD4D2DEC7A7EF12B8C858D8F7A65D3C8661
```

### 先前分档风险已消除

已读新版本：`savingBands` 独立列出四组分档，`band(bands,family,level)` 接收对应表；攻击传入 attackBands，豁免传入 savingBands。先前发现清单描述的是旧版本，**该维护风险现已解决**。这次检查确认分档接线正确；未再次重复全部 728 格人工核对，不将本轮代码读取冒充第二次完整逐格核验。

### 原书页图证据与数值结果

PHB 文件为 `X:/Games/DND/1e/__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf`，本轮实算 SHA256 为 `E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213`。

本轮目视读取用户指定的完整临时页图：

- `adnd1e-dex-defense.png`：printed 11 / PDF12，Dexterity Table I 与 Defensive Adjustment 注解及算例。
- `adnd1e-monk-check-031.png`：printed 30 / PDF31，武僧无 DEX 护甲调整、不能穿甲用盾、攻击／豁免说明。
- `adnd1e-monk-check-032.png`：printed 31 / PDF32，Monks Table II 全部 17 个 Effective Armor Class。
- `adnd1e-armor-check.png`：printed 36 / PDF37，Armor Class Table 与盾牌方向／次数限制。

另独立从原 PDF 重渲染 printed 19 / PDF20，检查 Character Classes Table II 的护甲／盾牌许可列，临时图为 `C:/Users/anjac/AppData/Local/Temp/adnd1e-independent-phb19.png`。没有用其他版次补足许可。

核验结果：

| 内容 | 原书值／依据 | 代码结果 |
| --- | --- | --- |
| 无甲、只持盾 | 10、9 | 明确确认无甲无盾后为 10；普通盾适用时减 1 |
| leather、padded | 8、8 | 一致 |
| studded、ring | 7、7 | 一致 |
| scale、chain | 6、5 | 一致 |
| splint、banded、plate | 4、4、3 | 一致 |
| DEX 3..18 | +4,+3,+2,+1,0,0,0,0,0,0,0,0,-1,-2,-3,-4 | 16 项全部一致 |
| 武僧等级 1..17 | 10,9,8,7,7,6,5,4,3,3,2,1,0,-1,-1,-2,-3 | 17 项全部一致，重复值保留 |

DEX 符号正确：PHB11 算例 plate + shield 基础 AC2，DEX3 为 AC6，DEX18 为 AC-2。实现采用 `base + adjustment - shield`，不是把高 DEX 的负调整再反号。对普通人物超出 DEX3..18 返回待 DM；武僧忽略 DEX 护甲调整并按等级选独立表，超过 17 级拒绝外推。

职业许可检查与 PHB19 护甲／盾牌列相符：cleric／fighter／paladin／ranger 任意甲盾；druid 仅皮甲木盾；magic-user／illusionist 无甲无盾；thief 仅皮甲无盾；assassin 仅皮甲但可盾；monk 无甲无盾。core-defense 先调用职业校验再取武僧 AC，未出现武僧穿甲后仍享独立 AC 的放行路径。普通盾未指定材质时，仅对原书允许任意盾的职业放行，未将其猜成德鲁伊可用的木盾。本轮没有重审武器许可列及整套特殊装备规则。

PHB30 文字称武僧攻击使用盗贼表，与 DMG74 I.A 标题包含武僧存在冲突。UI 源码在武僧的攻击依据详情中明确提示冲突并声明采用 DMG；本轮不以 PHB30 静默改写前轮核验的 DMG 矩阵。这里只确认提示文本及条件存在，没有验证浏览器中实际展开效果。

### 具体缺陷：[P2] 位置变更不能完整使旧穿戴事实失效

位置：`src/character/engine/core-defense.ts` 第 28–30 行，结合 runtime 的 `consume-item`／`relocate-item` 分支和 application 每次读取防御选择的路径。

`item()` 只在当前位置是 `container` 时向上追溯；一旦遇到 `character` 或 `worn` 就放行，既不区分甲是否已放入背包，也不验证 `worn` 的所有祖先是否仍属于人物。runtime 在迁移物品后保留旧 defense 选择；application 重算虽避免数值缓存，却会再次接受这份与新位置矛盾的穿戴事实。

以下两个场景均用内存中的合法 CoreInventoryLedger、公开的 `relocateInventoryItem()` 和 `coreDefense()` 实际复现，不是浏览器猜测。战士 1 级、DEX10，甲实例 `a=armor-plate`，盾实例 `s=shield-small`，已确认穿戴，初始 AC2。

1. **已确认的甲移入随身背包，旧 AC 仍生效。** 位置结构为 `bag(kind=container,parent=pc)`、`pc(kind=character)`。将 `a` 从 `worn` 移到 `bag`，不再确认穿戴，沿用原 selection。实际仍返回 `status:'calculated', ac:2, withoutShield:3`。没有自动从背包首次选甲的问题，但已经发生的“收进背包”也没有撤销旧穿戴事实。至少应变为待重新确认；不应将“仍随身持有”直接当成“仍穿在身上”。
2. **仓库下面的 worn 子位置绕过随身位置检查。** 位置结构为 `foreign-worn(kind=worn,parent=store)`、`store(kind=storage,parent=null)`。将同一甲移到 `foreign-worn`，该账本通过现有库存验证，但仍返回 AC2；因为循环在 worn 处停止，根本没有检查其 storage 祖先。直接移入 store 则会正确返回待 DM，说明子位置路径确实绕过了现有仓库限制。该分支不要求用户实际通过浏览器创建这种位置；现有账本验证和引擎公开 API 已允许该结构。

两者归为一项“穿戴事实与位置变更的失效规则不完整”，不是重复报告两个数值缓存缺陷。建议明确实际穿戴与随身容器的关系：移入容器／移离人物时让相关 selection 待重新确认，并完整核对位置祖先；或者采用一致的明确穿戴位置约束。仅检查物品 ID 仍存在不足以解决。具体改法由主 Agent 决定，本轮未修改实现。

### 已确认的安全边界

- **不默认背包穿戴：** 无 selection 时立即返回待确认、AC null，不扫描库存挑选最优甲。UI 甲盾选项默认均为明确“无甲／无盾”，另有 required 团桌确认复选框；只有动作确认后才记录 selection。这里不等于已经解决上面的后续位置变更问题。
- **物品真正丢失后不保留 AC：** 用 `consumeCoreInventoryItem()` 删除甲实例后，沿用旧 selection，coreDefense 返回 AC null；直接搬入 storage 也返回 null。只是不能把这两个通过场景推广为所有嵌套位置均安全。
- **原始事实与派生数值：** schema 严格限制为 armorItemId、shieldItemId、ordinaryEquipmentConfirmed、note；额外提交 `ac` 会被拒绝。runtime `record-defense` 校验当前职业／等级／库存后仅存 selection。application 使用当前库存及当前等级重新调用 coreDefense，未存储 AC 数值缓存。
- **实际 runtime 路径：** 以仓库现有 `real-sheet-fixture.adnd1e-campaign.json` 在内存中执行一次明确无甲无盾的 record-defense，重放解析成功，sheet 由待确认变为 AC10。检查持久模块中的 defense 只有上述四个原始字段，未带 ac、withoutShield 或 dexAdjustment。
- **创建属性不是当前全部属性：** application 从 evaluateCoreEligibility 的创建调整 DEX 派生参考 AC；UI 显示“创建DEX调整”，并声明其他永久／临时修正尚未接入。当前 AC 只能认证为这种限定参考值，不能认证为已有所有实际 DEX 变化的最终 AC。
- **玩家显示边界：** panel 读取 CampaignSheet；物品标签经 HTML 转义。基础豁免标成未合并种族、职业特别加值等，攻击也有情境修正排除说明。盾牌方向与每轮次数限制仅提示、不自动判定；这与本轮基础参考 AC 的范围相符。

### 本轮实际检查和未测试范围

独立临时内存诊断已执行：16 个 DEX 点；9 种普通甲各有盾／无盾；武僧 1..17 各用 DEX15、18 对比；monk／magic-user／illusionist／thief／druid 穿板甲加盾拒绝；删除甲、移至 storage、移至背包和仓库 worn 子位置；拒绝 selection 注入 ac；一次真实 fixture 的 record-defense／重放／sheet 派生及原始字段检查。上述数值／拒绝断言通过，两个嵌套／容器场景按上文产生错误 AC。

本轮没有运行主 Agent 整套测试、没有浏览器操作、没有保存或更改 fixture。两种位置缺陷在库存引擎加防御引擎层实测；其 runtime／application 传播路径是代码追踪，未额外构造完整 admission 历史进行端到端库存迁移重放。未验证多职／双职／Bard、魔法／特殊装备、负重与可闪避条件、穿脱时间、手部占用、盾牌攻击方向计数、生命状态对当前情境 AC 的影响、永久／临时 DEX 变化或实际命中结算。没有重新认证 728 个攻击／豁免格，也没有把字段严格校验视为整套应用安全审计。

## P2 修复复核与关闭（2026-10-17）

**结论：关闭上述 P2“位置变更不能完整使旧穿戴事实失效”。** 此结论针对位置检查的修复版本，不扩展为整套防御或 UI 验收。上文缺陷记录保留作历史证据。

已复读 `core-defense.ts` 的 item 位置校验：先要求物品当前位置为 character／worn，再遍历完整祖先链，每一级同样必须为 character／worn。container 不再因父级是人物而放行；worn 下有 storage、container、companion 祖先也不再放行。遍历前仍调用库存账本校验，父位置缺失与循环由既有校验拒绝。代码没有为修复而搬动物品、挑选替代甲或写入派生 AC。

本轮独立执行内存诊断，沿用上一轮的 plate + small shield、fighter1、DEX10、已确认 selection；使用公开 relocateInventoryItem 移动物品后重新求防御：

| 位置场景 | 原 P2 对应 | 修复后实际结果 |
| --- | --- | --- |
| 甲／盾移入人物随身 bag(container) | 原场景 1 | 两者均 needs-dm，ac=null，withoutShield=null |
| 甲／盾移入 worn-under-storage | 原场景 2 | 两者均 needs-dm，ac=null，withoutShield=null |
| 甲／盾移入 worn-under-container | 同一祖先链风险的补充边界 | 两者均 needs-dm，ac=null，withoutShield=null |
| 甲／盾移入 worn-under-companion | 同一祖先链风险的补充边界 | 两者均 needs-dm，ac=null，withoutShield=null |
| 正常 worn → character 位置链 | 正常路径 | calculated，AC2 |
| 甲盾直接位于 defaultcharacter 人物根位置 | 用户指出的真实档案兼容路径 | calculated，AC2；无 selection 仍为 AC null |

共 8 个拒绝场景检查通过，每次求值前后库存 JSON 一致，未发生自动搬运。defaultcharacter 是本轮内存样本中人物根位置的 ID，其类型为 character；实现按 kind 校验，不要求特定 ID。该结果支持真实 UI 档案继续沿正常人物根位置路径恢复，但本轮没有实际操作或恢复浏览器中的真实档案。

另已阅读 `scripts/test-core-combat-defense.ts` 新增的 container-under-self、worn-under-vault 两个回归场景，确实分别覆盖原两个复现结构；本轮未重复运行该完整脚本，独立运行的是以上限定诊断。

本次核验版本 SHA256：

```text
core-defense.ts: 1D4D5D23A2ED0A032F3E49F5F991DE28612BED13C154F8E91AEA1FB0EBB35B0F
test-core-combat-defense.ts: 78DC454DA2CE1E6C06206389D17B1A6F724712F416A9A08A44ABE70511E6C2C1
```

只追加本报告，未修改主代码、测试或档案。本轮未做浏览器验证、完整 runtime 位置迁移历史重放、全部矩阵再次逐格核验；前述其他未测试范围仍有效。

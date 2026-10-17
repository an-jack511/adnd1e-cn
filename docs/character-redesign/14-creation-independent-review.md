# 实际创建入口独立审查

审查日期：2026-10-17。身份：本次新启动的独立审查者；未继承或采用失联 agent 的研究结论。本报告是一位审查者的结果，不代表已完成三位专家会签。

结论：已复现 3 项 P2 问题，不建议把当前界面宣称为“取得事实和部分进度无损保存、审查导入与保存互斥”已验收。新 writer 的账本重放边界、legacy 读取兼容、同角色战役槽拒绝覆盖，在下述已执行测试中通过。未修改业务实现；仅新增本报告及 `scripts/test-creation-independent-entry.ts`。

## 范围与证据边界

主读文件：

- `src/character/workflows/core-arcane-creation.ts`
- `src/character/workflows/core-creation-entry.ts`
- `src/character/ui/core-arcane-book.ts`
- `src/character/ui/core-initial-spells.ts`
- `src/character/ui/core-review-controller.ts`
- `src/character/ui/core-candidate-controller.ts`

为追踪入口，补读了 spell acquisition / ledger 引擎、creation storage、campaign browser storage 及相关 fixture、测试。工作区原有大量已修改/未跟踪文件，均按原状读取，未整理或回退。报告结论针对当时工作树，不是针对干净 HEAD。

规则证据只复核仓库现有材料：`src/character/rules/core-spell-acquisition.ts` 的 PHB 原书 p.10 / PDF p.11、DMG 原书 p.39 / PDF p.40、PHB 幻术表 p.42 / PDF p.43 来源登记，以及 `src/published/books/phb/intelligence.md`、`src/published/books/dmg/dmg-character-spells.md` 的现有正文。本次没有新开 PDF 研究，也没有引用后世规则。fixture 与测试骰点只作为程序输入，不作为规则证据。

UI 复现通过小型 DOM / 事件替身直接调用真实 renderer 与注册的 controller handler；异步文件读取及数据库失败时机由测试控制。不是浏览器截图或端到端测试，没有声称验证布局、原生事件规范或真实 IndexedDB 事务。尤其第三项只将数据库打开挂起再注入失败，观察真实 controller 在等待期的状态变化。

## F1 · P2：保存合法导入账本时丢失原取得证据

位置：`src/character/ui/core-arcane-book.ts:44`、`:54`。

复现：用正式 adapter 生成一份通过 `assertArcaneCreationLedger` 的 MU 创建记录，包含原始来源 ID `original-source-0`、转录 ID `original-copy-0`、实际费用 2 gp、实际耗时 30 分钟及明确 ruling ID。将其交给 `renderInitialSpells` 恢复，不改任何字段，点击“保留当前骰史与取得进度”。

实测：新 input 的第一条 acquisition 变为 `independent-entry-mu:initial-source:read-magic` / `independent-entry-mu:initial-copy:read-magic`；`actualCostGp`、`actualDurationMinutes`、`rulingId` 三字段消失。其余取得项同样被重建。来源名称与成功结果仍在，所以界面看起来保存成功。

原因：恢复时只读取来源名称、访问确认及结果；保存时从控件重新创建整条 acquisition，没有合并原条目的额外事实。相同行还将原 `adoption.sourceIds` 替换为固定 PHB/DMG 来源，原战役采用引用也不能无损往返（此项由源码确认，不是独立失败断言）。

影响：用户合法导入的实际账本在普通保存中失去成本/时间/裁定，并改写已记录实体身份。adapter 的重放校验不能识别这类丢失，因为 input 本身已经被 UI 改写，随后 ledger 会围绕新 input 合法重建。

建议：保留既有条目的 ID、实际费用/时间、ruling 与采用证据，只更新界面明确编辑的字段；不要把这些缺少编辑控件的事实默认为不存在。

对应失败断言：`checkpoint must preserve an already valid imported acquisition including IDs, cost, duration and ruling`。

## F2 · P2：部分保存会悄悄丢弃尚未选结果的来源填写

位置：`src/character/ui/core-arcane-book.ts:53`、`:58`。

复现：恢复一份已明确战役采用、尚未完成 Ctk/取得的 pending 记录。在“阅读魔法”行填写真实导师名称 `Entered actual teacher`，勾选已确认来源访问，暂不选择实际取得结果。点击“保留当前骰史与取得进度”，只用保存后的 document 重新渲染，等价于保存后重新打开。

实测：导师名称恢复为空，访问勾选恢复为 false。保存调用并未报错。

原因：`actual=acquired.filter(...)` 要求名称、访问确认、outcome 三者齐备才写入。partial 参数仅放宽整体完成检查，未保存未完成行。

影响：按钮宣称保留取得进度，但这类实际输入完全不进入可导出的 document。这里不要求把未知结果填成 success/failure，也不要求把草稿来源直接记为已取得。

建议：单独保存行草稿与正式取得事实，恢复时同时还原；未知 outcome 继续保持未知，不能为满足 schema 捏造结果。

对应失败断言：`partial checkpoint must retain a confirmed source label while its outcome is still undecided`。

## F3 · P2：较早开始的异步文件读取可穿过入场保存保护

位置：`src/character/ui/core-review-controller.ts:51`、`:54`、`:56`。

复现时序：

1. 打开已经 admitted 的 A。
2. 选择 B 文件，令 `file.text()` 暂未完成；change handler 已通过 `entering` 检查。
3. 点击 A 的正式入场按钮，令数据库打开等待。此时已捕获 A 的保存快照，`entering=true`，按钮 disabled。
4. 让 B 的 `file.text()` 完成。

实测：保存仍未返回，摘要已经变成 `Slow incoming B · 修订 12 · admitted`，且 `review-enter.disabled` 变为 false。另测在步骤 3 后新启动的 change 确实会被“正在保存”拒绝，漏洞特指步骤 2 已在途的 continuation。

原因：只在 await 前检查 `entering`，await 后直接 `current=parsed; render()`；render 的入场按钮状态只依据 admitted，未纳入 entering。

影响：保存 A 时可显示并导出 B，保存成功后的导航仍指向 A，形成当前记录与操作对象错位。不要夸大为同槽覆盖：捕获快照及 expected-null 检查仍保护 A 的持久化对象；即使按钮重新启用，click handler 的 entering 检查仍拦住第二次提交。

建议：文件读完成后重新验证 I/O 状态及读请求代次；或让导入与入场共享排他状态，render 也应考虑保存状态。较旧的读取不能覆盖较新选择。

对应失败断言：`file read begun before entry must not replace current or re-enable entry while campaign save is pending`。

## 本轮通过的边界

- 新 writer 通过 `assertArcaneCreationLedger` 重建输入、计划、Ctk、容量和公开账本；plan-only / 无标记 legacy 不能冒充新入口证据。原低层 parse 与历史 archive 重放未被该 guard 替换。legacy MU 的 parse 通过，而新 campaign 入口拒绝。
- 显式 adoption 包含采用策略、DM、时间、理由与 sourceIds；实现将 PHB10 与 DMG39 关系标为战役解释，`rawCertification=false`。这不证明其为唯一 RAW 解释，也不认证 bounded 初始表为完整 PHB 法术清单。
- MU/幻术师现有 adapter 测试通过：取得只限实际初始计划；幻术师可理解 7 项时书内仍只有 3 项；未自动准备，未用 INT minimum 补书。实际费用/时间未知时不编造零值。
- 本次独立脚本另验真实失败 d100=100 被恢复显示，checkpoint 后原骰史及随机方式保持一致；空 acquisitions 不生成来源或结果；重算授予按钮不能静默替换已有骰史。已写入 document 的 pending input 经 JSON roundtrip 保留。F2 是尚未写入的行草稿被过滤，不能据上述通过项宣称部分表单完整保存。
- 同角色/分支进入现有 campaign writer 时传 expectedToken=null；重复保存被拒，存储字节和创建源记录保持不变。这里的独立测试使用内存 CAS port，真实浏览器 IndexedDB 事务不在本次端到端验收范围内。
- candidate controller 静态检查：本地保存抓取快照，在锁内调用有 expected-base 校验的创建库；保存期间新改动会阻止自动跳转。恢复后仍使用同一 ID，不另造角色。本次未建立完整 candidate 页面 DOM，不能将此项当成页面集成实测通过。

## 执行与结果

运行环境：工作目录 `X:/Games/DND/1e/adnd1e-cn`；bundled Node 路径如下。新增脚本可重复运行，不写任何角色库或业务文件：

```powershell
& 'C:/Users/anjac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' --import tsx scripts/test-creation-independent-entry.ts
```

新增脚本实测：3 组 PASS，3 组 FAIL，Node 退出码 1。FAIL 是对期望行为的真实失败断言，不是“成功复现 bug 所以测试也算通过”。脚本继续执行所有检查，因此能一次列出三项问题。

已有定向测试实际执行结果：

| 测试 | 结果 |
| --- | --- |
| `scripts/test-core-arcane-creation.ts` | PASS |
| `scripts/test-core-creation-entry.ts` | PASS |
| `scripts/test-core-creation-storage.ts` | PASS |
| `scripts/test-core-creation-lifecycle.ts` | PASS（fighter 创建与事件重放） |
| `scripts/test-core-spell-acquisition.ts` | PASS |
| `scripts/test-core-editor-io.ts` | PASS（通用 I/O helper，不代表 review controller 已集成） |

未运行完整 character suite、构建或浏览器端到端验收。

## 主读源码快照 SHA-256

用于区别并行工作可能继续修改的源码版本，不代表对整个工作树做了快照：

| 文件（相对于 `src/character/`） | SHA-256 |
| --- | --- |
| `workflows/core-arcane-creation.ts` | `EACA5235BC65523D48908DF6FF3011394DC2EB77E495281A7B4EC1A6F4C8BFC2` |
| `workflows/core-creation-entry.ts` | `53E83C7A12ECA4DC86AA93D3E68F7C22C01C8279507205DB234DCC47EB9D20CB` |
| `ui/core-arcane-book.ts` | `4950949F783FE5DB07D5CB5C42CD7F4A46DD409E39A6D316607362A1F175D3FD` |
| `ui/core-initial-spells.ts` | `7B5267FE0D7E1AF5FB9E03F1A3389A6980693249E96EA0ACA85A8FD84BF1AF00` |
| `ui/core-review-controller.ts` | `C3156AF76EB5D6EA88751B15FFF39EF83B8AD129A719342FF787B5E00DB0FC42` |
| `ui/core-candidate-controller.ts` | `224AE159D717EFA86B2ADD240EAC7A82FA8D206E0FACDF91870022DCF1831409` |

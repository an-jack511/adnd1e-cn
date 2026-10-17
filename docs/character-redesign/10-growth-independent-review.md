# 新成长接入独立限定审查

日期：2026-10-17。初轮发现 **2 项 P2**：普通成长付款不能记录部分实付；超过明确数字上限的资格例外仍可误标为普通事实确认。**两项均已在文末追加修复复核中关闭。** 原反例保留作历史证据。未修改实现，不要求重写旧成长引擎；限定复核不等于整系统或十职业完整验收。

## 实际范围与证据

主要读取：

- `src/character/application/campaign-growth.ts`
- `src/character/actions/growth-actions.ts`
- `src/character/actions/campaign-actions.ts` 增长分支
- `src/character/workflows/core-campaign-runtime.ts` 训练确认、付款、日历分段、授级与写入／重放边界
- `src/character/ui/campaign-growth-panel.ts`

必要依赖读取：core-training、core-training-stage、core-progression、core-advancement、core-dated-training、core-overrun-training、库存实付／找零、职业能力公开投影，以及 controller 的增长入口接线。

原书证据为完整页图 `C:/Users/anjac/AppData/Local/Temp/adnd1e-growth-dmg86.png`，核对 printed86 / PDF87 的 Gaining Experience Levels、公式、名号表、四族收费、连续训练与 XP 阻断段落。沿用本聊天已完整读取的 PDF 技能；未使用现代版次规则。DMG86 只列名号文字，名号对应等级使用已有 PHB 数据依赖；本轮没有再次渲染所有十职业 PHB 等级表。

复用现有 admittedFighter() 做纯内存诊断；另对少量边界使用 newCoreAdvancement 构造独立状态输入，不伪造准入档案。未改写或新增 fixture，未接管 `scripts/fixtures/admitted-core-character.ts` 的十职业验收。没有跑 suite、build 或浏览器。

并发开发说明：读取过程中主 Agent 已加入 gate classification；因此不将早期“没有分类字段”的状态作为最终缺陷。下面第 2 项在加入分类后的代码上再次实际执行，仍可复现。

## P2-1：付款适配器强制付清，无法忠实记录部分实付

位置：growth-actions.ts 第17行 pay schema、第54–59行 buildGrowthIntent 的 pay 分支；campaign-growth-panel.ts 第47行付款表单、第62行读取分支。

付款动作没有本次付款金额字段，schema.strict() 还会拒绝额外 amountCp。适配器始终把 amountCp 设为整个 remaining，且提前要求所选钱包的全部折值足够支付整个余额。手动 tender/change 也只是在这个固定全额下记录面额，不能表达实际支付的一部分。

### 可复现输入路径

1. 使用原有 admittedFighter()，明确当前HP7。
2. 通过 previewSheetAction → commitSheetAction 分别录入两次最终冒险结算：XP100／E、XP10000／S。
3. 打开候选，选择当前1级的导师路线，记录真实导师。等权平均为3/2周，费用为1×1500×3/2=2250gp，即450000cp；不是按候升2级收费。
4. 初始 purse 只有199gp160cp。提交：

```json
{"type":"character.growth.pay","walletId":"purse","exactCoinsConfirmed":true}
```

实际抛出“所选钱包余额不足”。尝试在此动作上增加 `amountCp:20000`，schema 直接拒绝。即使打开实际找零栏填写交付100gp、无找零，适配器仍按450000cp应付款处理，并不能记录已经发生的100gp预付。

5. 对同一未改写的 archive，直接调用现有 commitCoreCampaignAction，输入：

```json
{
  "type":"pay-training",
  "amountCp":20000,
  "walletId":"purse",
  "tender":{"cp":0,"sp":0,"ep":0,"gp":100,"pp":0},
  "change":{"cp":0,"sp":0,"ep":0,"gp":0,"pp":0}
}
```

实际成功，candidate.paidCp 在新公开 view 中为20000，余款430000cp；该付款没有跨钱包、换币或借贷。说明旧 runtime 已支持独立实付，是新动作层丢失了表达能力。

影响：已经实际分次支付的课程，或分放在不同钱包且需逐笔实付的正常记录，无法经此 UI 忠实录入；不能靠虚构收入或临时降低课程总价来代替实际付款。这里**不主张 DMG86 强制导师接受分期**；反例前提是团桌已实际发生、旧引擎亦可记录的预付。全部费用付完才能开始课程的检查应继续保留。

建议仅扩展新动作／表单支持本次正金额，限制不超过余款，并使用该金额检查所选钱包及 tender−change；不需要修改底层付费引擎，也不自动组合钱包。

## P2-2：明确超过数字等级上限仍能标作 factual-confirmation

位置：growth-actions.ts 第23行分类枚举、第65行 gate 映射；campaign-growth-panel.ts 第52／67行；必要依赖 core-advancement.ts acceptAdvancementGate 第40行。

最新 UI 已明确提供 `factual-confirmation` 与 `campaign-exception`，这是有效改进。但两种分类都无条件送到 accept-gate，数字上限违例没有被约束为 campaign-exception。旧依赖只验证枚举合法，便从 eligible-needs-dm 切至 training-planned。

### 实际执行的最小状态反例

```ts
const pending = openAdvancementCandidate({
  ...newCoreAdvancement({
    classId:'fighter', level:1, xp:2001,
    constitution:12, levelCap:1,
  }),
  assessments:[{
    id:'r', xp:2001, rating:'E',
    sourceIds:['dmg:86:gaining-levels'],
  }],
});
const result = acceptAdvancementGate(pending, {
  actorId:'local-dm',
  reason:'Actual qualification confirmed',
  classification:'factual-confirmation',
});
```

实际返回：levelCap仍为1，candidate.targetLevel=2，status=training-planned，candidate.dmDecision.classification 为 factual-confirmation。history 同样将这个决定记录为 factual-confirmation。调用前的检查理由已明确为“目标等级超过已采用上限1”，并非尚待查明的空上限。

这是独立状态层反例，不是假称原书任意某种族战士上限为1，也未声称通过已准入的特定种族完整浏览器流程。新动作映射及 UI 选项均允许原样传入此分类，未在适配器封住上述依赖路径。

影响：实际达到某个名额／挑战资格，与越过已明确采用的硬上限，应能从公开记录区分。当前仅增加一个任意可选分类，仍会把需要明确战役例外的放行记录为“事实已成立”；一个确认框也不认证操作者为 DM。

建议在新的增长适配器至少检查数字 levelCap 与 targetLevel，超出时要求 campaign-exception，并保存／显示该性质；不要自动替用户选择例外。其他 gates 要按实际事实和采用依据分类，不能把所有门槛一律标成房规，也不需借此改写整套旧引擎。旧无 classification 的历史能否重放，应与新动作的分类约束分开处理。

## 已通过或未发现差异的接线

### DMG86 费用、评分与阶段

- 当前等级收费：名号前 currentLevel×1500gp／周。动态检查1级候升2级仍按1级；没有目标等级多收费。
- 每次冒险等权：输入XP100/E与XP10000/S，得到3/2周，不按XP加权。名号前导师总费2250gp，自修总费4500gp。
- 名号前平均严格小于2才允许自修；平均正好2的 self 诊断已拒绝。自修耗时加倍，同时以相同周费计算总费加倍，没有仅加时间漏加费用。
- 按已经取得名号判阶段：纯状态检查 fighter8 仍 below-name；fighter9 走 name-level，周费9000gp（9×1000）。没有因下一等级会达名号提前切换。
- DMG86 四个明确名号后族为 cleric2000、fighter1000、magic-user4000、thief2000 gp／级／周。monk7 未给 costFamily 时拒绝，不默套 fighter；新 plan 动作对未列族还要求 overrideReason。手动采用收费族是战役处理，不认证为原书已将此职业归入该族。

### 精确分数与费用替代

- parseTrainingWeeks('1.45') 实际得29/20，'3/2'得3/2。剩余进度使用 BigInt 有理数相减，不按显示小数扣进度。
- 七次评分 E,E,E,E,E,E,S 得8/7周；原式费用不足整cp时 printedTrainingCostCp 返回null，未四舍五入。UI 可显式输入采用金额并必须带理由。
- 无法整分钟记录的分数课程不会自动近似；calendar 的 trainingSegmentMinutes 会拒绝超出分钟精度的值。该边界需明确 DM 时间处理，不能把本次检查扩展成所有有理数日历均可直接记账。

### 实际钱包与找零

- XP结算和钱币收入为独立动作；收入不重新授XP，也不把账面折值自动换成gp。
- 自动实付只选指定钱包已有面额，不能凑足时拒绝；没有自动找零或跨钱包借款。手工 tender/change 需同时提供，底层严格检查净额与库存。
- 独立检查一笔明确服务／现金替代后的301cp课程：实际交付2gp，找回99cp；钱包准确减2gp、加99cp。没有把找零猜成原钱包已有面额。这证明手动找零本身可用，不消除 P2-1 的分次金额缺失。

### 连续时间与实际HP

- 原有 admittedFighter 的限定路径已实际经过新 preview/commit：初始化 → 两次XP → 开候选 → 导师计划 → 付款 → 配置日历 → 开训 → 两个3/4周分段 → 正式授级 → 确认实际HP。
- 使用1440分钟／天、7天／周时，每个3/4周为7560分钟；第二段从7560接续，课程结束15120。若第二段从7561开始，runtime 拒绝不连续。
- 授级使用 dated award，强制 consequencePolicy v2、locationPolicy v1，经课程占时、连续地点与其他活动后果检查；不按电脑时钟完成。换地点、已有活动冲突或历史分段缺时间等问题可转高级工具，不将相关例外猜成兼容。
- 本次实际生命骰5：最大HP从7到12；授级后 currentHp=null、hpSettlement=needs-dm，未自动治疗。随后明确确认实际当前HP7，值仍为7。
- 本轮没有穷举每一种时空冲突／例外操作；此处通过的是同地点无冲突的上述路径及一个不连续反例。

### Overrun 与裁定

- 同一批XP越过后续门槛后，仍只实际取得一级，下一课程不能跳过训练或凭空增加评分。
- 实际授到2级后采用上轮评分：新适配器从 previousCoreCourseAssessments 取完整两项，保留100/E、10000/S，未选择较好子集，XP仍10100。
- 底层采用记录带 campaign-adoption-not-unique-raw；新 UI 同样说明这是战役解释，不冒充唯一RAW。授级后的 archive JSON往返 parse/replay 已通过。
- plan-training.confirmation 是 optional：新 UI 适配器始终写入真实导师姓名／自修null与条件确认，runtime 对给定 confirmation 做一致性校验；原始 action 留在 archive 中。未给 confirmation 的旧历史兼容性未被本次升级为身份认证承诺。新 raw writer 是否也必须强制该字段并非当前代码已有保证；本轮不把它当成新 UI 的校验绕过或额外 P2。

### 公开投影

campaignGrowth 输出有限的评定、钱包、课程、能力差异等字段，不直接返回整个 archive；成长状态读取 helper 虽返回 archive/state，但供动作构建使用。职业能力变化调用 projectCapabilitiesForPlayer 过滤私密条目；字符串进入面板前有转义。成长预览保存计划并核对原 archive 指纹，实际提交再经过现行 writer；不是把显示预览当已应用状态。

这些是代码范围内的公开边界检查，不是任意恶意存档、全部秘密数据或 DM 身份体系的全面安全审计。

## 版本与未测试范围

记录最后读取的主要文件 SHA256（本轮主 Agent 仍并发开发）：

```text
application/campaign-growth.ts
3FA3266D92A62DBB7F856A9F0EF756A018F3ECB3FDB363F7209A0338B32CDE0D
actions/growth-actions.ts
3F232A6194FD35FD1293663A61B2F453B44C5060E37FE4B6C3E48987805305B8
actions/campaign-actions.ts
184DB9522D3A07871AAA9D259DBB0EDBE3A2AD596F2357EEE3F5308E9BA2FF91
workflows/core-campaign-runtime.ts
55DD7C050F1F4C587EE84C0BB458E8A34ABF3117656C0ACD3DED771CE513C417
ui/campaign-growth-panel.ts
FA9DBC226C70BA888BE537F5A8394479FE9C7FF49A4B1DFEC707A040E39C9E25
```

只新增本报告。没有运行十职业真实准入增长测试、浏览器、整套suite或build；没有构造新的fixture；没有独立核完全部职业名号等级表、所有种族上限、名额挑战、多职／双职／Bard、全部世界活动兼容性、实际移动证明和历史修正路径。P2-1 在真实已有fighter archive的新适配器及底层runtime分别实测；P2-2 为最新分类逻辑的独立状态反例加适配器／UI路径检查，未在某个真实受种族上限约束的准入fixture中端到端复现。

## 两项 P2 修复闭环追加（2026-10-17）

**状态：P2-1、P2-2 均关闭。** 仅针对本报告的原两个问题及下述限定回归，不作整系统完成声明。

本轮只更新本报告并新增 `scripts/test-growth-independent-p2.ts`，未改主代码、旧测试或fixture，未把新脚本加入全套suite。执行命令：

```text
node --import tsx scripts/test-growth-independent-p2.ts
```

实际退出码0，输出 PASS。测试仍复用原 admittedFighter，资格分类使用独立状态输入，没有另造十职业准入档案。

### P2-1：部分付款已可表达，并保留付清才能开训

复读确认 growth.pay 现在接受可选的正整数 amountCp；省略则取剩余应付，本次金额不得超过余款。钱包检查和自动精确面额均按**本次金额**处理，非整个课程余额。手动 tender/change 仍由底层校验实际净额。

独立测试通过：

- 1级E评定的导师课程总价1500gp（300000cp），初始钱包不足付清；省略 amountCp 的旧全额请求仍正确拒绝。
- 原反例的部分实付100gp（20000cp）经新 preview/commit 成功，paidCp=20000、remainingCp=280000，钱包精确少100gp。
- 0、负数、小数cp、超安全整数均被schema拒绝；高于余款或仅高于所选钱包实际价值也拒绝。失败预览前后原 archive JSON 一致。
- 再实际支付301cp，交付2gp、找回99cp；钱包和remainingCp准确变化。缺少找零字段或净额不匹配均拒绝。
- 两次部分付款后尝试 start 均被原引擎拒绝。记录真实后续收入，再省略 amountCp 支付准确余款，累计paidCp恰为300000、余额0，start才成功。
- 最终archive JSON往返 parse/replay一致，未删除预付历史或重复计费。

UI源码已确认增加 amountGp 输入，readGrowthAction 将其交给 parseGpToCp；growthFields 生成的付款表单确含该输入。金额按十进制字符串加BigInt转换，不以浮点近似舍入：0.005gp=1cp、1.505gp=301cp；不足整cp的0.001、1.234及指数、NaN、非正值等均拒绝。对1、2、199、200、201、301、300000和最大安全整数cp执行 formatCpAsGp→parseGpToCp，全部精确往返。

未进行浏览器输入／DOM FormData事件测试。以上为真实动作预览／提交、纯金额函数及表单源码／生成文本检查，不扩大为全部UI交互验收。

### P2-2：数字上限违例不能再作为普通事实确认

复读 acceptAdvancementGate：当levelCap为已知数字且targetLevel超出时，显式factual-confirmation抛错，提示必须记录战役例外。其余旧兼容分支未被自动改写。

独立回归原最小反例（level1、target2、cap1）：

- factual-confirmation现被拒绝，原pending状态无变异。
- campaign-exception仍可进入training-planned，candidate.dmDecision与history均保留该分类，没有偷偷改成普通事实。
- 旧undefined classification调用保持可用，结果不凭空添加classification；新growth gate动作schema则要求明确分类，缺失会拒绝。
- levelCap='needs-dm'的待解释事实仍可使用factual-confirmation；没有把所有DM gates一概强制成房规。

UI仍允许用户选择事实确认／战役例外，数字上限违例的错误选择由引擎拒绝；本轮未要求自动替用户选择例外。这里认证的是旧undefined处理函数兼容和新growth动作必填分类；没有执行某个受种族上限约束的真实准入archive的旧无分类历史重放。

**兼容边界：** 原始runtime writer仍未新增“所有新accept-gate都必须classification”的通用约束，undefined兼容并不区分调用者是否正补写新raw动作。因此关闭的是原新growth UI显式factual-confirmation仍被放行的问题，不声称所有直接raw API都已有完整的新／旧动作分类隔离或DM身份认证。后者不应由本次两项P2闭环推断出来。

### 本轮版本与范围

```text
application/campaign-growth.ts
8A9E4D0AA03A893702F96BC3B6F8F5CC4040C17D96686B4AA4AC057A68E11AFE
actions/growth-actions.ts
E103F40578DA94ACE165297CCE30780064BE69B3B5DAC589EB443CE6495FB296
ui/campaign-growth-panel.ts
05E835503883F28B698849FECAD092BD1906308DB00D7C9A8CCF8083D56975BF
workflows/core-advancement.ts
2A55CED43886891D5B3BA84953374F45B5F84BAF87021011671E775F5345E5F5
workflows/core-campaign-runtime.ts
55DD7C050F1F4C587EE84C0BB458E8A34ABF3117656C0ACD3DED771CE513C417
```

本轮仅运行上述新增独立测试，没有跑suite/build、十职业生命周期或浏览器；未重新核对全部原书表、全部钱包组合、多职／双职／Bard及所有高级历史修正。初轮其他未测试范围继续有效。本报告两个原P2已完成复核关闭，不代表剩余成长系统或整个应用已完成。

### 后续补充：UI 防误选与主测试覆盖

再次只读确认：growthFields 在 gate 且 requiresCampaignException=true 时，将 factual-confirmation 选项标记 disabled，并显示“只能记录本战役例外”的说明。执行独立的表单HTML生成断言：数字cap超限时禁用且有说明，普通gate不禁用事实确认，均通过。此更新取代上文修复复核时“UI仍允许错误选择，再由引擎拒绝”的旧快照描述；引擎拒绝仍为必要后盾。

已读取 scripts/test-campaign-growth.ts 新增断言：部分实付后的余额／钱包扣款、未付清不能start、超额拒绝、包括MAX_SAFE_INTEGER的gp/cp精确往返、numeric cap的factual拒绝、明确campaign-exception可用，以及legacy undefined保持未分类。这里仅确认断言存在，**未运行该主测试文件**；该文件中的legacy检查也是acceptAdvancementGate处理函数的兼容断言，不据此声称已覆盖真实旧archive的完整重放。

本次额外只更新报告，未改变两个P2均关闭的结论，也未扩大为浏览器或整系统验收。

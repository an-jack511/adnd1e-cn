# 有界关系操作：交叉评审交付

日期：2026-10-15。采用资深 1e DM 的设计审查视角，不声称真实履历。本轮仅新增用户指定的工作流、独立测试和本报告三个文件；不接入 suite、manifest、main runtime 或 UI，不提交、不推送。

## 实现与规则依据

`createCoreRelationshipOperations` 建立单一雇主的权威关系账；`applyCoreRelationshipAction` 提供纯函数 reducer，输入输出均不执行外部副作用。导出的 `CoreRelationshipAction` 是 register、change-status、replace-contract、record-payment 的判别联合；运行时以 strict schema 拒绝非法字段、空标识、非有限金额及不支持的枚举。每条操作要求 DM authority、理由、唯一 actionId 和战役日期标签。authority 字段不是身份认证；adapter 必须验证真实 DM 权限。

复用 `engine/core-relationships.ts` 的 `checkHenchmanCapacity` 与 `projectRelationshipForPlayer`，不重抄表。PHB13 CHA 上限只检查增加有效 henchman 名额的操作。standard-hireling、expert-hireling、mercenary 均不调用该检查；登记不保证当地存在候选人或合同符合全部职业特殊限制。prospective 不占名额，active 和 missing 占名额；失踪不等于关系解除。已有超额时允许不增加名额的操作。adapter 必须提供该雇主完整关系账及针对对象适用的最终 CHA，不能只传当前地点的名单。

rules 包 `coreRelationshipsPack.unresolved.classFollowers` 明确 unknown：follower 登记返回 needs-dm、原状态及原有理由，不写记录、不占 CHA 名额、不把它改名成 henchman。不补职业 follower 出现表、雇佣职业价格、可用性或产能表。DMG34–37 的已核来源仍通过原规则包追溯；本轮没有重新核验原页，不新增“已核”主张。

登记是已由 DM 裁定的关系事实，不是自动招募成功。招募报价/接受骰、忠诚和士气继续归原引擎；本工作流不会伪造骰点、以工资推算忠诚或自动公开失败原因。

## 状态与合同账

工作流保守转换策略（不是原书转换表）：prospective → active/dismissed/departed/dead；active → missing/dismissed/departed/dead；missing → active/dismissed/departed/dead。终止状态不重开，同状态操作拒绝；复活、重新加入和回滚留给未来显式工作流。

登记及合同替换各保存独立版本，原版本不会随新合同改变。终止关系不能重谈合同，但允许补录历史结算。付款必须引用同一关系的合同 actionId，保留金额、用途、期间标签和可选外部回执；重复 actionId 或非空回执拒绝。重复 actionId 是拒绝语义，adapter 重试应先查账，不应生成新 ID 重复付款。没有回执的不同操作无法自动判断是否同一现实付款。

金额是人工约定的有限非负 gp（付款严格正数），null 工资代表未知或不适用，不解释成免费；不推导汇率、货币精度、欠薪、应付余额或自动缴款。全量命令保存在 DM 私有审计中，失败不返回部分更新。输入命令与旧状态经解析/复制，不留合同数组的调用者别名。

## 公开投影

`projectCoreRelationshipOperationsForPlayer` 复用引擎白名单构造公开关系；付款也逐字段白名单重建。私有 actions、DM 理由、外部回执、NPC 私档引用、忠诚分数/因素、士气骰和未来新增 secret 属性均不进入投影。合同历史不整体导出。公开文本（姓名、职责、期间标签、observedHistory）必须由 DM/adapter 预先批准可公开；投影不能识别人为写进公开文本中的秘密。ID 必须是无秘密语义的标识符。

## 尚未连接的接口边界

- 钱包：record-payment 只记账，没有扣款、余额检查或已结算保证。externalReceiptId 仅为关联字段。未来 adapter 负责钱包事务、持久化原子性、幂等与并发控制，不能因调用此函数就宣称资金已到账。
- 日历：at、startedOn、endsOn、periodLabel 是不透明战役标签，不调用现实日期、不排序推算、不验证先后、不推进时间、不自动到期或生成工资。
- 存档：state 是 DM 权威对象；玩家投影不可反向覆盖它。工作流不提供不可信存档 schema 迁移/校验入口，adapter 必须加载可信完整状态。
- NPC：没有成长、XP 分配、装备转移、死亡/复活、据点、军队指挥或 follower 全生命周期。本交付是有界登记与合同付款事实账。

## 验证

独立命令：

```text
node node_modules/tsx/dist/cli.mjs scripts/test-core-relationship-operations.ts
node node_modules/tsx/dist/cli.mjs scripts/test-core-relationships.ts
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck src/character/workflows/core-relationship-operations.ts scripts/test-core-relationship-operations.ts
```

测试覆盖容量拒绝、prospective 激活、missing 占位及返回、离开后释放、三类 hireling 绕开 CHA、follower unknown 不写入、重复 ID/回执、合同版本与跨关系付款拒绝、终止关系结算、非法金额/未知操作字段、输入不变和调用者别名隔离、实际忠诚/士气秘密与新增秘密字段不泄露。负例将非法 JSON 先置为 unknown，再显式跨越 typed 边界以确认运行时拒绝。

原有关系测试与本轮测试通过；本轮文件及其依赖通过独立 strict tsc。未声称全仓检查通过；共享工作区存在其他并行修改。等待交叉评审，重点请检查 missing 占位与终止不重开策略、合同版本付款引用及 adapter 原子性边界。

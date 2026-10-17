# 架构、稳定动作及便携档案

状态：设计合同。除 `src/character/prototype/*` 的内存原型外，下述统一门面、迁移器与生产新UI尚待实现；现有domain/workflows继续承担正式档案语义。

## 1. 分层及目录

```text
src/character/
  rules/                 已核事实、来源、职业/扩展数据；保留
  engine/                无DOM/存储/时钟/RNG的确定性计算；保留
  creation/              DMG原骰、分配、草稿；保留
  domain/                事实、事务/事件、投影；保留
  workflows/             创建/准入/成长/日历/生命等；保留
  actions/               [计划] 稳定Action、preview/commit与任务计划
  application/           [计划] 角色工作区、view-model、规则能力检测
  interchange/           现有候选schema及隔离读取；补版本适配器
  persistence/           [计划整合] 仓储门面、IndexedDB、原件、CAS、备份
  ui/                    现有控制器渐进退役；拆成四视图和可复用组件
  prototype/             本轮隔离内存模型/控制器；不作生产仓储
src/pages/character/      四玩家任务路由；DM层不作第五主页面
src/styles/              应用令牌、布局、组件，不侵入书籍译稿
scripts/                 规则黄金数据、性质/兼容/集成/浏览器验收
```

生产数据流：文件/本地库 → 有界读取及原件保全 → 版本分类/schema/引用校验 → 适用版本重放 → 当前工作区 → 公开只读view-model → 四视图。操作反向通过Action：输入 → preview → DM门槛 → commit → 原子事件/状态 → CAS本机保存 → 反馈。UI不直接给XP/等级/钱包赋值，不调用历史replay充当新写入口。

规则包有 `id/version/digest/engineContractVersion`、适用范围、依赖、原书定位和逐条覆盖身份：增加、替换、原书可选、采用解释、房规例外。冲突默认阻塞，不按加载顺序“最后一个赢”。OA是独立战役适用包，同名职业/方法用命名空间区分。

## 2. Action合同

```ts
type Command = {
  id: string; characterId: string; branchId: string; expectedRevision: number;
  type: string; input: unknown; // 逐Action用严格schema判别，不长期保留unknown
  effectiveAt: { calendarId: string; minute: number } | null;
};
type Plan = {
  command: Command; baseFingerprint: string; ruleLockDigest: string;
  outcome: 'ready' | 'needs-dm' | 'blocked' | 'unsupported';
  changes: readonly Change[]; tasks: readonly Task[]; sources: readonly Citation[];
  warnings: readonly Issue[]; decisionsRequired: readonly DecisionRequest[];
  fixedRollFacts: readonly RollFact[];
};
preview(context, command): Plan;
commit(context, acceptedPlan, decisions): AtomicResult;
```

预览无副作用、不掷新骰、不写事件/存储。骰子必须先成为固定的输入事实；软件RNG与实体骰来源分开，不声称防作弊。提交重新检查revision、规则锁、目标实例/副本和条件，使用现有runtime新写入口，事务一次性写事实、资源和事件。同command ID重试只返回同一收据。业务失败、事件生成失败或保存失败各有不同状态；本机保存失败不能谎称业务从未应用。

稳定玩家动作如 `character.takeDamage/heal/prepareSpell/castSpell/addItem/spendCurrency/gainExperience/startTraining/completeTraining/levelUp/startResearch/hireRetainer`。名称是接口，不代表所有职业都支持；适配器根据职业和能力返回task或unsupported。现有 `damage`、`cast-prepared`、`pay-training`、`award-level-dated` 等保留其真实守卫，稳定Action不降低条件。

**结果身份四分**：确定性计算；给定骰处理；世界事实裁定；明确规则例外。普通伤害不要求玩家填DM理由。需要DM时，系统生成裁定请求的上下文/规则/问题；理由与采用身份由高级层填写。本机“DM模式”不提供可信认证。

纠错四分：取消未提交；真实补偿（治疗/退款等，不伪装纠错）；事实纠正（引用错误事件和受影响依赖，重新审查后果）；分支恢复（保全旧档，不覆盖世界历史）。暂不能安全修复时只读保全+导出双方，不提供万能改JSON入口。

## 3. 状态机

```text
创建：配置 → 原骰 → 分配 → 资格 → 动态任务 → 待审核 → 准入
                         ↘ 禁止/待解释/待补事实 ↗
成长：未达标 → 经验达标 → 评价/门槛 → 计划 → 付款 → 训练实际进行
                                                   → 完成事实 → 授级 → 新能力待办
                  严重中断 → 原时费保留损失 → 新课程
活动：意向 → 可行性/授权 → 计划 → 实际开始 → 暂停/中断/完成 → 结果裁定
生命：正常、昏迷失血、稳定、死亡等 + 独立行动限制/永久变化
```

训练支付不等于开始，区间终点不等于世界现在，实际时间完成不等于获得利益。后补旅行/施法可影响已经登记的训练或休养，必须复查完整历史证明。首次位置锚、多角色主时钟及超出当前引擎的回溯是P0集成设计，不能由UI显示一条时间线就称完成。

## 4. `.adnd1e.json`生产格式

选择UTF-8 JSON：可独立保存、可读、开放schema、无运行时依赖，支持离线迁移与第三方阅读。文件不携带可执行脚本/动态import/公式代码。书籍数据不整本嵌入，保存规则包锁及足以解释事实的引用。

沿用现有 `adnd1e-character` / `1.1.0` **设计候选**：具体完整schema已在 `src/character/interchange/schemas/character-v1.1.schema.json`，完整示例在本目录 `example-fighter-v1.1.json`。当前隔离检查器自己明确不是通用schema或规则/准入认证；不能把它当完整生产导入器。示例 `unsealed-example-not-release` 规则摘要不是有效发布哈希，不能进入正式认证。

| 部分 | 保存什么 | 权威性/注意 |
| --- | --- | --- |
| format/schemaVersion | 精确格式与语义版本 | 未知主版本原件保全并只读，不降级改写 |
| document | exportId、characterId、branchId、revision、父修订、导出时点、视图、重放保证 | 导出时间不是游戏时点；公开摘要不可恢复私档 |
| rules | 引擎合同、profile/revision、规则包版本摘要、选项、来源及采用决策 | 规则锁不随网站更新静默更换；未知包不能执行新动作 |
| checkpoint | 截点及人物基础/当前事实、模块与登记事件引用 | 必须说明是完整重放还是截点+审计；不能伪造缺失创世事实 |
| rolls | 全原骰、用途、方法版本、分配/采用、外部或软件、关联命令 | 保存全部而非只有6个总分；HP逐职业逐级保留骰面 |
| events | 序号、命令、主体、实际记录时间、游戏时点、类型、载荷、来源/裁定引用 | 可重放载荷必须注册；未知尾部保留只读，不能跳过后继续写 |
| overrides | 目标、set/add/suppress、作用域、起止及decision引用 | 不改写原值；展示覆盖身份；不是“任意理由都是RAW” |
| cache | 可丢弃的派生投影及规则锁/输入摘要 | 不作唯一事实，不信任导入缓存；版本/摘要不符重算 |
| provenance/extensions | 来源与保全扩展 | 未知私密扩展不得带入玩家导出；不能把原件当未校验备注 |
| proposals | 尚未执行的任务/活动意向 | 不产生钱币/时间/法术收益 |

### 原始事实、当前事实与派生值

保存：身份与实际选择、出生/年龄事实、原始骰/种族变化/永久变化、职业加入及已获等级/XP奖励、生命骰、实际当前HP、已消耗副本、具体装备/钱包面额/位置、取得/失去物资、关系/资产、活动实际时间地点、决策和纠错链。

重新计算：当前有效属性、资格和等级上限、已核攻击/豁免基础行、技能修正、生命骰所导最大HP、法术容量、合计财富、已知重量下界/负重候选、训练资格/费用/剩余待办。**不是所有当前数值都可由规则推出**：实际治疗后HP、DM决定的最大HP例外、购买价格和研究可行性必须保存相应事实，不可硬重算“标准答案”。

法术模块需独立保存理解尝试/轮次、书实体/条目/来源、神术请求与公开授予、准备副本稳定ID、消费及恢复活动；不能一个knownSpellIds代替所有状态。关系模块分henchman/hireling/mercenary等，秘密忠诚不入玩家包。

### 现有格式到目标的映射（适配器待实现）

| 旧格式 | 映射 | 禁止推断/保全 |
| --- | --- | --- |
| 旧自由人物表 | legacy assertions，生成未认证候选 | 不反推骰面、钱包面额、书内取得或训练；原始字节独立保全 |
| creation-draft 1.0 | rolls、生成规则锁、分配、草稿意向 | 没有职业/准入就不补造；同样保留旧字节 |
| core-creation 1.0 | 身份及各任务facts/审批成为创建事实 | evaluation缓存重算；任务complete需验证来源与语义 |
| core-admission | 创世事实/准入及已知模块 | 原创世不能覆盖当前运营；严格重建校验 |
| core-campaign-runtime 1.0 | genesis/actions/runtime模块映射到已注册事件、截点与规则锁 | 必须逐步对照现有replay及政策版本；不凭空补日期/地点或通用纠错 |
| player projection | 仅公开展示/分享 | 不准反向恢复DM私档，不称“完整备份” |
| 未知/损坏 | 按摘要保全原始字节、诊断、只读 | 不覆盖本地、不给自动修复伪成功 |

当前1.1候选不等于承载全部新日历/政策模块的适配已完成。如果注册事件或严格payload不容纳它们，应先做schema差异评审与显式次/主版本决策，不能硬塞字段。原始字节保全与迁移后语义等价是两套验收；公开安全导出不得嵌入私档原件。

## 5. 本地保存与可携带性

沿用现有IndexedDB及CAS，不另建第二套角色事实数据库。仓储门面按character/branch/revision工作；自动保存去抖但业务提交即时进入内存，保存中可继续编辑，success只标已落盘快照。读改写比较必须在同一IDB事务；跨标签冲突不last-write-wins。

旧件查看不覆盖主件；恢复应导出候选或建立可核谱系的新分支。来自文件且已有本地同角色时比较双方谱系，提供双方导出及明确续接/分支，不偷偷更新token。损坏、配额、升级受阻、撤销权限、关闭数据库等都保留内存与原件。

导出支持完整私档、明确公开投影；包含schema副本/版本说明的可选便携包以后增加。JSON足以脱离网站保存，不能承诺没有规则包/引擎时仍可继续自动计算；应仍能读事实。文件完整性摘要仅检损/识别，不认证DM身份、防作弊或证明规则正确。

迁移在内存/新分支运行，先预览差异→校验→往返/回放对照→用户确认→原子新写；失败不动旧库。大档案需统一上传/解析/导出上限、输出可重读保证、可验证检查点和日志分段设计，禁止静默丢历史换性能。PWA和文件系统访问仅扩展接口，本期不强制；本地DM无可信认证，未来多人同步另设计冲突与权限，不能靠静态页面伪造。

部署保留Astro静态构建，不需要后端；角色页脚本按路由分包，规则查询静态可读。禁止运行导入JSON里的HTML/脚本。离线缓存必须按规则包摘要管理旧版，更新引擎不能静默迁移活动人物。

# 运营档案本地保存恢复：长期 PL 评审

本模块只负责档案持久化，不改变原书规则、runtime、suite、manifest 或 UI。入口位于 `src/character/workflows/core-campaign-storage.ts`；独立验证运行 `npx tsx scripts/test-core-campaign-storage.ts`。

## 长期保存约定

- 按角色 ID 与 runtime 分支 ID 的 JSON 二元组定位，避免分隔符碰撞。同角色不同分支分别保存。
- 每次读入主件和历史都调用 `parseCoreCampaignArchive` 重放验证，不能仅凭快照或 revision 数字接受文件。
- 存储 envelope 使用独立 `schemaVersion: 1`，与 runtime archive 的 schema 各自管理。存储 generation 从 1 递增；乐观锁 token 是原始完整字符串，不是 runtime revision。
- 创建必须带 null token；更新必须带最近读取的 token，并且 genesis 完全相同、旧行动是新行动的严格前缀、runtime revision 上升。相同版本、平行改写、降版本均返回冲突，没有 force 参数。
- 保存成功后应重新读取或使用返回 token；冲突时保留调用方尚未保存的档案，并展示/导出双方。库不会自行合并或认定哪位 PL 的版本正确。

## 原子性与配额

主件和最多 5 份旧快照放在同一个 envelope，一次 compareAndSet 完成比较和替换。不使用先写历史、再写主件、最后修改索引的多次 setItem 序列；失败不删历史来腾空间，也不先清空主件。端口契约要求 false 和异常均不改变旧值。测试注入配额异常并逐字比较完整旧 envelope。

普通 localStorage 的 getItem + setItem 组合不提供跨窗口原子比较写入，不能直接充当本接口。真实适配器必须使用事务性存储（例如 IndexedDB 同一读写事务中的比较与 put；异步环境需另行提供 async facade），或由所有写入方遵守的排他机制实现契约。本次只交付同步纯端口库和内存故障测试，不宣称浏览器适配器已经完成。锁之外的写入方以及违反契约的端口不在保证范围内。没有自动发现列表或独立索引，避免引入跨键半写问题。

快照数量上限不等于字节上限；大型行动日志可能使配额更快耗尽。失败结果携带原因，调用方仍持有未保存值，应提供文件导出。此模块不提供删除、清理或跨设备云备份。

## 未知版本及损坏保全

未知 envelope 版本、额外字段、未知 runtime 版本、重放失败、损坏 JSON、历史缺失或断链均返回 preserved，提供完整原始字节与原因；即使带当前 token 也不允许覆写。读取权限错误直接抛出，保存路径则返回 failed，不能把无法读取误认为空槽。读取已知版本也保留原始 token，不进行读取时写回或格式整理。

未来迁移必须先导出原始字节，在新目标验证迁移结果与身份、行动语义，得到明确的版本迁移决策后再通过事务切换；本模块没有隐式迁移。旧格式的裸 runtime archive 同样保全，由调用方明确导入至空槽，而非就地猜测升级。

## 历史恢复方案

`recoverCoreCampaignHistory` 要求当前 token 与指定历史 generation，返回 recovery-conflict，包含当前主件和候选旧件。它不写入任何存储，不倒退原分支。调用方可导出候选旧件并保留冲突，或明确选择新分支：通过 admission 的 `createRuntimeFromAdmittedCoreCreation` 指定新 branchId，再用 runtime 行动接口重放所选历史，校验后以 null token 写入新槽。不能只改快照中的 branchId，也不能把旧件直接当原分支更新。新分支构建未封装在本模块中；本次实现的是明确保留冲突的恢复路径。

5 份以前的历史不会继续留在当前 envelope；需要长期审计或设备损坏恢复时必须另存导出。主件或历史任一损坏会整包保全，不偷偷跳过损坏记录再以残缺历史覆盖。

## 验证与交叉批评关注点

独立测试覆盖真实 runtime 重放、陈旧 token、CAS 期间竞争、同 revision 分歧、降级与重复保存拒绝、同角色多分支、键碰撞、配额异常逐字保全、历史截断、恢复不写入、未知版本与未知字段保全、伪造快照拒绝、读取异常。内存端口故障注入无需浏览器隐藏状态；测试中的创建材料仅为运输层 fixture，不是原书规则认证。

交叉批评请重点检查：端口原子契约是否被适配器遵守；未来 UI 是否把恢复冲突明确交给 PL；导出入口是否在配额和未知版本时可达；runtime 持续演进时，旧档重放失败是否仍逐字保留。当前交付等待交叉批评，不提交或推送。

## 第二轮 PL 交叉批评（2026-10-15）

本轮仅为源码审阅，未运行浏览器、未实测下载或 IndexedDB 故障。审阅包含 `ui/core-campaign-controller.ts`、`workflows/core-campaign-runtime.ts`、新增的 `workflows/core-campaign-browser-storage.ts`、`workflows/core-relationship-operations.ts`，并参照运营页字段、日历及生命/法术引擎。主线持续编辑，以下以本次读到的函数和操作路径定位。前文“尚无浏览器适配器”的交付描述已被主线新增实现取代；不再将缺少本地保存入口列为当前缺口。用户报告的 tsc 和纯存储专项测试通过，不等于适配器已通过真实浏览器验证。

### P1：保存等待期间的新增行动可能被“已保存”提示掩盖

定位：controller 的 `operations-local-save` 处理器。它复制 `snapshot` 后等待 `saveBrowserCampaign`，期间没有 pending 标记、禁用操作或记录待保存 revision。PL 点击保存后继续录伤害/施法，数据库成功保存的是先前快照，而回调仍显示“已保存本地第 N 版”。较新的行动仍在内存，刷新可能丢失；这里不是数据库半写，而是保存对象与提示对象不一致。

建议：为每次保存绑定角色、分支、请求编号和快照 revision；返回后比较当前 revision，明确提示“已保存至修订 X，另有 Y 条未保存”。保留持续可见的未保存标记。并发保存应串行或禁用重复点击；否则同 token 的两次保存一成一败，后返回的提示会使 PL 难判断哪份已入库。保存后 `refreshSlots/refreshHistory` 的异常也不应落进“未覆盖本地原件”文案：CAS 可能已经提交，仅列表刷新失败。将持久化结果与界面刷新错误分别呈现。

### P1：异步加载/文件导入缺少防止旧请求接管当前角色的保护

定位：本地加载在 await 前只检查一次 `current`；文件导入在 `await file.text()` 前同样检查一次。路径：空页面发起本地加载 A，读取尚未完成时导入 B（或再加载 C）；两个请求均通过空状态检查，后完成者直接赋值 `current`。如果先完成者已允许录入行动，晚到结果会替换这份进度。文件导入不重置 `savedToken`，在交错完成时还可能把 A 的本地 token 留给 B。存储 CAS 通常会挡住误覆盖，但挡不住内存档案被替换。

建议：统一打开操作的 pending/requestId，禁用冲突入口；赋值前再次确认请求仍有效且无新进度。一次性设置 current、所属槽、token、历史列表和原件状态，拒绝迟到回调。此结论是控制流推导，尚无浏览器复现记录。

### P1：文件续玩、跨窗口冲突和历史恢复尚缺可走完的分流

定位：文件导入不取得本地基线，初始 `savedToken=null`；save 失败时仅抛 `saved.reason`，丢弃 `conflict.current`。PL 从导出文件打开同角色同分支，即便它是库中版本的合法后续，也不能直接保存到已有槽；另一窗口保存后，本页旧 token 也无法自行继续。当前允许导出，故不是无路可保全，但界面让 PL 依赖“导出—刷新—加载—人工重做”。

历史候选导出保留原 branchId，且无新分支创建入口。导入候选后再次保存，null token 与已有槽冲突；这符合禁止回退，但“恢复候选”还不是可继续游玩的恢复流程。

建议：展示内存版/本地版的角色、分支、revision、行动数与分歧点，提供双方导出、加载本地并保留候选、显式建立新分支。文件导入后若要接续本地槽，应先展示并确认谱系比较，再以刚读到的 token 做 CAS；不得仅为消除冲突而更新 token 强行保存。新分支通过准入及行动重放构建，不能直接改 branchId。对完全相同内容的重复保存可显示“无新增行动”，不必把库的严格更新拒绝包装成严重故障。

### P1：巨量字段与行动上限形成长期档案自锁风险

定位：runtime 的每次 `commitCharacter` 都用整个 `{...state, inventory, calendar, life, spells...}` 替换模块，事件载荷会保留当时完整状态；state 本身还含历史，calendar/spells 等也不断增长。`commitCoreCampaignAction` 先完整 parse 重放，再完整 reconstruct；存储加载另对主件和最多五份历史各自重放。文件导出使用缩进 JSON，controller 导入却固定拒绝超过 8 MiB。于是可能出现自己导出的长期档案无法从运营页重新打开；具体增长速度未测量，不声称已达某一性能阈值。

另一个确定的边界不对称：parse 拒绝 `actions.length>10000`，commit 对已有 10000 条的有效档案仍可追加第 10001 条并返回；之后再次 commit、保存或导入将被 parse 拒绝。

建议：提交前检查可重开边界，显示档案字节数、行动数与导出兼容性，不要事后才发现不能保存。压缩表示/检查点/日志分段须有独立 schema 和明确迁移路径，保留完整审计链与原件；不能为减小体积静默删除旧行动或改写 RAW 结算。大档检查入口应明确能否返回可运营档案，不能只把用户引到另一个拒绝入口。对重放开销应做实际规模测试后决定优化，避免把 UI 暂停误写为已验证现象。

### P1：施法只有消耗入口，生命状态尚不能支持完整长期循环

定位：runtime 行动有 `cast-prepared`，未见恢复准备副本/重新祈祷或学习法术的运营行动；法术引擎虽有 recovery 能力，不等于这里已接入。PL 用完初始 ready 副本后，当前运营路径没有补回方案。不能让 PL 靠改 JSON、重新导入准入档案恢复法术，这会切断事件连续性。

生命行动提供普通伤害、零 HP 援助/苏醒和升级后待裁定 HP；`settle-current-hp` 仅接受 needs-dm，并非一般治疗入口。普通受伤后回满、自然恢复及死亡后的复生尚无本 runtime 行动，尽管生命引擎有更多能力。应明确列为“待独立工作流支持”，不要把某个 HP 裁定按钮解释为通用治疗。

建议：按有据可查的休息、准备时段、来源与 DM 授权逐步接入恢复事件，保留原始骰面、时间占用与施法副本身份。治疗/复生与施法消耗分别记录，并用来源 ID 关联；观察结果文字不能自动代表已结算治疗或伤害。不足资料进入待裁定，不凭“过了一天”刷新副本或 HP。

### P2：日历默认值、空值和无法对齐的时间轴易产生有效但错误的记录

定位：controller 的 `lifeMinute` 与训练时间换算；calendar 单位首次确认后固定。日内分钟使用 `Number(input.value)`，空字符串成为 0；清空字段可能仍提交午夜。战役日与分钟各自检查安全整数，乘加后的绝对分钟没有在 controller 就地检查（多数调度路径后续会拒绝越界，不能据此声称引擎已写入非法区间）。页面默认每天 1440 分钟、每周 7 天、训练第 1 日，而 `actor().at` 只是任意文本，未与数值日历建立关系。

PL 配好非默认日历后分段训练，下一段仍需手算上一段终点；runtime 强制连续，错误通常到提交才提示。旧档已有无日历训练段，此时再配置日历，后续 scheduled 段会因找不到前段占用区间而拒绝，未见协调迁移入口。零 HP 苏醒记录休养开始与 comaTurns，却没有结构化受伤时点，无法自动核对是否把休养填在受伤之前。

建议：区分空值和明确 0；确认一次战役纪元与单位来源，导入后展示已记录单位而非只显示输入默认值。给出上一段结束/建议下一段开始、半开区间终点、精确分数周与日内时间预览。文本日期保留原貌，不强行套地球历法。历史无日历段需显式协调或继续旧分支，不猜补时间；休养需提示 DM 核对前后顺序，不能自动缩短 RAW 要求。

### P2：重绘会重置选择，行动可用条件与引擎拒绝理由脱节

定位：`render()` 每次用 `replaceChildren` 重建钱包、物品、位置和施法副本选项。PL 已选第二个钱包/物品，先做另一项操作触发 render，再继续原表单时可能回到首项；同名副本以过滤后的序号显示，消耗后剩余副本会重新编号。建议保留仍有效的稳定 ID，并在扣款/消耗前显示对象与变化预览。

`operations-cast` 只按 ready 副本数启用，训练按钮只看 advancement.status；runtime 则会在 life 非 alive、受限或 HP 待裁定时拒绝训练/施法。建议把当前阻断理由和下一步显示在对应按钮旁，区分“尚未初始化生命状态”与“已确认可行动”。不需要因未记录 life 就推定角色死亡，也不能把按钮可点当规则允许。成长待办已引用来源，应继续用玩家可读字段展示关键状态，把巨量 JSON 留作检查资料。

### P2：导出/保全文件仍缺身份、版本和来源指引

定位：普通导出文件名仅角色 ID，历史候选文件名仅 generation，损坏原件固定名。不同分支/角色历史容易在下载目录混淆。导出请求不等于文件已落盘（现有普通导出提示“已请求”是正确边界），本地保存也不等于设备外备份。

损坏原件导出仅在“本地加载 preserved”路径设置 `preservedRaw`；已打开文件后的保存若遇到本地未知版本，controller 丢弃 conflict.current，不能直接导出该槽原件，需另行刷新加载。多个 preserved 槽连续尝试也会覆盖内存中的最后一份 raw，而界面没有展示原件所属槽。非字符串 IndexedDB 记录会在 readRaw 直接 abort，不进入 preserved；目前契约保存的是字符串，这属于超出本模块格式的损坏边界，应说明不能声称所有数据库值均可导出。

建议：文件名含角色、分支、revision/generation 与安全时间戳；原件出口显示槽及错误来源。区分原始 storage envelope、可玩 runtime archive 和历史候选，不把 envelope 导出误称可直接导入的角色文件。保持未知数据原样，另附操作说明，不猜版本转写。

### P1（接入前门槛）/P2（现有独立模块）：关系付款、权限和生命线不能靠 PL 猜测

定位：`applyCoreRelationshipAction` 与 `projectCoreRelationshipOperationsForPlayer`。模块明确不扣钱包、不推时钟，payment 可在 NPC 离队/死亡后历史结算，这是合理保留。风险在将“record-payment”呈现为实际支付：契约 amountGp 支持有限小数，而钱包用整数 cp；外部收据可空，重复 actionId 会拒绝，但新 actionId、空收据可把同笔付款记两次。运营 runtime 尚未集成关系账本，不能声称现页面已双扣。

建议：区分“登记外部已付收据”和“从本角色钱包付款”；后者需同一原子命令扣款并记账，记录币种换算与收据关联，失败双方不变。不得根据 contract 的 day/week/month 文本自动生成欠薪或招募成功。

`authority:'dm-ruling'` 是调用数据中的字面值，模块自己也注明不可直接接受 PL 输入；它不是 DM 认证。接入前应在可信适配层区分权限。public projection 排除了 secret、action reasons、externalReceiptId，但 public 文本依赖 DM 预先审定。不能为了方便存档把整个 private state 放进当前 player-visible advancement 模块或普通 PL 导出。

状态表把 dismissed/departed/dead 作为终态，源码明确这是应用政策而非 RAW；长期战役的重新雇佣、归队、复生暂无显式路径。应显示“不支持的后续流程、保留待裁定”，避免伪装成规则禁止，也不要通过注册新 ID 绕过旧 NPC 历史和容量。missing henchman 继续占位已在代码明确，界面应解释容量来源。follower 返回 needs-dm，应保留未决输入供 DM 后续处理，不自动归成普通雇员。

### IndexedDB 适配器：原子契约的实际满足方式与仍存边界

源码结论：当前 `saveBrowserCampaign` 的“事务外规划 replacement，事务内再次比较”方案能满足正常字符串记录的 CAS 原子更新，未发现把 localStorage 当 CAS 的问题。同步纯端口没有被伪装成能直接 await IndexedDB：`memoryPort` 只是规划器，planned.saved 直到真实 `compareAndWrite` 完成才向调用者返回。

1. `readRaw` 用独立 readonly 事务取得字符串；纯库对它校验、检查谱系和 expectedToken，生成包含 head 与最多五份历史的单个 replacement。该读结果只是计划基线，不是写权限。
2. `compareAndWrite` 新建同一 database/store 上的 readwrite 事务，在其中 get 同一个 key。只有实值与 expected 完全相等才立即在 get.onsuccess 内调用 put；不相等则不写，等待事务结束后返回 false。
3. 两个窗口同 token 的写事务具有重叠 store scope，不能交错修改对方的比较结果：先提交者成功，后者读到新值拒绝。即使另一个窗口在“规划读—真正写”之间提交，事务内第二次比较也会拒绝旧 replacement。它不是跨两个事务拼装的 get+put。
4. `matched=true` 只说明已排入 put，成功响应由 tx.oncomplete 决定；put 失败、配额错误或 abort 走拒绝路径，整个事务回滚，旧 envelope 的主件与历史共同保留。不应吞掉 request error 后继续提交；当前未见此类错误抑制。事务事件回调中没有网络请求或无关 await，避免读完后事务自动结束再尝试写入。

依据为 [W3C Indexed Database API 3.0 的事务调度和提交规则](https://www.w3.org/TR/IndexedDB/)。这是规范与源码一致性判断，不是浏览器适配器实测通过声明。

仍需区分：CAS 保证一次提交的原子性，不保证页面后来新增行动已保存，也不保证读取的历史在导出时仍是最新。`refreshHistory` 另行读取可能得到另一窗口的新 generation，却不更新当前 savedToken，随后导出候选会以旧 token 拒绝；这是安全拒绝，但需提示“历史列表基线已变，请刷新并比较”，不能诱导覆盖。恢复函数完成读取后别处仍可继续写；它只导出候选、不写回，所以不应给“冻结了当前主件”的承诺。

`openDatabase` 已处理 unavailable/error/blocked，并在 versionchange 关闭连接；仍未见操作超时或统一 pending UI。连接关闭、升级阻塞等应保留内存档案并允许导出。事务原子性也不等于断电后的绝对持久性：当前未设置 durability，浏览器清理站点数据、设备损坏仍可能丢全部本地记录。不要用“本地已保存”承诺永久备份；如提出 strict durability，应说明它是持久性提示并另做兼容性验证，参见 [W3C 事务 durability 定义](https://www.w3.org/TR/IndexedDB/#transaction-durability)。

建议主线下一轮验证（本轮未执行）：真实同源双窗口同 token 竞争只有一次成功；在规划读后插入竞争写；put/commit 阶段配额或主动 abort 后逐字比较旧 envelope；数据库不可用/升级阻塞时仍可导出；保存中新增行动仍标 dirty；本地加载与文件导入交错不替换新进度；历史列表与 savedToken 不一致时可解释地拒绝；大档可导出且能重开。纯存储专项测试和 tsc 无法单独验证这些浏览器事务及事件顺序。

本轮仅追加本报告，未调整主线、规则或测试；等待交叉批评后的取舍与验证。

# Journal 独立 DM／隐私限定审查

日期：2026-10-17。**本次限定范围内未复现需主 Agent 修复的缺陷。** 时间、公开投影、纯读取与新增实际活动边界的独立定向测试通过。此结论不是全系统完成声明，也不认证 DM 身份、任意完整档案的公开分享或全部 RAW。

## 实际范围与交付

等文件出现后读取实际实现，包含：

- `src/character/application/campaign-journal.ts`
- `src/character/ui/campaign-journal-panel.ts`
- `src/character/actions/journal-actions.ts`
- `src/character/ui/journal-activity-panel.ts`
- campaign-actions 的 recordActivity 映射、预览／提交；campaign-sheet-controller 的 journal 只读渲染、活动打开／提交入口。
- CharacterWorkspace 与 journal page 的页面接线；必要的 runtime 重放、日历、历史训练补录、授级及人物字段依赖。

新增独立测试：`scripts/test-journal-independent-privacy.ts`。复用已有 admittedFighter、admittedCaster('cleric')；不另造准入 fixture，不重复 Rawls 的完整主测试，不改实现。执行：

```text
node --import tsx scripts/test-journal-independent-privacy.ts
```

退出码0，输出 PASS。测试生成和检查公开投影及 HTML，调用实际预览、提交、重放 API；不是浏览器或 DOM 事件测试。没有跑 suite/build，没有扩大原书研究。

## 时间线：记录时间与战役时间

源码与定向测试确认：

- recordedAt 只取对应 action.at；不把它解析为世界日期，不调用当前电脑时间推算。它是记录元数据，不是经过认证的真实时钟或 DM 签名。
- 应用层按动作追加顺序返回 ordinal；UI 对 entries 的副本反转，以最近追加在前显示，不按 recordedAt 重排。测试故意使用递减的 recordedAt，仍与原动作索引一一对应。
- 每条动作使用重放生成的**当时 advancement module event 快照**中的 calendar，不用最终 calendar 统一重算历史。当前单位只作单独摘要，不当成当前世界日期。
- 未有日历单位时，已知分钟偏移仅说明“当时尚无日历单位”，gameTime保持null；未知战役时间显示未记录，不拿recordedAt补上。

实际反例尝试均未导致错误回填：

1. 历史无日期 training-segment 先记录；之后采用1000分钟一天、5天一周并 reconcile。旧条目与采用日历前完全一致，仍无战役日期；补录动作有自己的条目。
2. 该补录分段实际2000..4500，显示“第3天 第0分钟 → 第5天 第500分钟”。新分段4500..7000与其衔接；正式授级7000显示“第8天 第0分钟”，没有用课时结束推算未提供的授级时间。
3. cleric 在采用日历前记录 atMinute1500的实际施法；随后采用1000分钟一天的日历，原施法条目仍保持原来的null日期及分钟说明，未被改成“第2天 第500分钟”。

## 训练／授级来源及保守处理

- 训练时间查询使用 `${state.id}:training:${segment.id}` 的确切活动ID，并检查kind=training、人物actor和唯一匹配；只输出起止数字。未按相同开始时间猜测别人的课程，也未直接把位置或actor输出。
- 训练占用取当条快照的真实活动区间，而非重新按当前课程／当前单位计算旧分段。无日期的历史分段不因后来补录而被覆盖。
- 正式授级的等级与最大HP增加取当条已验证state及其授级历史；独立路径实际达到2级、增加最大HP5。journal说明最大HP增加不代表治疗，没有生成实际HP恢复动作。
- 原始未来未知intent首先由正式parser拒绝，journal不会自行容错重建。已支持但本界面未映射的 record-training-location-transition 已真实提交；其公开条目仅为“战役记录”／other、recordedAt、ordinal，gameTime=null、details=[]。没有回显原始type、method、reason或evidence。
- 普通schedule-activity使用受控活动类别中文标签、实际区间与时长，并提示不自动授予收益；不是把自由文本当规则结论。

## 公开投影与隐私

独立测试使用 `DM_ONLY_INDEPENDENT_SENTINEL` 标记以下实际输入路径：action ID、actorId、经验assessment ID/sourceIds、训练费用替代reason、导师姓名、穿戴note、训练地点、位置连续证明的reason/evidenceSourceId、施法observedOutcome与reason。

在经正式重放的投影JSON及生成HTML中均未出现标记。条目只含ordinal、title、category、recordedAt、gameTime、details六个允许字段；没有把action、intent、module、history、DM reason、actor、source或payload整体返回。UI仅消费公开view，全部字符串经HTML转义。

额外执行：

- 对公开name、recordedAt、details注入script/img/svg文本，输出为转义文本，未生成相应原始标签。
- 向runtime快照伪造额外dm-private module，正式parse/replay拒绝；没有作为“未知公开数据”兜底渲染。**这不是一个已被当前正式archive契约支持的真实私有模块成功载入测试**，不能用它认证未来所有私有模块都安全。
- 伪造不支持的未来动作type，parse拒绝而非回显未知payload。

隐私边界：这里保护的是公开view／页面输出，不是客户端内存或完整运营导出本身。当前shell仍提供完整档案导出，并明确警告其可能包含原始审核信息；不能将journal页面安全等同于“完整JSON可以公开分享”。本地确认框不认证操作者是DM。每条已支持动作仍可显示存在、序号与公开记录时间；本轮未认证隐藏动作存在性或按访问权限隐藏整条动作的机制。

## 纯读取与 revision

多次运行 campaignJournal、renderCampaignJournal、JSON重载后再次投影：

- 原archive完整JSON及revision均不变；输出revision等于输入revision。
- renderer反转副本，不改变调用者entries顺序。
- 修改返回view的details后，再次读取原档案不带入该修改。
- 没有新增动作、自动校正时间或写入派生缓存。

controller的journal入口读取并渲染投影；保存和动作提交走原有显式处理。此处controller与shell仅做源码接线核查，未独立验证浏览器存储、导航、自动保存或多slot切换。

## 新增 character.recordActivity 的额外审查

### 校验和映射

journalActivitySchema为严格对象，仅允许travel、adventuring、rest、study、language-study、spell-research、magic-item-manufacture、other。确认字段必须true，分钟须为安全整数，地点须非空；adapter要求已有日历且结束严格晚于开始。

actorId从当前archive派生，活动ID从当前动作身份派生，sourceIds为固定来源。普通请求不接收rulings、sourceIds、actorId、payload、训练segment或成果字段，不允许通过表单给自己注入重叠裁定。buildJournalActivity只映射schedule-activity，继续走现有预览与runtime。

### 实际执行结果

在独立fighter archive中，经新preview/commit逐一记录八种允许类型的非重叠时段，均成功；每次只增加一个正式revision，预览本身不写入。

逐笔比较真实sheet的level、xp、maximumHp、life、inventory（含钱包）、prepared：与记录前完全一致。尤其rest没有自动治疗，study／language-study没有自动取得能力，research／manufacture没有产生成果或自动收费，adventuring没有授XP。日历确有新增占时，journal显示相应时间。

实际拒绝并确认原archive不变：

- 与已记旅行时段重叠的再次旅行；普通入口没有自动添加ruling。
- 结束早于开始的时段。
- 尚未配置日历的实际活动请求。
- kind=training、combat、spell-use或invented不在此次入口允许集合内。combat／spell-use即使存在于底层CoreActivityKind，也不是本普通入口已开放选项。
- 请求额外带rulings、sourceIds、actorId、payload均被严格schema拒绝。

UI源码确认：journal按钮在无calendar时disabled并有指引；controller再次检查calendar后才打开活动表单；提交映射readJournalActivity→character.recordActivity→previewSheetAction。表单说明只记已发生时段、收益另审、本地不认证DM，并没有新增“研究完成／制造成果”按钮。DOM FormData、点击、保存失败与切换恢复未在本独立测试中执行。

本轮动态重叠反例覆盖普通已记录活动冲突，不声称已动态遍历所有训练、法术准备、零HP休养及本地例外组合；这些路径仍依赖既有runtime限制。

## 核验版本

审查期间文件持续由其他Agent新增／完善。独立测试通过后的主要快照SHA256如下；不把早期未完成片段当最终缺陷：

```text
application/campaign-journal.ts
8F5848D24C3A4E7AA764A862DBAAEF0B5B7B803F3218F59831CD7B3C83DCFEDE
ui/campaign-journal-panel.ts
728E4E93913A386439CBC3343BF980304A655E850F47522E5A70D8E1AADE1CEF
actions/journal-actions.ts
65EDEB3BEE86923194CC1644D86A4ADAC391C82BF3DFCCFBA54929885A4480A3
ui/journal-activity-panel.ts
CB4BDCA587F11579F8B33476D56C86FCB0EBF8034DAA51A6371F888211C92E2C
actions/campaign-actions.ts
9BF59B2B70413579CB2CBA5B9EF3988469B5CCE09E4A65D0A1A518B950922CA5
ui/campaign-sheet-controller.ts
E0C0052741D97EF0E1F8B6A265EDE6D35D2EDDE8CE21C4C43385DD66CD1BFE7B
```

## 主 Agent 提供的浏览器结果（非本审查者独立执行）

据本聊天主 Agent 补充：实际rest第9天00:00–08:00成功生成第12条；第2天01:00–02:00旅行重叠被拒绝且无新增；fighter→cleric→fighter恢复同slot的12条；公开展示无私reason；下载后formal parse得到revision13、HP10/17、XP2001、财富327560cp保持。这些作为主 Agent 提供的另一路证据记录，**本审查者没有操作浏览器或读取该次下载原件，不将其算作独立复现**。

## 最终限定结论

没有真实复现到需阻断交付的journal时间／隐私／只读副作用或普通活动越权缺陷，故无修复项可列。已交付独立定向测试和本报告；没有修改实现、重跑所有RAW、完整主测试、suite/build或浏览器验证。未审计所有旧动作组合、任意恶意档案、大规模历史性能、服务端权限、全部私有数据结构、完整导出脱敏及多用户DM认证。结论仅覆盖上述实际代码与输入路径。

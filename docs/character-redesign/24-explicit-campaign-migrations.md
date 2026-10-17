# 明确的战役档案迁移边界

当前玩家端只登记一条确定的战役档案迁移：

`adnd1e-core-admission-runtime@1` → `adnd1e-core-campaign-runtime@1`

它把已经完成准入的一级角色作为战役运营的 genesis，保留原始事件和规则来源，并建立一个没有后续操作的运营档案。迁移不会猜测当前 HP、装备穿戴、时间、经验、训练、随从或任何 DM Studio 私有事实。

已经是战役运营档案的文件只做完整重放与一致性检查，不生成新的版本。未知格式、未知主要版本和带有未经登记字段的文件拒绝迁移，原文件由导入流程保留，不能覆盖本地人物。

这条迁移是文件格式转换，不是 DM 审核；DM Studio 的私有裁定仍不进入当前玩家端。

依据：`src/character/interchange/core-campaign-migrations.ts`、`scripts/test-core-campaign-migrations.ts`。

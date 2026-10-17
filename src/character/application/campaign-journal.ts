import { parseCoreCampaignArchive, type CoreCampaignArchive } from '../workflows/core-campaign-runtime';
import { parseCoreCreation } from '../workflows/core-create';
import type { CoreAdvancementState } from '../workflows/core-advancement';
import type { CoreCampaignCalendar } from '../workflows/core-calendar';
import type { CharacterModule } from '../domain/character-record';
import { moneyValueCp } from '../engine/core-inventory';
import { formatCampaignMinute } from './campaign-time';
import type { CoreActivityKind } from '../rules/core-time-rest';

const activityLabels = {
  rest: '休息', adventuring: '冒险', combat: '战斗', 'spell-use': '施法', travel: '旅行',
  training: '训练', 'language-study': '语言学习', study: '学习', 'spell-research': '法术研究',
  'magic-item-manufacture': '魔法物品制造', other: '其他活动',
} satisfies Record<CoreActivityKind, string>;

export interface CampaignJournalView {
  name: string;
  level: number;
  revision: number;
  /** Current unit definition, not a current campaign date or a historical default. */
  calendar: { minutesPerDay: number; daysPerWeek: number } | null;
  entries: {
    ordinal: number;
    title: string;
    category: 'growth' | 'training' | 'calendar' | 'spells' | 'inventory' | 'life' | 'other';
    recordedAt: string;
    gameTime: string | null;
    details: string[];
  }[];
}

type Snapshot = CoreAdvancementState & { calendar?: CoreCampaignCalendar };
type Entry = CampaignJournalView['entries'][number];

/** Exact historical training lookup; only numeric interval facts leave this helper. */
export function campaignJournalTrainingInterval(state: { id: string; calendar?: CoreCampaignCalendar }, segmentId: string, actorId: string): { startMinute: number; endMinuteExclusive: number } | null {
  const matches = state.calendar?.activities.filter(activity => activity.id === `${state.id}:training:${segmentId}` && activity.kind === 'training' && activity.actorId === actorId) ?? [];
  if (matches.length !== 1) return null;
  const activity = matches[0];
  return { startMinute: activity.startMinute, endMinuteExclusive: activity.endMinuteExclusive };
}

/** Public append-order journal. Parse/replay first; never expose an action or module.
 * Each action creates one advancement module event. Those validated historical
 * snapshots supply that action's calendar, including preparation-created calendars.
 * Later calendar adoption/reconciliation must not date earlier undated entries.
 */
export function campaignJournal(input: CoreCampaignArchive): CampaignJournalView {
  const archive = parseCoreCampaignArchive(input);
  const creation = parseCoreCreation(archive.genesis.runtime.transaction.facts.modules[0].data);
  const snapshots = archive.runtime.transaction.events.slice(archive.genesis.runtime.transaction.events.length)
    .map(event => (event.payload as unknown as CharacterModule).data as unknown as Snapshot);
  const latest = snapshots.at(-1);
  const entries = archive.actions.map((action, index): Entry => {
    const state = snapshots[index], calendar = state.calendar;
    const entry: Entry = { ordinal: index + 1, title: '战役记录', category: 'other', recordedAt: action.at, gameTime: null, details: [] };
    const describe = (title: string, category: Entry['category'], ...details: string[]) => {
      entry.title = title; entry.category = category; entry.details.push(...details);
    };
    const point = (minute: number) => {
      if (calendar) entry.gameTime = formatCampaignMinute(minute, calendar.minutesPerDay);
      else entry.details.push(`已记录战役分钟偏移 ${minute}；当时尚无日历单位。`);
    };
    const interval = (start: number, end: number) => {
      if (calendar) entry.gameTime = `${formatCampaignMinute(start, calendar.minutesPerDay)} → ${formatCampaignMinute(end, calendar.minutesPerDay)}`;
    };
    const training = (segment: { id: string; weeksNumerator: number; weeksDenominator: number }, start?: number) => {
      entry.details.push(`实际连续训练 ${segment.weeksNumerator}/${segment.weeksDenominator} 周。`);
      if (start === undefined || !calendar) return;
      // Read the actual interval from this event's snapshot, not a reinterpreted
      // latest course or the machine clock. No new duration/RAW calculation here.
      const occupied = campaignJournalTrainingInterval(state, segment.id, archive.runtime.transaction.characterId);
      if (occupied && occupied.startMinute === start) {
        interval(occupied.startMinute, occupied.endMinuteExclusive);
        entry.details.push(`该段占用 ${occupied.endMinuteExclusive - occupied.startMinute} 分钟；当时一天 ${calendar.minutesPerDay} 分钟、一周 ${calendar.daysPerWeek} 天。`);
      }
    };
    const intent = action.intent;
    switch (intent.type) {
      case 'experience': describe('冒险经验结算', 'growth', `本次授予 ${intent.assessment.xp} XP；累计 ${state.xp} XP。`); break;
      case 'open-advancement': describe('开启成长审核', 'growth', `当前 ${state.level} 级；目标 ${state.candidate!.targetLevel} 级。`); break;
      case 'accept-gate': describe('成长资格审核', 'growth', intent.classification === 'campaign-exception' ? '已记录战役例外。' : intent.classification === 'factual-confirmation' ? '已记录资格事实确认。' : '已记录审核；历史记录未分类。'); break;
      case 'adopt-overrun-basis': describe('采用既有冒险评价', 'growth', '已记录跨级训练评价的战役采用；未新增经验。'); break;
      case 'plan-training': describe('确认训练计划', 'training', intent.route === 'tutor' ? '采用导师训练。' : '采用自行训练。', `确认费用 ${intent.acceptedCostCp} cp。`); break;
      case 'plan-name-training': describe('确认名号训练计划', 'training', `确认费用 ${intent.acceptedCostCp} cp。`); break;
      case 'pay-training': describe('支付训练费用', 'training', `本次实付 ${intent.amountCp} cp。`); break;
      case 'start-training': describe('开始训练', 'training', '已确认实际开始；本条未记录战役起始分钟。'); break;
      case 'training-segment': describe('记录历史训练分段', 'training', '本条未记录战役日期；后续补录另列。'); training(intent.segment); break;
      case 'scheduled-training-segment': describe('完成训练分段', 'training'); training(intent.segment, intent.startMinute); break;
      case 'reconcile-training-segment': {
        describe('补录历史训练日期', 'training');
        const segment = state.candidate?.segments.find(segment => segment.id === intent.segmentId);
        if (segment) training(segment, intent.startMinute);
        break;
      }
      case 'interrupt-training': describe('训练中断', 'training', '已记录中断；既有课程收益与费用按正式档案处理。'); break;
      case 'restart-training': describe('重新安排训练', 'training', '已记录重新安排；不将旧课程自动视为完成。'); break;
      case 'award-level': case 'award-level-dated': {
        describe('正式授级', 'growth', `正式达到 ${state.level} 级。`);
        const hp = state.history.at(-1)?.hp as { actualAward?: number } | undefined;
        if (typeof hp?.actualAward === 'number') entry.details.push(`本次增加最大 HP ${hp.actualAward}；不代表实际治疗。`);
        if (intent.type === 'award-level-dated') point(intent.awardMinute);
        else entry.details.push('历史授级未记录战役日期。');
        break;
      }
      case 'configure-calendar': describe('采用战役日历单位', 'calendar', `一天 ${intent.minutesPerDay} 分钟；一周 ${intent.daysPerWeek} 天。`, '单位采用不代表日期已经推进。'); break;
      case 'schedule-activity': describe('记录战役活动时段', 'calendar', `活动：${activityLabels[intent.activity.kind]}。`, `记录占用 ${intent.activity.endMinuteExclusive - intent.activity.startMinute} 分钟。`, '只记录时间占用，不自动授予恢复、训练、学习、研究或制造收益。'); interval(intent.activity.startMinute, intent.activity.endMinuteExclusive); break;
      case 'income': describe('财富入账', 'inventory', `实际入账 ${moneyValueCp(intent.coins)} cp。`); break;
      case 'consume-item': describe('使用物品', 'inventory', `实际消耗 ${intent.quantity} 个。`); break;
      case 'relocate-item': describe('移动物品', 'inventory', '已记录库存位置变更。'); break;
      case 'unpack-item': describe('拆分物品包装', 'inventory', `实际拆分 ${intent.bundleCount} 包。`); break;
      case 'learn-weapon': describe('记录武器熟练', 'growth', '已记录职业允许的武器熟练。'); break;
      case 'initialize-life': case 'settle-current-hp': describe('确认当前生命', 'life', `确认实际当前 HP ${intent.currentHp}。`); break;
      case 'damage': describe('受到伤害', 'life', `记录伤害 ${intent.amount} HP。`); break;
      case 'actual-healing': describe('接受实际治疗', 'life', `记录实际治疗 ${intent.amount} HP；上限与状态由正式档案核定。`); break;
      case 'zero-hp-round': describe('记录零 HP 后经过一轮', 'life'); break;
      case 'friendly-aid': describe('接受友方援助', 'life'); break;
      case 'recover-zero-hp': describe('开始零 HP 休养', 'life', `恢复至 ${intent.restoredHp} HP；记录昏迷 ${intent.comaTurns} turn（非战斗 round）。`); point(intent.restStartMinute); break;
      case 'restart-zero-hp-rest': describe('重新开始零 HP 休养', 'life'); point(intent.startMinute); break;
      case 'complete-zero-hp-rest': describe('完成零 HP 休养审核', 'life', '记录已检查至此分钟；不将检查时间推定为实际结束日期。'); point(intent.completedThroughMinute); break;
      case 'resolve-heal-convalescence': describe('Heal 效果解除休养', 'life', '已记录实际 Heal 效果与生效时间。'); point(intent.effectiveMinute); break;
      case 'record-defense': describe('确认实际穿戴', 'inventory', '已记录实际防护选择。'); break;
      case 'cast-prepared': describe('消耗法术准备副本', 'spells', '实际消耗一份准备；效果另行结算。'); if (intent.atMinute !== undefined) point(intent.atMinute); break;
      case 'prepare-spells': {
        const facts = intent.facts;
        describe('完成法术学习／祈祷', 'spells', `完整休息 ${facts.restEndMinute - facts.restStartMinute} 分钟。`, `学习／祈祷 ${facts.studyEndMinute - facts.studyStartMinute} 分钟。`, `本次准备 ${facts.choices.reduce((count, choice) => count + choice.quantity, 0)} 份；旧有未消耗准备保留。`);
        interval(facts.restStartMinute, facts.studyEndMinute);
        if (calendar) entry.details.push(`休息：${formatCampaignMinute(facts.restStartMinute, calendar.minutesPerDay)} → ${formatCampaignMinute(facts.restEndMinute, calendar.minutesPerDay)}。`, `学习／祈祷：${formatCampaignMinute(facts.studyStartMinute, calendar.minutesPerDay)} → ${formatCampaignMinute(facts.studyEndMinute, calendar.minutesPerDay)}。`);
        break;
      }
      // Unmapped supported or future parsed intents remain generic. In particular,
      // never echo type, reason, actor, source IDs, free text, or module payloads.
      default: break;
    }
    return entry;
  });
  return { name: creation.name, level: latest?.level ?? 1, revision: archive.runtime.transaction.revision, calendar: latest?.calendar ? { minutesPerDay: latest.calendar.minutesPerDay, daysPerWeek: latest.calendar.daysPerWeek } : null, entries };
}

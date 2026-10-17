import {activityLabels,type JournalActivityAction} from '../actions/journal-actions';
import {gameTimeFields,readGameMinute} from './campaign-spell-panel';

export function journalActivityFields(minutesPerDay:number):string{
  return `<p>只登记已经发生的活动占用。不会因此恢复HP、完成训练、学会语言、获得法术或制造物品，也不自动结算费用。</p><label>实际活动类型<select name="activityKind">${Object.entries(activityLabels).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label>${gameTimeFields('activityStart',minutesPerDay,'实际开始')}${gameTimeFields('activityEnd',minutesPerDay,'实际结束（不含此刻）')}<label>实际地点／行程<input name="activityLocation" maxlength="300" required/></label><label class="check-row"><input name="actualIntervalConfirmed" type="checkbox" required/>以上活动确实已经发生，收益另行处理；这里仅保存本地记录</label><p>若与已记录活动冲突，本操作不会擅自批准兼容或例外；请先处理实际战役安排。</p>`;
}
export function readJournalActivity(form:HTMLFormElement,minutesPerDay:number):JournalActivityAction{
  const data=new FormData(form);if(data.get('actualIntervalConfirmed')!=='on')throw new Error('请先确认这些是已经实际发生的活动。');
  return {type:'character.recordActivity',kind:String(data.get('activityKind')) as JournalActivityAction['kind'],startMinute:readGameMinute(data,'activityStart',minutesPerDay),endMinuteExclusive:readGameMinute(data,'activityEnd',minutesPerDay),location:String(data.get('activityLocation')),actualIntervalConfirmed:true};
}

/** Campaign offsets are not Gregorian dates or the computer's current clock. */
export function formatCampaignMinute(minute:number,minutesPerDay:number):string{
  if(!Number.isSafeInteger(minute)||minute<0||!Number.isSafeInteger(minutesPerDay)||minutesPerDay<1)return'战役时间待核';
  const day=Math.floor(minute/minutesPerDay)+1,within=minute%minutesPerDay;
  return minutesPerDay===1440?`第${day}天 ${String(Math.floor(within/60)).padStart(2,'0')}:${String(within%60).padStart(2,'0')}`:`第${day}天 第${within}分钟`;
}

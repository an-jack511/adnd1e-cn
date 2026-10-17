import { type PurchaseLine } from '../engine/core-inventory';
import { coreEquipmentById, coreEquipmentCatalog } from '../rules/core-inventory';
import { recordCreationTask, type CoreCreation } from '../workflows/core-create';
import { equipmentLabel, equipmentUnitLabel } from './character-labels';

export function renderStartingEquipment(host:HTMLElement,read:()=>CoreCreation|null,write:(value:CoreCreation)=>void){
  host.replaceChildren();
  const title=document.createElement('h2');title.textContent='初始装备与采购';host.append(title);
  const description=document.createElement('p');description.textContent='PHB pp.35–37 为参考价。先记录准备购买的物品、实际价格和找零；尚未确定的供应、重量与携带方式会保留为待补充。';host.append(description);
  const rows=document.createElement('div'),status=document.createElement('p');status.setAttribute('role','status');
  function field(labelText:string,input:HTMLElement){const label=document.createElement('label');label.textContent=labelText;label.append(input);return label;}
  function numeric(value:string){const input=document.createElement('input');input.type='number';input.min='0';input.step='1';input.value=value;return input;}
  const tender=numeric('0'),change=numeric('0');
  const add=document.createElement('button');add.type='button';add.textContent='添加采购项';
  const pending:{definition:HTMLSelectElement;quantity:HTMLInputElement;price:HTMLInputElement}[]=[];
  function addLine(){const row=document.createElement('fieldset'),definition=document.createElement('select');definition.append(new Option('选择 PHB 物品',''),...coreEquipmentCatalog.map(item=>new Option(`${equipmentLabel(item.printedName,item.id)} · ${item.listPriceCp} cp / ${equipmentUnitLabel(item.purchaseUnit)}`,item.id)));const quantity=numeric('1'),price=numeric('0');definition.addEventListener('change',()=>{price.value=String(coreEquipmentById[definition.value]?.listPriceCp??0);});const remove=document.createElement('button');remove.type='button';remove.textContent='移除此项';const item={definition,quantity,price};pending.push(item);remove.addEventListener('click',()=>{pending.splice(pending.indexOf(item),1);row.remove();});row.append(field('物品 ',definition),field('购买单位数 ',quantity),field('实际每单位价格 cp ',price),remove);rows.append(row);}
  add.addEventListener('click',addLine);
  const record=document.createElement('button');record.type='button';record.textContent='检查并记录采购';
  host.append(rows,add,field('交付金币 gp ',tender),field('收到找零 cp ',change),record,status);
  record.addEventListener('click',()=>{try{
    const document=read();if(!document)throw new Error('请先完成核心资格检查。');
    const money=document.tasks.find(task=>task.id==='money');const gp=money?.facts?.gp;
    if(money?.status!=='complete'||typeof gp!=='number'||!Number.isSafeInteger(gp))throw new Error('请先记录可用的起始金钱。');
    const eventId=crypto.randomUUID();
    const lines:PurchaseLine[]=pending.map((item,index)=>({instanceId:`${eventId}:${index}`,definitionId:item.definition.value,quantity:Number(item.quantity.value),destinationLocationId:'character',agreedUnitPriceCp:Number(item.price.value),availability:{status:'unresolved',decisionId:null},bulk:'unknown',bulkRulingId:null}));
    if(!lines.length)throw new Error('请先添加至少一项物品。');
    const actualCostCp=lines.reduce((sum,line)=>sum+line.agreedUnitPriceCp*line.quantity,0),tenderCp=Number(tender.value)*100,changeCp=Number(change.value);
    if(tenderCp-changeCp!==actualCostCp)throw new Error('付款减找零必须等于采购计划总额。');
    write(recordCreationTask(document,'equipment',{status:'needs-dm',sourceIds:['phb:35:money-equipment','phb:36:equipment-armor','phb:37:weapon-weight'],note:'采购计划已记录；尚未确定的库存与携带事实保留在档案中。',facts:{purchasePlan:{lines,tenderGp:Number(tender.value),changeCp,actualCostCp},startingMoneyRevision:document.revision}}));
    status.textContent=`已记录 ${lines.length} 项采购计划，计划金额 ${actualCostCp} cp；尚未写入实际库存。`;
  }catch(error){status.textContent=(error as Error).message;}});
}

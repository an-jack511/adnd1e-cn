import { commitCorePurchase, emptyCoins, type CoreInventoryLedger, type PurchaseLine } from '../engine/core-inventory';
import { coreEquipmentById, coreEquipmentCatalog } from '../rules/core-inventory';
import { recordCreationTask, type CoreCreation } from '../workflows/core-create';

export function renderStartingEquipment(host:HTMLElement,read:()=>CoreCreation|null,write:(value:CoreCreation)=>void){
  host.replaceChildren();
  const title=document.createElement('h2');title.textContent='初始装备与采购';host.append(title);
  const description=document.createElement('p');description.textContent='PHB pp.35–37 为参考价。请记录 DM 对供应与实际单价的确认；购买记录保留物品实例、找零和余额。职业许可、未知重量与体积仍需审核。';host.append(description);
  const rows=document.createElement('div'),status=document.createElement('p');status.setAttribute('role','status');
  function field(labelText:string,input:HTMLElement){const label=document.createElement('label');label.textContent=labelText;label.append(input);return label;}
  function numeric(value:string){const input=document.createElement('input');input.type='number';input.min='0';input.step='1';input.value=value;return input;}
  const decision=document.createElement('input');decision.placeholder='DM 身份／裁定记录 ID';
  const tender=numeric('0'),change=numeric('0');
  const add=document.createElement('button');add.type='button';add.textContent='添加采购项';
  const pending:{definition:HTMLSelectElement;quantity:HTMLInputElement;price:HTMLInputElement}[]=[];
  function addLine(){const row=document.createElement('fieldset'),definition=document.createElement('select');definition.append(new Option('选择 PHB 物品',''),...coreEquipmentCatalog.map(item=>new Option(`${item.printedName} · ${item.listPriceCp} cp / ${item.purchaseUnit}`,item.id)));const quantity=numeric('1'),price=numeric('0');definition.addEventListener('change',()=>{price.value=String(coreEquipmentById[definition.value]?.listPriceCp??0);});const remove=document.createElement('button');remove.type='button';remove.textContent='移除此项';const item={definition,quantity,price};pending.push(item);remove.addEventListener('click',()=>{pending.splice(pending.indexOf(item),1);row.remove();});row.append(field('物品 ',definition),field('购买单位数 ',quantity),field('实际每单位价格 cp ',price),remove);rows.append(row);}
  add.addEventListener('click',addLine);
  const record=document.createElement('button');record.type='button';record.textContent='检查并记录采购';
  host.append(rows,add,field('DM 供应与价格确认 ',decision),field('交付金币 gp ',tender),field('收到找零 cp ',change),record,status);
  record.addEventListener('click',()=>{try{
    const document=read();if(!document)throw new Error('请先完成核心资格检查。');
    const money=document.tasks.find(task=>task.id==='money');const gp=money?.facts?.gp;
    if(money?.status!=='complete'||typeof gp!=='number'||!Number.isSafeInteger(gp))throw new Error('请先记录可用的起始金钱。');
    if(!decision.value.trim())throw new Error('请填写供应与实际价格的 DM 确认记录。');
    const coins={...emptyCoins(),gp};
    const ledger:CoreInventoryLedger={revision:0,locations:[{id:'character',kind:'character',label:document.name,parentLocationId:null}],items:[],wallets:[{id:'starting-purse',label:'起始钱袋',locationId:'character',coins}]};
    const eventId=crypto.randomUUID();
    const lines:PurchaseLine[]=pending.map((item,index)=>({instanceId:`${eventId}:${index}`,definitionId:item.definition.value,quantity:Number(item.quantity.value),destinationLocationId:'character',agreedUnitPriceCp:Number(item.price.value),availability:{status:'dm-approved',decisionId:decision.value.trim()},bulk:'unknown',bulkRulingId:null}));
    const purchase=commitCorePurchase({ledger,eventId,expectedRevision:0,walletId:'starting-purse',lines,tender:{...emptyCoins(),gp:Number(tender.value)},change:{...emptyCoins(),cp:Number(change.value)}});
    write(recordCreationTask(document,'equipment',{status:'needs-dm',sourceIds:['phb:35:money-equipment','phb:36:equipment-armor','phb:37:weapon-weight'],note:'采购与余额已核算；待确认职业使用许可、携带方式、重量与体积。',facts:{ledger:purchase.next,receipt:purchase.receipt,startingMoneyRevision:document.revision,dmDecisionId:decision.value.trim()}}));
    status.textContent=`已记录 ${lines.length} 项采购，实际花费 ${purchase.receipt.actualCostCp} cp。仍需 DM 审核使用与携带条件。`;
  }catch(error){status.textContent=(error as Error).message;}});
}

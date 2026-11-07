import type {Spell} from '../schemas';
import {bilingualSpellSchool} from './spell-schools';

export const escapeRuleHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

/** The same field order and markup used in the PHB spell chapters. */
export function spellRuleHeader(spell:Spell):string{
 const fields=[['等级 Level',String(spell.level)],['距离 Range',spell.range],['持续时间 Duration',spell.duration],['影响范围 Area of Effect',spell.areaOfEffect],['成分 Components',spell.components.join('、')||'原刊未列'],['施法时间 Casting Time',spell.castingTime],['豁免检定 Saving Throw',spell.savingThrow]];
 const school=bilingualSpellSchool(spell.school);
 return '<h3 class="spell-heading"><em>'+escapeRuleHtml(spell.nameZh+' '+spell.nameEn)+'</em>（'+escapeRuleHtml(school)+(spell.reversible?'，可逆 Reversible':'')+'）</h3>'+'<div class="spell-meta">'+fields.map(([label,value])=>'<strong>'+label+'：</strong>'+escapeRuleHtml(value)).join('<br>\n')+'</div>'+(spell.materialComponent?'<p><strong>材料成分：</strong>'+escapeRuleHtml(spell.materialComponent)+'</p>':'');
}

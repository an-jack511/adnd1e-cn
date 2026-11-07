import {nameAliases} from '../utils/terminology';
import type { APIRoute } from 'astro';
import { spells } from '../data/public/spells';
import { monsters } from '../data/public/monsters';
import { items } from '../data/public/items';
import { classes } from '../data/public/classes';
import { races } from '../data/public/races';
import { rules } from '../data/public/rules';
import { playPages } from '../data/public/play';
import {quickLinks,quickChecks,timingTerms,termLabels} from '../data/public/combat-guide';
import published from '../data/published/topics';
import bookSearch from '../data/published/book-search.json';

export const GET: APIRoute = () => {
  const index = [
    {type:'游戏中',href:'/play/',nameZh:'桌边速查与快速检查单',nameEn:'',description:quickChecks.join(' '),tags:['游戏中','检查单'],source:['PHB','DMG'],aliases:[]},
    ...[{name:'角色攻击矩阵',id:'attack-matrices'},{name:'角色五类豁免表',id:'saving-throws'},{name:'时间、AC 与重要概念',id:'concepts'}].map(entry=>({type:'游戏中',href:`/play/#${entry.id}`,nameZh:entry.name,nameEn:'',description:'桌边常用表格与原书出处。',tags:['速查','表格'],source:['PHB','DMG'],aliases:[]})),
    ...quickLinks.map(group=>({type:'游戏中',href:'/play/#common',nameZh:group.title,nameEn:'',description:group.links.map(([name])=>name).join(' '),tags:['桌边速查'],source:['PHB','DMG'],aliases:[]})),
    ...Object.entries(timingTerms).map(([id,description])=>({type:'战斗',href:`/play/combat/#term-${id}`,nameZh:termLabels[id],nameEn:'',description,tags:['行动先后','先攻','A.D.D.I.C.T.'],source:['A.D.D.I.C.T. 2.2'],aliases:[]})),
    ...playPages.flatMap((page) => [
      { type: '游戏中', href: `/play/${page.slug}/`, nameZh: page.title, nameEn: '', description: page.intro, tags: page.sequence, source: [...new Set(page.sections.flatMap((section) => section.sources.map((source) => source.label.split('：')[0])))], aliases: [] },
      ...page.sections.map((section) => ({ type: '游戏中', href: `/play/${page.slug}/#${section.id}`, nameZh: section.title, nameEn: '', description: section.points.join(' '), tags: [page.title], source: section.sources.map((source) => source.label.split('：')[0]), aliases: [] }))
    ]),
    ...spells.map((entry) => ({ type: '法术', href: `/spells/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.description, searchText: (entry.details??[]).map(detail=>detail.html.replace(/<[^>]+>/g,' ')).join(' '), tags: [...entry.tags, ...entry.classes, `${entry.level}环`, entry.components.join(''), entry.castingTime, entry.range, entry.duration, entry.areaOfEffect, entry.savingThrow, entry.materialComponent ?? '', entry.reversible ? '可逆' : ''], source: entry.source.map((source) => source.book), aliases: nameAliases('spell',entry.nameEn) })),
    ...monsters.map((entry) => ({ type: '怪物', href: `/monsters/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.description, searchText: (entry.details??[]).map(detail=>detail.html.replace(/<[^>]+>/g,' ')).join(' '), tags: [entry.environment, entry.alignment, entry.size, entry.hitDice, entry.attacks, entry.damage, entry.specialAttacks, entry.specialDefenses, entry.magicResistance, entry.psionics, entry.treasureType], source: entry.source.map((source) => source.book), aliases: nameAliases('monster',entry.nameEn) })),
    ...items.filter(entry=>!entry.catalogHidden).map((entry) => ({ type: '装备', href: `/equipment/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.description, searchText: (entry.details??[]).map(detail=>detail.html.replace(/<[^>]+>/g,' ')).join(' '), tags: [...entry.tags, entry.category, entry.price, entry.weight, entry.damageSmallMedium ?? '', entry.damageLarge ?? '', entry.speedFactor ?? '', ...(entry.weaponCombat?.handHeld?.armorClassAdjustments ?? []), ...(entry.weaponCombat?.missile?.armorClassAdjustments ?? [])], source: entry.source.map((source) => source.book), aliases: nameAliases('item',entry.nameEn) })),
    ...classes.map((entry) => ({ type: '职业', href: `/classes/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.description, searchText: (entry.details??[]).map(detail=>detail.html.replace(/<[^>]+>/g,' ')).join(' '), tags: [entry.primeRequisite], source: entry.source.map((source) => source.book), aliases: [...nameAliases('class',entry.nameEn),...(entry.id === 'ranger' ? ['巡林客'] : [])] })),
    ...races.map((entry) => ({ type: '种族', href: `/races/${entry.id}`, nameZh: entry.nameZh, nameEn: entry.nameEn, description: entry.abilities.join('；'), tags: [entry.movement], source: entry.source.map((source) => source.book), aliases: nameAliases('race',entry.nameEn) })),
    ...rules.filter((entry) => !entry.title.includes('预留')).map((entry) => ({ type: '规则', href: `/${entry.category === 'combat' ? 'combat' : entry.category === 'adventure' ? 'adventure' : 'rules'}/${entry.id}`, nameZh: entry.title, nameEn: '', description: entry.summary, tags: [entry.category], source: entry.source.map((source) => source.book), aliases: [] })),
    ...published.map((entry) => ({ type: '规则书', href: `/books/${entry.book}/${entry.slug}/`, nameZh: entry.title, nameEn: entry.titleEn, description: entry.excerpt, searchText: bookSearch.find((searchEntry) => searchEntry.book === entry.book && searchEntry.slug === entry.slug)?.text ?? '', tags: [entry.group], source: [entry.book.toUpperCase()], aliases: [] }))
  ];
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};

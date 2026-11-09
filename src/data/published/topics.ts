import raw from './books.json';
import {translateRuleHeading} from '../../utils/rule-text';
const continuationTitles:Record<string,string>={
 'appendix-j-herbs-spices-medicinal-vegetables-2':'附录 J：药草、香料与药用植物',
 'glossary-2':'术语表',
};
/** Keep source slugs and English titles intact while providing Chinese reader labels. */
const cleanContinuationTitle=(title:string)=>title
  .replace(/\s*\((?:continued(?:\s+(?:ii|iii))?)\)/gi,'')
  .replace(/\s+continued(?:\s+(?:ii|iii))?(?=(?:,|$))/gi,'')
  .replace(/[（(](?:续|续完|再续)[）)]/g,'')
  .replace(/续文|续完|再续/g,'');
export default raw.map(topic=>({...topic,title:cleanContinuationTitle(continuationTitles[topic.slug]??(!/[\u3400-\u9fff]/.test(topic.title)?translateRuleHeading(topic.title).split(' · ')[0]:topic.title))}));

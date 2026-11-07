import raw from './books.json';
import {translateRuleHeading} from '../../utils/rule-text';
const continuationTitles:Record<string,string>={
 'appendix-j-herbs-spices-medicinal-vegetables-2':'附录 J：药草、香料与药用植物（续）',
 'glossary-2':'术语表（续）',
};
/** Keep source slugs and English titles intact while providing Chinese reader labels. */
export default raw.map(topic=>({...topic,title:continuationTitles[topic.slug]??(!/[\u3400-\u9fff]/.test(topic.title)?translateRuleHeading(topic.title).split(' · ')[0]:topic.title)}));

import data from './spell-index.json';
import type {Spell} from '../../schemas';
export const spells=data as Omit<Spell,'details'|'description'>[];

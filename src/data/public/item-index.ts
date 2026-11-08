import data from './item-index.json';
import type {Item} from '../../schemas';
import {inheritMagicWeights} from '../../utils/item-weight';
export const itemIndex=inheritMagicWeights(data as Item[]);
